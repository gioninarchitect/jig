import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import * as origin from '../services/origin.service';

const router = Router();
router.use(requireAuth);

// Origin Retail (Potchefstroom store) summary for the Owner Dashboard "Retail" tab.
router.get('/summary', requireLevel(3), async (_req: AuthRequest, res: Response) => {
  try {
    const summary = await origin.getRetailSummary();
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
