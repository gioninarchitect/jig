import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as strainService from '../services/strain.service';

const router = Router();
router.use(requireAuth);

router.get('/', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const strains = await strainService.listStrains(req.user!.tenantId);
    res.json({ success: true, strains });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/analytics', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const analytics = await strainService.getStrainAnalytics(req.user!.tenantId);
    res.json({ success: true, analytics });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const strain = await strainService.getStrain(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, strain });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const strain = await strainService.createStrain({ ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId });
    res.status(201).json({ success: true, strain });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/:id', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const strain = await strainService.updateStrain(p(req.params.id), req.body);
    res.json({ success: true, strain });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
