import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as feed from '../services/feeding.service';

const router = Router();
router.use(requireAuth);

router.get('/plans', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const plans = await feed.listFeedPlans(req.user!.tenantId, p(req.query.greenhouseId as string));
    res.json({ success: true, plans });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/plans', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const plan = await feed.createFeedPlan({ ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, plan });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/records', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const records = await feed.listFeedRecords({ tenantId: req.user!.tenantId, greenhouseId: p(req.query.greenhouseId as string) });
    res.json({ success: true, records });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/records', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const record = await feed.createFeedRecord({ ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, record });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/stats', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await feed.getFeedingStats(req.user!.tenantId);
    res.json({ success: true, stats });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
