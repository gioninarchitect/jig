import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate, requestPinSchema, verifyPinSchema } from '../middleware/validate';
import * as auth from '../controllers/auth.controller';

const router = Router();

router.post('/request-pin', validate(requestPinSchema), auth.requestPin);
router.post('/verify-pin', validate(verifyPinSchema), auth.verifyPin);
// FLOCORE SSO (W30) — email OTP via the FLOCORE rail; local PIN above stays as fallback.
router.post('/flocore/request', auth.flocoreOtpRequest);
router.post('/flocore/verify', auth.flocoreOtpVerify);
router.post('/logout', requireAuth, auth.logout);
router.get('/me', requireAuth, auth.getMe);

export default router;
