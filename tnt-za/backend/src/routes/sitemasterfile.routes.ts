import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { generateSiteMasterFile } from '../services/sitemasterfile.service';

const router = Router();
router.use(requireAuth);

// GET /api/site-master-file — Live SMF data
router.get('/', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const smf = await generateSiteMasterFile(req.user!.tenantId);
    res.json({ success: true, smf });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
