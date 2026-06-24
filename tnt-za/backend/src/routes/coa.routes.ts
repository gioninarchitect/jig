import { Router } from 'express';
import { requireAuth, requireLevel, requireRole } from '../middleware/auth';
import * as coa from '../controllers/coa.controller';

const router = Router();
router.use(requireAuth);

router.post('/generate/:batchId', requireRole('LAB_TECH', 'QA_INSPECTOR', 'RESPONSIBLE_PHARMACIST', 'TENANT_ADMIN', 'SUPER_ADMIN'), coa.generate);
router.get('/:id', requireLevel(0), coa.getById);
router.patch('/:id/revoke', requireRole('RESPONSIBLE_PHARMACIST', 'TENANT_ADMIN', 'SUPER_ADMIN'), coa.revoke);

export default router;
