import { Router, Response } from 'express';
import { requireAuth, requireLevel, requireRole, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as qms from '../controllers/qms.controller';
import * as sopTraining from '../services/sop-training.service';
import * as euGmp from '../services/eu-gmp-source.service';
import { syncSopGovernance } from '../services/sop-governance.service';
import { prisma } from '../config/db';

const router = Router();
router.use(requireAuth);

// SOPs
router.post('/sops', requireRole('QA_INSPECTOR', 'RESPONSIBLE_PHARMACIST', 'HEAD_OF_CULTIVATION', 'PROCESSING_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN'), qms.createSOP);
router.get('/sops', requireLevel(0), qms.listSOPs);
router.patch('/sops/:id', requireLevel(3), qms.updateSOP);
router.get('/sops/:id/versions', requireLevel(0), qms.listSopVersions);
router.post('/sops/:id/acknowledge', qms.acknowledgeSOP);

// Deviations
router.post('/deviations', requireLevel(2), qms.createDeviation);
router.get('/deviations', requireLevel(0), qms.listDeviations);
router.patch('/deviations/:id', requireLevel(3), qms.updateDeviation);
router.patch('/deviations/:id/approve', requireRole('QA_INSPECTOR', 'TENANT_ADMIN', 'SUPER_ADMIN'), qms.approveDeviation);
router.patch('/deviations/:id/close', requireRole('RESPONSIBLE_PHARMACIST', 'TENANT_ADMIN', 'SUPER_ADMIN'), qms.closeDeviation);

// Equipment
router.post('/equipment', requireLevel(3), qms.createEquipment);
router.patch('/equipment/:id/calibrate', requireLevel(3), qms.calibrateEquipment);
router.get('/equipment', requireLevel(0), qms.listEquipment);

// QMS register (generic) — Legal, Validations, Risk, Stability, Barcode, Engineering, Procurement
router.get('/records', requireLevel(0), qms.listQmsRecords);
router.post('/records', requireLevel(2), qms.createQmsRecord);
router.patch('/records/:id', requireLevel(2), qms.updateQmsRecord);

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

// QA adds / edits a regulatory source (SAHPRA, SAPC, SA-law, etc.). QA is the verified human.
router.post('/sources', requireRole('QA_INSPECTOR', 'RESPONSIBLE_PHARMACIST', 'TENANT_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try { const source = await euGmp.createSource(req.body); res.status(201).json({ success: true, source }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});
router.patch('/sources/:id', requireRole('QA_INSPECTOR', 'RESPONSIBLE_PHARMACIST', 'TENANT_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try { const source = await euGmp.updateSource(p(req.params.id), req.body); res.json({ success: true, source }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
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
