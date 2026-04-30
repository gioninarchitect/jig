import { Router } from 'express';
import { requireAuth, requireLevel } from '../middleware/auth';
import * as coa from '../controllers/coa.controller';

const router = Router();
router.use(requireAuth);

router.post('/generate/:batchId', requireLevel(2), coa.generate);
router.get('/:id', requireLevel(0), coa.getById);
router.patch('/:id/revoke', requireLevel(3), coa.revoke);

export default router;
