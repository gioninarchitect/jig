import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as motherService from '../services/mother.service';

const router = Router();
router.use(requireAuth);

// Log event on mother timeline
router.post('/:id/events', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const event = await motherService.logMotherEvent({
      motherPlantId: p(req.params.id), ...req.body,
      userId: req.user!.userId, tenantId: req.user!.tenantId,
    });
    res.json({ success: true, event });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Get mother timeline
router.get('/:id/timeline', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const timeline = await motherService.getMotherTimeline(p(req.params.id));
    res.json({ success: true, timeline });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Assign mother to bay
router.patch('/:id/bay', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const mother = await motherService.assignMotherToBay({ motherPlantId: p(req.params.id), ...req.body });
    res.json({ success: true, mother });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Get mothers needing health check
router.get('/due-checks', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const mothers = await motherService.getMothersNeedingCheck(req.user!.tenantId);
    res.json({ success: true, mothers });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
