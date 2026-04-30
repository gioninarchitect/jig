import { Router } from 'express';
import { Response } from 'express';
import { requireAuth, requireLevel } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as anomalyService from '../services/anomaly.service';

const router = Router();
router.use(requireAuth);

router.get('/', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const anomalies = await anomalyService.listAnomalies({
      tenantId: req.user!.tenantId,
      type: p(req.query.type as string),
      severity: p(req.query.severity as string),
      resolved: p(req.query.resolved as string),
    });
    res.json({ success: true, anomalies });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.patch('/:id/resolve', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const anomaly = await anomalyService.resolveAnomaly(p(req.params.id), {
      investigationNotes: req.body.investigationNotes,
      tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, anomaly });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.get('/check-stale', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const result = await anomalyService.checkStaleContainers(req.user!.tenantId);
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

export default router;
