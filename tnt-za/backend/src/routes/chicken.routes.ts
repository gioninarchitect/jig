import { Router, Response } from 'express';
import multer from 'multer';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import * as chicken from '../services/chicken.service';

const router = Router();
router.use(requireAuth);

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'chickens');
try { mkdirSync(UPLOAD_DIR, { recursive: true }); } catch { /* exists */ }
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `crate-${Date.now()}-${Math.round(Math.random() * 1e6)}.${(file.originalname.split('.').pop() || 'jpg')}`),
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
});

// Houses config + live summary (owner dashboard)
router.get('/houses', requireLevel(0), (_req, res) => res.json({ success: true, houses: chicken.HOUSES }));
router.get('/summary', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, summary: await chicken.getSummary(req.user!.tenantId) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.get('/crates', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const crates = await chicken.listCrates(req.user!.tenantId, { house: req.query.house as string | undefined, todayOnly: req.query.today === '1' });
    res.json({ success: true, crates });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// Staff load a crate — count (varies by bird size) + photo evidence
router.post('/crates', requireLevel(1), upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const crate = await chicken.createCrate({
      house: req.body.house,
      chickenCount: parseInt(req.body.chickenCount),
      photoUrl: req.file ? `/uploads/chickens/${req.file.filename}` : (req.body.photoUrl || undefined),
      notes: req.body.notes,
      facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.status(201).json({ success: true, crate });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// Daily validation by manager/admin (Loraine): verify (optionally correct count) or flag
router.patch('/crates/:id/verify', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const crate = await chicken.verifyCrate(String(req.params.id), {
      action: req.body.action === 'flag' ? 'flag' : 'verify',
      verifiedCount: req.body.verifiedCount != null ? parseInt(req.body.verifiedCount) : undefined,
      flagReason: req.body.flagReason,
      userId: req.user!.userId, tenantId: req.user!.tenantId,
    });
    res.json({ success: true, crate });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

export default router;
