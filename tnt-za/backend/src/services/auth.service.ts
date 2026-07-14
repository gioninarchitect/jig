import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { sendPinEmail } from './email.service';
import { eventBus } from './eventBus';
import * as flocore from './flocore.service';
import { resolveLoginAlias } from '../config/loginAliases';

// Look a user up by e-mail, falling back to the alias map ONLY when the exact address has no
// account (see config/loginAliases.ts). Exact match always wins, so an alias can never shadow
// a real account — it can only rescue a login that would otherwise have failed outright.
async function findUserByLoginEmail(normalizedEmail: string) {
  const exact = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (exact) return exact;
  const alias = resolveLoginAlias(normalizedEmail);
  if (!alias) return null;
  const aliased = await prisma.user.findUnique({ where: { email: alias } });
  if (aliased) console.log(`[Auth] alias: ${normalizedEmail} -> ${alias}`);
  return aliased;
}

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const OPEN_LOGIN_ROLES = new Set(['SUPER_ADMIN', 'FACILITY_MANAGER']);

export async function requestPin(email: string, ip?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByLoginEmail(normalizedEmail);
  if (!user) throw Object.assign(new Error('No account found with this email'), { status: 404 });
  if (!user.active) throw Object.assign(new Error('Account is disabled'), { status: 403 });
  if (user.lockedAt && Date.now() - user.lockedAt.getTime() < 3600_000) {
    throw Object.assign(new Error('Account locked. Try again in 1 hour.'), { status: 429 });
  }

  const openLoginRole = OPEN_LOGIN_ROLES.has(user.role);

  // Debounce duplicate sends: if a still-valid PIN session was created in the last 60s,
  // reuse it instead of generating+emailing a new PIN. The first email's PIN is still valid.
  // PINs are bcrypt-hashed so we cannot re-email the same plaintext — we suppress the SEND.
  // Checked BEFORE the openLoginRole cleanup so the recent session is still present.
  const existing = await prisma.session.findFirst({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(Date.now() - 60_000) },
      expiresAt: { gt: new Date() },
      token: { startsWith: '$2' }, // unverified PIN hash (not yet a JWT)
    },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) {
    console.log(`[Auth] Debounced duplicate PIN request for ${email} — reusing session ${existing.id} (created ${Math.round((Date.now() - existing.createdAt.getTime()) / 1000)}s ago), no new email sent`);
    return { sessionId: existing.id, expiresAt: existing.expiresAt };
  }

  if (openLoginRole) {
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
        token: { startsWith: '$2' },
      },
    });
  }

  // Rate limit: max 3 requests per 15 min, opened wider for UAT super admins and FMs.
  const recent = await prisma.session.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } },
  });
  const maxRecent = openLoginRole ? 10 : 3;
  if (recent >= maxRecent) throw Object.assign(new Error('Too many PIN requests. Wait 15 minutes.'), { status: 429 });

  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 10);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: pinHash,
      ipAddress: ip || null,
      expiresAt: new Date(Date.now() + 5 * 60_000), // 5 min
    },
  });

  // Send email. PIN logging is disabled in production unless explicitly enabled.
  try {
    await sendPinEmail(normalizedEmail, pin, { allowWhenDisabled: openLoginRole });
  } catch (e) {
    console.error('[Auth] Email send failed:', e);
  }
  if (env.LOG_AUTH_PINS || env.NODE_ENV !== 'production') {
    console.log(`[Auth] PIN for ${email}: ${pin}`);
  }

  eventBus.emit('LOGIN_PIN_REQUESTED', { userId: user.id, tenantId: user.tenantId, entityType: 'User', entityId: user.id });

  return { sessionId: session.id, expiresAt: session.expiresAt };
}

