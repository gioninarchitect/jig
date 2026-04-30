import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { sendPinEmail } from './email.service';
import { eventBus } from './eventBus';

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestPin(email: string, ip?: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Object.assign(new Error('No account found with this email'), { status: 404 });
  if (!user.active) throw Object.assign(new Error('Account is disabled'), { status: 403 });
  if (user.lockedAt && Date.now() - user.lockedAt.getTime() < 3600_000) {
    throw Object.assign(new Error('Account locked. Try again in 1 hour.'), { status: 429 });
  }

  // Rate limit: max 3 requests per 15 min
  const recent = await prisma.session.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } },
  });
  if (recent >= 3) throw Object.assign(new Error('Too many PIN requests. Wait 15 minutes.'), { status: 429 });

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

  // Send email + log to console as fallback
  try {
    await sendPinEmail(email, pin);
  } catch (e) {
    console.error('[Auth] Email send failed:', e);
  }
  console.log(`[Auth] PIN for ${email}: ${pin}`);

  eventBus.emit('LOGIN_PIN_REQUESTED', { userId: user.id, tenantId: user.tenantId, entityType: 'User', entityId: user.id });

  return { sessionId: session.id, expiresAt: session.expiresAt };
}

export async function verifyPin(email: string, pin: string, ip?: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  if (user.lockedAt && Date.now() - user.lockedAt.getTime() < 3600_000) {
    throw Object.assign(new Error('Account locked'), { status: 429 });
  }

  // Find valid session
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  // If no active session, fallback to stored PIN (UAT/dev convenience)
  if (sessions.length === 0) {
    if (user.pinHash) {
      const storedValid = await bcrypt.compare(pin, user.pinHash);
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

  const session = sessions[0];
  const valid = await bcrypt.compare(pin, session.token!);

  if (!valid) {
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
