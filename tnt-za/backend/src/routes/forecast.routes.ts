import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as forecast from '../services/forecast.service';

const router = Router();
router.use(requireAuth);

// Get forecast — what's coming in next N days
router.get('/', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(p(req.query.days as string)) || 7;
    const data = await forecast.getForecast(req.user!.tenantId, days);
    res.json({ success: true, forecast: data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Auto-generate tickets from calendar for next N days
router.post('/generate-tickets', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const days = req.body.daysAhead || 3;
    const result = await forecast.forecastAndCreateTickets(req.user!.tenantId, req.user!.userId, days);
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Get daily reminders
router.get('/reminders', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const data = await forecast.generateDailyReminders(req.user!.tenantId);
    res.json({ success: true, reminders: data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
