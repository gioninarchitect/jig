import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as shift from '../services/shift.service';

const router = Router();
router.use(requireAuth);

// My shift today
router.get('/my-shift', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const s = await shift.getMyShift(req.user!.userId, req.user!.tenantId);
    res.json({ success: true, shift: s });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Get all shifts for a date
router.get('/date/:date', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const shifts = await shift.getShiftsForDate(p(req.params.date), req.user!.tenantId);
    res.json({ success: true, shifts });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Allocate single staff
router.post('/', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const s = await shift.allocateShift({ ...req.body, tenantId: req.user!.tenantId, allocatedById: req.user!.userId });
    res.json({ success: true, shift: s });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Bulk allocate
router.post('/bulk', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const results = await shift.bulkAllocate({ ...req.body, tenantId: req.user!.tenantId, allocatedById: req.user!.userId });
    res.json({ success: true, count: results.length, shifts: results });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Start shift
router.patch('/:id/start', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const s = await shift.startShift(p(req.params.id));
    res.json({ success: true, shift: s });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Complete shift
router.patch('/:id/complete', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const s = await shift.completeShift(p(req.params.id), req.body.deviationNotes);
    res.json({ success: true, shift: s });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
