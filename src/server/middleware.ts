/**
 * JIG Craft Cannabis - Express Middleware
 *
 * - JWT authentication middleware
 * - Rate limiter for OTP requests
 * - Global error handler
 */

import { Request, Response, NextFunction } from 'express';
import { validateToken, TokenPayload } from './auth';

// ─────────────────────────────────────────────────────────────
// EXTENDED REQUEST TYPE
// ─────────────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  authUser?: TokenPayload;
  token?: string;
}

// ─────────────────────────────────────────────────────────────
// JWT AUTH MIDDLEWARE
// ─────────────────────────────────────────────────────────────

/**
 * Require a valid JWT in the Authorization: Bearer header.
 * Attaches the decoded payload to req.authUser.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const result = await validateToken(token);

  if (!result.valid || !result.payload) {
    res.status(401).json({ error: result.error || 'Invalid token' });
    return;
  }

  req.authUser = result.payload;
  req.token = token;
  next();
}

/**
 * Optional auth - attaches client if token present, continues regardless.
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const result = await validateToken(token);
    if (result.valid && result.payload) {
      req.authUser = result.payload;
      req.token = token;
    }
  }
  next();
}

/**
 * Require admin role. For now, checks a list of admin emails
 * from the ADMIN_EMAILS env variable (comma-separated).
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
  if (!adminEmails.includes(req.authUser.email.toLowerCase())) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

// ─────────────────────────────────────────────────────────────
// OTP RATE LIMITER (in-memory, simple)
// ─────────────────────────────────────────────────────────────

const otpAttempts = new Map<string, { count: number; resetAt: number }>();

const OTP_RATE_LIMIT = {
  maxAttempts: 20,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export function otpRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const email = (req.body?.email as string)?.toLowerCase();
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const now = Date.now();
  const entry = otpAttempts.get(email);

  if (entry && entry.resetAt > now) {
    if (entry.count >= OTP_RATE_LIMIT.maxAttempts) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.status(429).json({
        error: 'Too many OTP requests. Try again later.',
        retryAfter,
      });
      return;
    }
    entry.count++;
  } else {
    otpAttempts.set(email, {
      count: 1,
      resetAt: now + OTP_RATE_LIMIT.windowMs,
    });
  }

  next();
}

// Clean up stale rate limit entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpAttempts) {
    if (val.resetAt <= now) otpAttempts.delete(key);
  }
}, 30 * 60 * 1000).unref();

// ─────────────────────────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export function errorHandler(
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = 'status' in err ? err.status : 500;
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({
    error: message,
    ...('code' in err && err.code ? { code: err.code } : {}),
  });
}

/**
 * Helper to throw an API error from route handlers.
 */
export function apiError(status: number, message: string, code?: string): ApiError {
  const err = new Error(message) as Error & ApiError;
  err.status = status;
  err.message = message;
  if (code) err.code = code;
  return err;
}
