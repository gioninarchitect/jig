import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { identifyFromPhoto } from '../services/vision.service';
import multer from 'multer';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'scans');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `scan-${Date.now()}.${file.originalname.split('.').pop()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP allowed'));
  },
});

const router = Router();
router.use(requireAuth);

// POST /api/scan — Upload photo, identify plant/container/batch via Claude Vision
router.post('/', requireLevel(1), upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Photo required' });

    const result = await identifyFromPhoto(req.file.path, req.user!.tenantId);

    res.json({
      success: true,
      ...result,
      photoUrl: `/uploads/scans/${req.file.filename}`,
    });
  } catch (err: any) {
    console.error('[Scan] Vision error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to process photo: ' + err.message });
  }
});

export default router;
