import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { generateOwnerBrief } from '../services/owner-concierge.service';

// =====================================================================
// /api/concierge — Owner Concierge agent endpoints
// =====================================================================

const router = Router();
router.use(requireAuth);

// Owner-tier only — TENANT_ADMIN or SUPER_ADMIN
router.get('/brief', requireLevel(4), async (req: AuthRequest, res: Response) => {
  try {
    const brief = await generateOwnerBrief(req.user!.tenantId);
    res.json({ success: true, ...brief });
  } catch (err: any) {
    console.error('[Owner Concierge] failed:', err);
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

export default router;
