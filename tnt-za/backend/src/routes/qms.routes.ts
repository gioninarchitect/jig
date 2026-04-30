import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as qms from '../controllers/qms.controller';
import * as sopTraining from '../services/sop-training.service';

const router = Router();
router.use(requireAuth);

// SOPs
router.post('/sops', requireLevel(3), qms.createSOP);
router.get('/sops', requireLevel(0), qms.listSOPs);
router.patch('/sops/:id', requireLevel(3), qms.updateSOP);
router.post('/sops/:id/acknowledge', qms.acknowledgeSOP);

// Deviations
router.post('/deviations', requireLevel(2), qms.createDeviation);
router.get('/deviations', requireLevel(0), qms.listDeviations);
router.patch('/deviations/:id', requireLevel(3), qms.updateDeviation);
router.patch('/deviations/:id/close', requireLevel(3), qms.closeDeviation);

// Equipment
router.post('/equipment', requireLevel(3), qms.createEquipment);
router.patch('/equipment/:id/calibrate', requireLevel(3), qms.calibrateEquipment);
router.get('/equipment', requireLevel(0), qms.listEquipment);

// SOP Training
router.get('/sops/:id/training', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const status = await sopTraining.getSOPTrainingStatus(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, training: status });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/training-overview', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const overview = await sopTraining.getSOPTrainingOverview(req.user!.tenantId);
    res.json({ success: true, ...overview });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/sops/:id/assign-training', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const result = await sopTraining.createTrainingForSOP(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
