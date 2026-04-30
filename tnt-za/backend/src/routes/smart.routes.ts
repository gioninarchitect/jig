import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as smart from '../services/smart-tickets.service';

const router = Router();
router.use(requireAuth);

// Get smart notifications for current user
router.get('/notifications', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await smart.generateSmartNotifications(req.user!.userId, req.user!.tenantId);
    res.json({ success: true, notifications });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Get context for a ticket
router.get('/tickets/:id/context', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const context = await smart.getTicketContext(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, context });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Run escalation check (FM+ can trigger manually, or run on cron)
router.post('/escalate', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const result = await smart.escalateStaleTickets(req.user!.tenantId);
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Find related tickets
router.get('/tickets/:id/related', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const related = await smart.findRelatedTickets(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, related });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
