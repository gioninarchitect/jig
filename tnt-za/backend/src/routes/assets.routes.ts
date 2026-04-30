import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as as from '../services/assets.service';

const router = Router();
router.use(requireAuth);

// List assets with filters
router.get('/', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const assets = await as.listAssets({
      tenantId: req.user!.tenantId,
      tier: p(req.query.tier as string),
      category: p(req.query.category as string),
      status: p(req.query.status as string),
      workflowStage: p(req.query.workflowStage as string),
      isSensor: req.query.isSensor === 'true',
      isConsumable: req.query.isConsumable === 'true',
      lowStock: req.query.lowStock === 'true',
      calibrationDue: req.query.calibrationDue === 'true',
    });
    res.json({ success: true, assets });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Dashboard stats
router.get('/stats', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const stats = await as.getAssetStats(req.user!.tenantId);
    res.json({ success: true, stats });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Get by QR tag (scan)
router.get('/tag/:tag', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const asset = await as.getAssetByTag(p(req.params.tag));
    if (!asset) return res.status(404).json({ success: false, error: 'Asset not found' });
    res.json({ success: true, asset });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Get single (360 view)
router.get('/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const asset = await as.getAsset(p(req.params.id), req.user!.tenantId);
    if (!asset) return res.status(404).json({ success: false, error: 'Asset not found' });
    res.json({ success: true, asset });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Create asset
router.post('/', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const asset = await as.createAsset({ ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, asset });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Update asset
router.patch('/:id', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const asset = await as.updateAsset(p(req.params.id), req.body);
    res.json({ success: true, asset });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Log maintenance
router.post('/:id/maintenance', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const log = await as.logMaintenance({ assetId: p(req.params.id), ...req.body, userId: req.user!.userId });
    res.json({ success: true, log });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Log sensor reading
router.post('/:id/reading', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const reading = await as.logSensorReading(p(req.params.id), req.body.value, req.body.unit);
    res.json({ success: true, reading });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Update consumable stock
router.post('/:id/stock', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const asset = await as.updateStock(p(req.params.id), req.body.change, req.user!.userId);
    res.json({ success: true, asset });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

export default router;
