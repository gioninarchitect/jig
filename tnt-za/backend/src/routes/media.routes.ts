import { Router, Response } from 'express';
import multer from 'multer';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';

// Generic media upload — photos AND short videos — for cultivation proof
// (clone trays, daily checks, IPM, mortality, activity logs). Saved to /uploads/media,
// served by nginx at /uploads/. Returns the URL to persist on the record.
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'media');
mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      cb(null, `media-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`);
    },
  }),
  limits: { fileSize: 40 * 1024 * 1024 }, // 40MB — enough for a short phone video
  fileFilter: (_req, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image or video files are allowed'));
  },
});

const router = Router();
router.use(requireAuth);

router.post('/upload', requireLevel(1), upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    res.json({
      success: true,
      url: `/uploads/media/${req.file.filename}`,
      kind: req.file.mimetype.startsWith('video') ? 'video' : 'image',
      size: req.file.size,
    });
  } catch (err: any) {
    res.status(err.message?.includes('allowed') ? 400 : 500).json({ success: false, error: err.message });
  }
});

export default router;
