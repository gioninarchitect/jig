import { Router } from 'express';
import { requireAuth, requireLevel, requireRole } from '../middleware/auth';
import * as batch from '../controllers/batch.controller';

const router = Router();
router.use(requireAuth);

router.post('/', requireLevel(3), batch.create);
router.post('/from-harvest/:harvestRequestId', requireLevel(3), batch.createFromHarvest);
router.get('/', requireLevel(0), batch.list);
router.get('/:id', requireLevel(0), batch.getById);
router.post('/:id/bcr/sync', requireLevel(2), batch.syncBcr);
router.get('/:id/chain', requireLevel(0), batch.chain);
router.post('/:id/split', requireLevel(3), batch.split);
router.post('/merge', requireLevel(3), batch.merge);
router.patch('/:id/status', requireLevel(3), batch.updateStatus);
router.post('/:id/request-destruction', requireLevel(3), batch.requestDestruction);
router.post('/:id/confirm-destruction', requireRole('FACILITY_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN'), batch.confirmDestruction);

// Batch records — BMR / BPR / BDR
router.get('/:id/records', requireLevel(0), batch.listRecords);
router.post('/:id/records', requireLevel(1), batch.createRecord);
router.patch('/records/:recordId', requireLevel(2), batch.updateRecord);

// Processing stage weigh event (wet intake → … → dispatch)
router.post('/:id/processing/stage', requireLevel(1), batch.recordStage);

export default router;
