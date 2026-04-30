import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as cloneService from '../services/clone.service';

const router = Router();
router.use(requireAuth);

// List clones for a tray (with stats)
router.get('/tray/:trayId', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const clones = await cloneService.listClonesForTray(p(req.params.trayId));
    const stats = await cloneService.getCloneStats(p(req.params.trayId));
    res.json({ success: true, clones, stats });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// List clones by mother
router.get('/mother/:identifier', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const clones = await cloneService.listClonesForMother(p(req.params.identifier), req.user!.tenantId);
    res.json({ success: true, clones });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Bulk root check — day 7 or 14 (one tap for whole tray)
router.post('/tray/:trayId/root-check', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const result = await cloneService.bulkRootCheck(p(req.params.trayId), req.body.day);
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// SMART: Process transplant count — "X survived, Y died"
router.post('/tray/:trayId/process', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const result = await cloneService.processTransplantCount({
      cloneTrayId: p(req.params.trayId),
      survivedCount: req.body.survivedCount,
      deathCause: req.body.deathCause || 'UNKNOWN',
      tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// SMART: Transplant whole tray to bay (auto-creates plants + bay allocation)
router.post('/tray/:trayId/transplant', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const result = await cloneService.transplantToBay({
      cloneTrayId: p(req.params.trayId),
      bayId: req.body.bayId, greenhouseId: req.body.greenhouseId,
      tenantId: req.user!.tenantId, userId: req.user!.userId, facilityId: req.user!.facilityId!,
    });
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
