import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as transport from '../controllers/transport.controller';
import * as transportService from '../services/transport.service';

const router = Router();
router.use(requireAuth);

const uploadDir = path.join(process.cwd(), 'uploads', 'transport');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

router.post('/manifests', requireLevel(3), transport.create);
router.patch('/manifests/:id/depart', requireLevel(1), transport.depart);
router.patch('/manifests/:id/arrive', requireLevel(1), transport.arrive);
router.get('/manifests', requireLevel(0), transport.list);

// Upload driver's-licence photo for a manifest
router.post('/manifests/:id/driver-license', requireLevel(1), upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Photo required' });
    const url = `/uploads/transport/${req.file.filename}`;
    const manifest = await transportService.attachDriverLicense(p(req.params.id), url, req.user!.userId, req.user!.tenantId);
    res.json({ success: true, manifest, url });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// Record the pre-dispatch vehicle inspection (supports optional photo upload)
router.post('/manifests/:id/vehicle-inspection', requireLevel(1), upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const { passed, notes, checks } = req.body;
    const photoUrl = req.file ? `/uploads/transport/${req.file.filename}` : undefined;
    const parsedChecks = typeof checks === 'string' ? JSON.parse(checks) : checks;
    const manifest = await transportService.recordVehicleInspection(p(req.params.id), {
      passed: passed === 'true' || passed === true,
      notes, checks: parsedChecks, photoUrl,
      userId: req.user!.userId, tenantId: req.user!.tenantId,
    });
    res.json({ success: true, manifest });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

export default router;