export async function verifyPin(email: string, pin: string, ip?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPin = pin.trim();
  const user = await findUserByLoginEmail(normalizedEmail);
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  // Deactivated accounts cannot authenticate — blocks the open-login / stored-PIN path too.
  // (Only affects users with active=false; active super-admins are unaffected.)
  if (!user.active) throw Object.assign(new Error('Account is disabled'), { status: 403 });

  if (user.lockedAt && Date.now() - user.lockedAt.getTime() < 3600_000) {
    throw Object.assign(new Error('Account locked'), { status: 429 });
  }

  // Find valid session
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // If no active session, optionally fallback to stored PIN for UAT/dev only.
  if (sessions.length === 0) {
    if (user.pinHash) {
      if (!env.ALLOW_STORED_PIN_LOGIN && env.NODE_ENV === 'production' && !OPEN_LOGIN_ROLES.has(user.role)) {
        throw Object.assign(new Error('No active PIN request. Request a new PIN.'), { status: 401 });
      }
      const storedValid = await bcrypt.compare(normalizedPin, user.pinHash);
      if (storedValid) {
        // Create a session for the JWT
        const token = jwt.sign({ userId: user.id, tenantId: user.tenantId, role: user.role, facilityId: user.facilityId }, env.JWT_SECRET, { expiresIn: '24h' });
        await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedAt: null } });
        eventBus.emit('USER_LOGGED_IN', { userId: user.id, tenantId: user.tenantId, entityType: 'User', entityId: user.id });
        return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId, facilityId: user.facilityId } };
      }
    }
    throw Object.assign(new Error('No active PIN request. Request a new PIN.'), { status: 401 });
  }

  let session = null as typeof sessions[number] | null;
  for (const candidate of sessions) {
    const valid = await bcrypt.compare(normalizedPin, candidate.token!);
    if (valid) {
      session = candidate;
      break;
    }
  }

  if (!session) {
    // Stored-PIN fallback even when an OTP session exists (UAT/permanent PIN).
    // The login UI calls request-pin first (creating a session), so the permanent
    // PIN must still verify here, not only when sessions.length === 0.
    if (user.pinHash && (env.ALLOW_STORED_PIN_LOGIN || OPEN_LOGIN_ROLES.has(user.role))) {
      const storedValid2 = await bcrypt.compare(normalizedPin, user.pinHash);
      if (storedValid2) {
        const token2 = jwt.sign(
          { userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId, facilityId: user.facilityId },
          env.JWT_SECRET, { expiresIn: '24h' });
        await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedAt: null } });
        try { await prisma.session.update({ where: { id: sessions[0].id }, data: { token: token2 } }); } catch { /* ignore */ }
        eventBus.emit('LOGIN_SUCCESS', { userId: user.id, tenantId: user.tenantId, entityType: 'User', entityId: user.id, ip });
        return { token: token2, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, facilityId: user.facilityId } };
      }
    }
    const attempts = user.failedAttempts + 1;
    const update: any = { failedAttempts: attempts };
    if (attempts >= 5) {
      update.lockedAt = new Date();
      eventBus.emit('ACCOUNT_LOCKED', { userId: user.id, tenantId: user.tenantId, entityType: 'User', entityId: user.id });
    }
    await prisma.user.update({ where: { id: user.id }, data: update });
    eventBus.emit('LOGIN_FAILED', { userId: user.id, tenantId: user.tenantId, entityType: 'User', entityId: user.id });
    throw Object.assign(new Error('Invalid PIN'), { status: 401 });
  }

  // Success — reset attempts, generate JWT
  await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedAt: null } });

  const payload = { userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId, facilityId: user.facilityId };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' } as jwt.SignOptions);

  // Update session with JWT
  await prisma.session.update({ where: { id: session.id }, data: { token } });
  await prisma.session.deleteMany({
    where: {
      userId: user.id,
      id: { not: session.id },
      expiresAt: { gt: new Date() },
    },
  });

  eventBus.emit('LOGIN_SUCCESS', { userId: user.id, tenantId: user.tenantId, entityType: 'User', entityId: user.id, ip });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      facilityId: user.facilityId,
    },
  };
}

// =====================================================================
// FLOCORE SSO (W30) — FLOCORE issues + verifies the email OTP; we mint the
// LOCAL JWT from the matched local user. The local PIN path above is untouched
// and remains the fallback, so a FLOCORE outage or an un-provisioned FLOCORE
// identity can never lock a real user out. Gated behind FLOCORE_SSO_ENABLED.
// =====================================================================

export async function requestFlocoreOtp(email: string) {
  if (!env.FLOCORE_SSO_ENABLED) throw Object.assign(new Error('SSO login not enabled'), { status: 404 });
  const normalizedEmail = email.trim().toLowerCase();
  // Only provisioned ILCO staff get a code — we gate at our backend (FO's allowlist
  // does not currently scope the ilco tenant), which also blocks email enumeration abuse.
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw Object.assign(new Error('No account found with this email'), { status: 404 });
  if (!user.active) throw Object.assign(new Error('Account is disabled'), { status: 403 });

  const result = await flocore.otpRequest(normalizedEmail);
  eventBus.emit('LOGIN_OTP_REQUESTED', { userId: user.id, tenantId: user.tenantId, entityType: 'User', entityId: user.id });
  return { delivery: result.delivery, expiresInSeconds: result.expiresInSeconds };
}

export async function verifyFlocoreOtp(email: string, code: string, ip?: string) {
  if (!env.FLOCORE_SSO_ENABLED) throw Object.assign(new Error('SSO login not enabled'), { status: 404 });
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  if (!user.active) throw Object.assign(new Error('Account is disabled'), { status: 403 });
  if (user.lockedAt && Date.now() - user.lockedAt.getTime() < 3600_000) {
    throw Object.assign(new Error('Account locked'), { status: 429 });
  }

  // FLOCORE proves the email owns the code. We do NOT trust FO's roles — the local
  // user row is authoritative for role/tenant/facility (chain-of-custody stays local).
  const fo = await flocore.otpVerify(normalizedEmail, code.trim());
  if (!fo.ok) {
    if (fo.status === 401) {
      const attempts = user.failedAttempts + 1;
      const update: any = { failedAttempts: attempts };
      if (attempts >= 5) { update.lockedAt = new Date(); }
      await prisma.user.update({ where: { id: user.id }, data: update });
      eventBus.emit('LOGIN_FAILED', { userId: user.id, tenantId: user.tenantId, entityType: 'User', entityId: user.id });
      throw Object.assign(new Error('Invalid or expired code'), { status: 401 });
    }
    // FO unreachable/misconfigured — surface as 503 so the UI can steer to the PIN fallback.
    throw Object.assign(new Error(fo.error || 'SSO temporarily unavailable — use your PIN'), { status: 503 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedAt: null } });
  const payload = { userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId, facilityId: user.facilityId };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' } as jwt.SignOptions);
  await prisma.session.create({
    data: { userId: user.id, token, ipAddress: ip || null, expiresAt: new Date(Date.now() + 24 * 3600_000) },
  });
  eventBus.emit('LOGIN_SUCCESS', { userId: user.id, tenantId: user.tenantId, entityType: 'User', entityId: user.id, ip, via: 'flocore-sso' });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, facilityId: user.facilityId },
  };
}

export async function logout(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
  eventBus.emit('LOGOUT', { userId, tenantId: user?.tenantId, entityType: 'User', entityId: userId });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, tenantId: true, facilityId: true },
  });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return user;
}
