import { Router } from 'express';
import { requireAuth, requireLevel, requireRole } from '../middleware/auth';
import * as compliance from '../controllers/compliance.controller';

const router = Router();
router.use(requireAuth);

// Quota
router.get('/quota/:facilityId', requireLevel(0), compliance.getQuota);
router.patch('/quota/:facilityId', requireRole('SUPER_ADMIN'), compliance.updateQuota);

// Destruction
router.post('/destruction', requireLevel(3), compliance.createDestruction);
router.get('/destruction', requireLevel(1), compliance.listDestructions);
router.get('/destruction/:id', requireLevel(1), compliance.getDestruction);
router.post('/destruction/:id/confirm', requireRole('FACILITY_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN'), compliance.confirmDestruction);

// Permits
router.get('/permits/:facilityId', requireLevel(0), compliance.listPermits);
router.post('/permits', requireLevel(3), compliance.createPermit);
router.patch('/permits/:id', requireLevel(3), compliance.updatePermit);

export default router;
