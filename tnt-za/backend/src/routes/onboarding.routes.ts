import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import * as onboarding from '../services/onboarding.service';

const router = Router();
router.use(requireAuth);

router.get('/status', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const facilityId = req.user!.facilityId;
    if (!facilityId) return res.status(400).json({ success: false, error: 'No facility assigned' });
    const status = await onboarding.getOnboardingStatus(facilityId);
    res.json({ success: true, ...status });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/facility', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const facility = await onboarding.setupFacility({
      ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, facility });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/licenses', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const facility = await onboarding.setupLicenses({
      ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, facility });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/zones', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const zones = await onboarding.setupZones({
      ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, zones });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/strains', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const strains = await onboarding.setupStrains({
      ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, strains });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/equipment', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const equipment = await onboarding.setupEquipment({
      ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, equipment });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/team', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const members = await onboarding.setupTeam({
      ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, members });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/sops', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const sops = await onboarding.setupSOPs({
      ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, sops });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/security', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const facility = await onboarding.setupSecurity({
      ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, facility });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/complete', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const facility = await onboarding.completeOnboarding(req.user!.facilityId!, req.user!.userId, req.user!.tenantId);
    res.json({ success: true, facility });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
