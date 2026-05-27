import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as labels from '../services/label-governance.service';

const router = Router();
router.use(requireAuth);

router.get('/', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const data = await labels.listLabels(req.user!.tenantId, p(req.query.status as string));
    res.json({ success: true, labels: data });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/issue', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const label = await labels.issueLabel({ ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, label });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.patch('/:id/status', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const label = await labels.updateLabelStatus(p(req.params.id), { ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.json({ success: true, label });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/reconcile', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const result = await labels.reconcileLabels(req.user!.tenantId, req.user!.userId);
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

export default router;
