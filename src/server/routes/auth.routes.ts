/**
 * JIG Craft Cannabis - Auth Routes
 *
 * POST /auth/otp/request   - Request an OTP
 * POST /auth/otp/verify    - Verify OTP and get JWT
 * POST /auth/logout         - Revoke session
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requestOtp, verifyOtpAndCreateSession, logout } from '../auth';
import { otpRateLimiter, requireAuth, AuthenticatedRequest } from '../middleware';

const router = Router();

// ── Request OTP ─────────────────────────────────────────────

router.post(
  '/otp/request',
  otpRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, purpose } = req.body;

      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Valid email is required' });
        return;
      }

      const validPurposes = ['login', 'register', 'reset'] as const;
      const otpPurpose = validPurposes.includes(purpose) ? purpose : 'login';

      const result = await requestOtp(email.toLowerCase().trim(), otpPurpose);

      res.json({
        message: 'Verification code sent to your email',
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── Verify OTP ──────────────────────────────────────────────

router.post(
  '/otp/verify',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body;

      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Email is required' });
        return;
      }
      if (!code || typeof code !== 'string' || code.length !== 6) {
        res.status(400).json({ error: 'A 6-digit code is required' });
        return;
      }

      const result = await verifyOtpAndCreateSession(
        email.toLowerCase().trim(),
        code,
        req.headers['user-agent'],
        req.ip,
      );

      if (!result.success) {
        res.status(401).json({ error: result.error });
        return;
      }

      res.json({
        token: result.token,
        clientId: result.clientId,
        expiresAt: result.expiresAt,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── Logout ──────────────────────────────────────────────────

router.post(
  '/logout',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (req.token) {
        await logout(req.token);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
