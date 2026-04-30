import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import { prisma } from '../config/db';
import multer from 'multer';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'documents');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `doc-${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = Router();
router.use(requireAuth);

// Upload compliance document
router.post('/', requireLevel(3), upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'File required' });
    const doc = await prisma.complianceDocument.create({
      data: {
        title: req.body.title || req.file.originalname,
        docType: req.body.docType || 'OTHER',
        fileUrl: `/uploads/documents/${req.file.filename}`,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
        notes: req.body.notes,
        facilityId: req.user!.facilityId || '',
        tenantId: req.user!.tenantId,
      },
    });
    res.status(201).json({ success: true, document: doc });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// List documents
router.get('/', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const docs = await prisma.complianceDocument.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { uploadedAt: 'desc' },
    });

    // Flag expiring documents
    const now = new Date();
    const withAlerts = docs.map((d: any) => {
      let alert = null;
      if (d.expiryDate) {
        const days = Math.floor((d.expiryDate.getTime() - now.getTime()) / 86400000);
        if (days < 0) alert = 'EXPIRED';
        else if (days <= 30) alert = 'EXPIRING_SOON';
        else if (days <= 90) alert = 'EXPIRING';
      }
      return { ...d, alert, daysToExpiry: d.expiryDate ? Math.floor((d.expiryDate.getTime() - now.getTime()) / 86400000) : null };
    });

    res.json({ success: true, documents: withAlerts });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Delete document
router.delete('/:id', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.complianceDocument.delete({ where: { id: p(req.params.id) } });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
