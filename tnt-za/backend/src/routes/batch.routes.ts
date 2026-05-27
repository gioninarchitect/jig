import { Router } from 'express';
import { requireAuth, requireLevel } from '../middleware/auth';
import * as batch from '../controllers/batch.controller';

const router = Router();
router.use(requireAuth);

router.post('/', requireLevel(3), batch.create);
router.get('/', requireLevel(0), batch.list);
router.get('/:id', requireLevel(0), batch.getById);
router.post('/:id/bcr/sync', requireLevel(2), batch.syncBcr);
router.get('/:id/chain', requireLevel(0), batch.chain);
router.post('/:id/split', requireLevel(3), batch.split);
router.post('/merge', requireLevel(3), batch.merge);
router.patch('/:id/status', requireLevel(3), batch.updateStatus);
router.post('/:id/request-destruction', requireLevel(3), batch.requestDestruction);
router.post('/:id/confirm-destruction', requireLevel(3), batch.confirmDestruction);

export default router;
