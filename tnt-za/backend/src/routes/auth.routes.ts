import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate, requestPinSchema, verifyPinSchema } from '../middleware/validate';
import * as auth from '../controllers/auth.controller';

const router = Router();

router.post('/request-pin', validate(requestPinSchema), auth.requestPin);
router.post('/verify-pin', validate(verifyPinSchema), auth.verifyPin);
router.post('/logout', requireAuth, auth.logout);
router.get('/me', requireAuth, auth.getMe);

export default router;
