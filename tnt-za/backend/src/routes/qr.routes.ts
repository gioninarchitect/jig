import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import { generateLabel } from '../utils/qr';
import { prisma } from '../config/db';
import { join } from 'path';
import { existsSync } from 'fs';

const router = Router();
router.use(requireAuth);

// GET /api/qr/plant/:id — Generate or return QR label for a plant
router.get('/plant/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const plant = await prisma.plant.findFirst({ where: { id: p(req.params.id), tenantId: req.user!.tenantId } });
    if (!plant) return res.status(404).json({ success: false, error: 'Plant not found' });

    const label = await generateLabel(plant.identifier, 'plant');

    // Update plant QR if not set
    if (!plant.qrCode || !plant.qrCode.startsWith('/uploads')) {
      await prisma.plant.update({ where: { id: plant.id }, data: { qrCode: label.qrUrl } });
    }

    res.json({ success: true, identifier: plant.identifier, type: 'plant', ...label });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/qr/container/:id — Generate or return QR label for a container
router.get('/container/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const container = await prisma.container.findFirst({ where: { id: p(req.params.id), tenantId: req.user!.tenantId } });
    if (!container) return res.status(404).json({ success: false, error: 'Container not found' });

    const label = await generateLabel(container.containerId, 'container');

    if (!container.qrCode || !container.qrCode.startsWith('/uploads')) {
      await prisma.container.update({ where: { id: container.id }, data: { qrCode: label.qrUrl } });
    }

    res.json({ success: true, identifier: container.containerId, type: 'container', ...label });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/qr/batch/:id — Generate or return QR label for a batch
router.get('/batch/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const batch = await prisma.batch.findFirst({ where: { id: p(req.params.id), tenantId: req.user!.tenantId } });
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });

    const label = await generateLabel(batch.batchNumber, 'batch');
    res.json({ success: true, identifier: batch.batchNumber, type: 'batch', ...label });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/qr/asset/:id — Generate QR label for an asset
router.get('/asset/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const asset = await prisma.asset.findFirst({ where: { id: p(req.params.id), tenantId: req.user!.tenantId } });
    if (!asset) return res.status(404).json({ success: false, error: 'Asset not found' });

    const label = await generateLabel(asset.assetTag, 'asset');

    if (!asset.qrCode) {
      await prisma.asset.update({ where: { id: asset.id }, data: { qrCode: label.qrUrl } });
    }

    res.json({
      success: true, identifier: asset.assetTag, type: 'asset', ...label,
      meta: { name: asset.name, aliases: asset.aliases, category: asset.category, tier: asset.tier, serialNumber: asset.serialNumber },
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/qr/print/:type/:id — Return just the QR PNG image (for printing)
router.get('/print/:type/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const type = p(req.params.type) as 'plant' | 'container' | 'batch' | 'asset';
    const id = p(req.params.id);
    let identifier = '';

    if (type === 'plant') {
      const plant = await prisma.plant.findFirst({ where: { id, tenantId: req.user!.tenantId } });
      if (!plant) return res.status(404).json({ success: false, error: 'Not found' });
      identifier = plant.identifier;
    } else if (type === 'container') {
      const container = await prisma.container.findFirst({ where: { id, tenantId: req.user!.tenantId } });
      if (!container) return res.status(404).json({ success: false, error: 'Not found' });
      identifier = container.containerId;
    } else if (type === 'batch') {
      const batch = await prisma.batch.findFirst({ where: { id, tenantId: req.user!.tenantId } });
      if (!batch) return res.status(404).json({ success: false, error: 'Not found' });
      identifier = batch.batchNumber;
    } else if (type === 'asset') {
      const asset = await prisma.asset.findFirst({ where: { id, tenantId: req.user!.tenantId } });
      if (!asset) return res.status(404).json({ success: false, error: 'Not found' });
      identifier = asset.assetTag;
    }

    const label = await generateLabel(identifier, type);
    const filePath = join(process.cwd(), label.qrUrl);
    if (existsSync(filePath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="${identifier}.png"`);
      res.sendFile(filePath);
    } else {
      res.status(404).json({ success: false, error: 'QR file not found' });
    }
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
