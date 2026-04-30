import { Router } from 'express';
import { requireAuth, requireLevel } from '../middleware/auth';
import * as container from '../controllers/container.controller';

const router = Router();

router.use(requireAuth);

router.post('/', requireLevel(2), container.register);
router.get('/', requireLevel(0), container.list);
router.get('/:id', requireLevel(0), container.getById);
router.post('/:id/load', requireLevel(2), container.load);
router.post('/:id/unload', requireLevel(2), container.unload);
router.post('/:id/move', requireLevel(2), container.move);
router.post('/:id/handover', requireLevel(2), container.handover);
router.get('/reconciliation/:batchId', requireLevel(3), container.reconciliation);

export default router;
