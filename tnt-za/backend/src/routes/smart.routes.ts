import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as smart from '../services/smart-tickets.service';
import { prisma } from '../config/db';

const router = Router();
router.use(requireAuth);

// Notifications for the current user — computed smart signals PLUS the user's direct
// inbox (Notification table). The inbox holds ticket-assignment alerts, batch-kickoff
// pings (genesis cloning → NM / HoC / Cult.Supervisor / Cultivator) and deviation
// routes; nothing rendered the table before, so those events were captured but invisible.
router.get('/notifications', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await smart.generateSmartNotifications(req.user!.userId, req.user!.tenantId);
    const inbox = await prisma.notification.findMany({
      where: { userId: req.user!.userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });
    const inboxMapped = inbox.map((n) => ({
      type: 'inbox', priority: 2,
      title: n.title, message: n.message, link: n.link || '/tasks',
    }));
    res.json({ success: true, notifications: [...inboxMapped, ...notifications] });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Mark a notification read (dismiss from the bell).
router.patch('/notifications/:id/read', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { id: p(req.params.id), userId: req.user!.userId }, data: { read: true } });
    res.json({ success: true });
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
