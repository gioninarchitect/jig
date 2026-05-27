/**
 * PureGro Premium Cannabis Care - Auth Routes
 *
 * POST /auth/otp/request   - Request an OTP
 * POST /auth/otp/verify    - Verify OTP and get JWT
 * POST /auth/logout         - Revoke session
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requestOtp, verifyOtpAndCreateSession, logout, registerClient } from '../auth';
import { otpRateLimiter, requireAuth, AuthenticatedRequest } from '../middleware';

const router = Router();

// ── Register New Client ──────────────────────────────────────

router.post(
  '/register',
  otpRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyName, contactPerson, email, phone, registrationNumber } = req.body;

      if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
        res.status(400).json({ error: 'Company name is required (min 2 characters)' });
        return;
      }
      if (!contactPerson || typeof contactPerson !== 'string' || contactPerson.trim().length < 2) {
        res.status(400).json({ error: 'Contact person name is required' });
        return;
      }
      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Valid email is required' });
        return;
      }
      if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
        res.status(400).json({ error: 'Valid phone number is required' });
        return;
      }

      const result = await registerClient({
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        registrationNumber: registrationNumber?.trim() || undefined,
      });

      if (!result.success) {
        res.status(409).json({ error: result.error });
        return;
      }

      res.status(201).json({
        message: 'Account created. Verification code sent to your email.',
        clientId: result.clientId,
      });
    } catch (err) {
      next(err);
    }
  },
);

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
