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
  try { res.json({ success: true, summary: await chicken.getSummary(req.user!.tenantId, req.user!.facilityId || undefined) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── Coops (editable flock counts — Loraine) ───────────────────────────
router.get('/coops', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.facilityId) await chicken.ensureCoops(req.user!.tenantId, req.user!.facilityId);
    res.json({ success: true, coops: await chicken.listCoops(req.user!.tenantId) });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});
// Edit a coop count — mandatory change-reason + full audit (GMP change-control)
router.patch('/coops/:id', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const changeReason = String(req.body?.changeReason ?? '').trim();
    if (!changeReason) return res.status(400).json({ success: false, error: 'A reason for the change is required' });
    const coop = await chicken.updateCoop(String(req.params.id), {
      flockCount: parseInt(req.body.flockCount), changeReason,
      userId: req.user!.userId, tenantId: req.user!.tenantId,
    });
    res.json({ success: true, coop });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── Daily records: mortality · temp · catch · abattoir · intake ───────
const KINDS = ['mortality', 'temp', 'catch', 'abattoir', 'intake'] as const;
for (const kind of KINDS) {
  router.get(`/${kind}`, requireLevel(0), async (req: AuthRequest, res: Response) => {
    try { res.json({ success: true, records: await chicken.listRecords(kind as any, req.user!.tenantId, { coopName: req.query.coop as string | undefined }) }); }
    catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
  });
  // Correcting an existing record requires a reason + audit
  router.patch(`/${kind}/:id`, requireLevel(1), async (req: AuthRequest, res: Response) => {
    try { res.json({ success: true, record: await chicken.updateRecord(kind as any, String(req.params.id), req.body, { userId: req.user!.userId, tenantId: req.user!.tenantId }) }); }
    catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
  });
}

const toDate = (s?: string) => (s ? new Date(s) : undefined);

router.post('/mortality', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try { res.status(201).json({ success: true, record: await chicken.createMortality({ coopName: req.body.coopName, count: parseInt(req.body.count), date: toDate(req.body.date), notes: req.body.notes, userId: req.user!.userId, tenantId: req.user!.tenantId }) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});
router.post('/temp', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try { res.status(201).json({ success: true, record: await chicken.createTemp({ coopName: req.body.coopName, tempC: parseFloat(req.body.tempC), date: toDate(req.body.date), userId: req.user!.userId, tenantId: req.user!.tenantId }) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});
router.post('/catch', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try { res.status(201).json({ success: true, record: await chicken.createCatch({ coopName: req.body.coopName, cratesLoaded: parseInt(req.body.cratesLoaded), perCrate: parseInt(req.body.perCrate), date: toDate(req.body.date), notes: req.body.notes, userId: req.user!.userId, tenantId: req.user!.tenantId }) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});
router.post('/abattoir', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try { res.status(201).json({ success: true, record: await chicken.createAbattoir({ cratesOnScale: parseInt(req.body.cratesOnScale), perCrate: parseInt(req.body.perCrate), totalWeightKg: parseFloat(req.body.totalWeightKg), date: toDate(req.body.date), notes: req.body.notes, userId: req.user!.userId, tenantId: req.user!.tenantId }) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});
router.post('/abattoir/:id/sign', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, record: await chicken.signAbattoir(String(req.params.id), { userId: req.user!.userId, userName: (req.user as any)?.name || (req.user as any)?.email?.split('@')[0] || 'staff', tenantId: req.user!.tenantId }) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});
router.post('/intake', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try { res.status(201).json({ success: true, record: await chicken.createIntake({ coopName: req.body.coopName, count: parseInt(req.body.count), date: toDate(req.body.date), notes: req.body.notes, userId: req.user!.userId, tenantId: req.user!.tenantId }) }); }
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
