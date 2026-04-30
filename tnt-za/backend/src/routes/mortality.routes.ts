import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as mort from '../services/mortality.service';

const router = Router();
router.use(requireAuth);

router.get('/', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const records = await mort.listMortality({
      tenantId: req.user!.tenantId,
      causeCategory: p(req.query.cause as string),
      strain: p(req.query.strain as string),
      entityType: p(req.query.type as string),
    });
    res.json({ success: true, records });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/stats', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await mort.getMortalityStats(req.user!.tenantId);
    res.json({ success: true, stats });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const record = await mort.recordDeath({ ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, record });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/:id/review', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const record = await mort.reviewMortality(p(req.params.id), req.user!.userId);
    res.json({ success: true, record });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
