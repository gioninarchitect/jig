import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as hr from '../services/hr.service';

const router = Router();
router.use(requireAuth);

// Clock in
router.post('/clock-in', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const record = await hr.clockIn(req.user!.userId, req.body.name || 'Staff', req.user!.tenantId);
    res.json({ success: true, record });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Clock out
router.post('/clock-out', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const record = await hr.clockOut(req.user!.userId, req.user!.tenantId);
    res.json({ success: true, record });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// Get attendance for date
router.get('/attendance/:date', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const records = await hr.getAttendanceForDate(p(req.params.date), req.user!.tenantId);
    res.json({ success: true, records });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Mark absent/leave
router.post('/absent', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const record = await hr.markAbsent(req.body.userId, req.body.userName, req.body.date, req.body.reason || 'ABSENT', req.user!.tenantId);
    res.json({ success: true, record });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Training — list
router.get('/training', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const records = await hr.listTraining({
      tenantId: req.user!.tenantId,
      userId: p(req.query.userId as string) || (req.query.mine === 'true' ? req.user!.userId : undefined),
      status: p(req.query.status as string),
    });
    res.json({ success: true, records });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Training — create
router.post('/training', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const record = await hr.createTraining({ ...req.body, tenantId: req.user!.tenantId });
    res.json({ success: true, record });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Training — complete
router.patch('/training/:id/complete', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const record = await hr.completeTraining(p(req.params.id), req.body);
    res.json({ success: true, record });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// HR Stats
router.get('/stats', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await hr.getHRStats(req.user!.tenantId);
    res.json({ success: true, stats });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
