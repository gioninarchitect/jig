import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as qms from '../controllers/qms.controller';
import * as sopTraining from '../services/sop-training.service';
import * as euGmp from '../services/eu-gmp-source.service';
import { syncSopGovernance } from '../services/sop-governance.service';
import { prisma } from '../config/db';

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

// EU GMP source registry — sole source of truth for compliance requirements
router.get('/eu-gmp-registry', requireLevel(0), async (_req: AuthRequest, res: Response) => {
  try {
    const registry = await euGmp.getEuGmpRegistry();
    res.json({ success: true, ...registry });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/eu-gmp-registry/sync', requireLevel(4), async (req: AuthRequest, res: Response) => {
  try {
    await euGmp.ensureEuGmpRegistry(req.user!.userId, req.user!.tenantId);
    const registry = await euGmp.getEuGmpRegistry();
    res.json({ success: true, ...registry });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/compliance-controls', requireLevel(4), async (req: AuthRequest, res: Response) => {
  try {
    const control = await euGmp.createComplianceControl({
      ...req.body,
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
    });
    res.status(201).json({ success: true, control });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

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

router.post('/sops/sync-governance', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const sops = await prisma.sOP.findMany({
      where: { tenantId: req.user!.tenantId, active: true },
      select: { id: true },
    });
    const results = [];
    for (const sop of sops) {
      results.push(await syncSopGovernance(sop.id, req.user!.tenantId, req.user!.userId));
    }
    res.json({
      success: true,
      synced: results.length,
      trainingCreated: results.reduce((sum, r) => sum + r.trainingCreated, 0),
      templatesCreated: results.reduce((sum, r) => sum + r.templatesCreated, 0),
      ticketsCreated: results.filter(r => r.ticketCreated).length,
      results,
    });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/sops/:id/sync-governance', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const result = await syncSopGovernance(p(req.params.id), req.user!.tenantId, req.user!.userId);
    res.json({ success: true, governance: result });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

export default router;
