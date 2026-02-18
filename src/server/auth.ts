/**
 * JIG Craft Cannabis - OTP Authentication Service
 *
 * Passwordless auth via 6-digit OTP sent to client email.
 * Uses SMTP (mail.cleva-ai.co.za:465) with JWT session tokens.
 */

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { OTP_CONFIG } from '../world-model/types';
import * as db from './db';

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'jig-dev-secret-change-in-production';
const JWT_EXPIRY = '7d';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.cleva-ai.co.za',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'otp@cleva-ai.co.za',
    pass: process.env.SMTP_PASS || '',
  },
});

// ─────────────────────────────────────────────────────────────
// OTP GENERATION & DELIVERY
// ─────────────────────────────────────────────────────────────

/** Generate a cryptographically random 6-digit OTP. */
function generateOtp(): string {
  const num = crypto.randomInt(0, 1_000_000);
  return String(num).padStart(OTP_CONFIG.CODE_LENGTH, '0');
}

/** Hash a token for database storage (never store raw tokens). */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Request an OTP for a given email address.
 * Returns the OTP ID (for tracking, not the code itself).
 */
export async function requestOtp(
  email: string,
  purpose: 'login' | 'register' | 'reset' = 'login',
): Promise<{ otpId: string; expiresAt: Date }> {
  const isDev = process.env.NODE_ENV === 'development';
  const otpCode = isDev ? '000000' : generateOtp();
  const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60_000);

  const otpId = await db.createOtp(email, otpCode, purpose, expiresAt);

  if (isDev) {
    console.log(`[DEV] OTP for ${email}: ${otpCode} (bypass enabled)`);
  } else {
    try {
      console.log(`[OTP] Sending OTP to ${email}...`);
      const smtpFrom = process.env.SMTP_USER || 'otp@cleva-ai.co.za';
      const info = await transporter.sendMail({
        from: `"JIG Craft Cannabis" <${smtpFrom}>`,
        to: email,
        replyTo: smtpFrom,
        subject: `Your JIG Verification Code`,
        headers: {
          'X-Priority': '1',
          'X-Mailer': 'JIG Craft Cannabis',
        },
        text: [
          `Your JIG verification code is: ${otpCode}`,
          '',
          `This code expires in ${OTP_CONFIG.EXPIRY_MINUTES} minutes.`,
          `If you didn't request this, please ignore this email.`,
          '',
          '- JIG Craft Cannabis',
        ].join('\n'),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a5c2e; margin-bottom: 8px;">JIG Craft Cannabis</h2>
            <p style="color: #555; margin-bottom: 24px;">Your verification code:</p>
            <div style="background: #f4f4f4; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a5c2e;">${otpCode}</span>
            </div>
            <p style="color: #888; font-size: 13px;">
              This code expires in ${OTP_CONFIG.EXPIRY_MINUTES} minutes.<br>
              If you didn't request this, please ignore this email.
            </p>
          </div>
        `,
      });
      console.log(`[OTP] Sent to ${email} | msgId=${info.messageId} | response=${info.response}`);
    } catch (err) {
      console.error(`[OTP] FAILED to send to ${email}:`, (err as Error).message);
      throw new Error('Failed to send verification email. Please try again.');
    }
  }

  return { otpId, expiresAt };
}

// ─────────────────────────────────────────────────────────────
// OTP VERIFICATION & SESSION CREATION
// ─────────────────────────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  token?: string;
  clientId?: string;
  expiresAt?: number;
  error?: string;
}

/**
 * Verify an OTP and, if valid, create a JWT session.
 */
export async function verifyOtpAndCreateSession(
  email: string,
  otpCode: string,
  userAgent?: string,
  ipAddress?: string,
): Promise<AuthResult> {
  // Check OTP
  const result = await db.verifyOtp(email, otpCode);

  if (!result.valid) {
    await db.incrementOtpAttempts(email);
    return { success: false, error: 'Invalid or expired code' };
  }

  // Resolve client
  const client = await db.getClientByEmail(email);
  if (!client) {
    return { success: false, error: 'No account found for this email' };
  }

  if (client.status === 'suspended') {
    return { success: false, error: 'Account suspended. Contact support.' };
  }

  // Create JWT
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const token = jwt.sign(
    { clientId: client.id, email: client.email, tier: client.tier },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  );

  // Store session (hash the token, never store raw)
  const tokenHash = hashToken(token);
  await db.createSession(client.id, tokenHash, expiresAt, userAgent, ipAddress);

  // Touch client activity
  await db.touchClientActivity(client.id);

  return {
    success: true,
    token,
    clientId: client.id,
    expiresAt: expiresAt.getTime(),
  };
}

// ─────────────────────────────────────────────────────────────
// TOKEN VALIDATION
// ─────────────────────────────────────────────────────────────

export interface TokenPayload {
  clientId: string;
  email: string;
  tier: string;
}

/**
 * Validate a JWT and check that the session is still active in the DB.
 */
export async function validateToken(
  token: string,
): Promise<{ valid: boolean; payload?: TokenPayload; error?: string }> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    // Verify session is still active in DB
    const tokenHash = hashToken(token);
    const session = await db.getSessionByToken(tokenHash);
    if (!session) {
      return { valid: false, error: 'Session expired or revoked' };
    }

    // Touch session last_used_at
    await db.touchSession(tokenHash);

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Invalid token' };
  }
}

// ─────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────

/**
 * Revoke a session by deactivating it in the database.
 */
export async function logout(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db.deactivateSession(tokenHash);
}
