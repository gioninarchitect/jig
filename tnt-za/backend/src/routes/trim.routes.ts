import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as trim from '../services/trim.service';

const router = Router();
router.use(requireAuth);

router.get('/', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await trim.listTrimSessions(req.user!.tenantId, p(req.query.status as string));
    res.json({ success: true, sessions });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const session = await trim.getTrimSession(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, session });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const session = await trim.createTrimSession({ ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, session });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/:id/assign', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const assignment = await trim.assignTrimmer({ trimSessionId: p(req.params.id), ...req.body });
    res.json({ success: true, assignment });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/assignments/:id/complete', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const assignment = await trim.completeTrimmerAssignment(p(req.params.id), req.body);
    res.json({ success: true, assignment });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/:id/complete', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const session = await trim.completeTrimSession(p(req.params.id), req.user!.userId);
    res.json({ success: true, session });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

export default router;
