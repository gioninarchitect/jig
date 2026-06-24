import { Router, Response } from 'express';
import { requireAuth, requireLevel, requireRole, AuthRequest } from '../middleware/auth';
import { generateSiteMasterFile } from '../services/sitemasterfile.service';
import * as smfSections from '../services/smf-sections.service';
import * as composer from '../services/smf-composer.service';
import { p } from '../utils/params';

// =====================================================================
// /api/site-master-file
//
// Two layers:
//   • GET /            → live-derived snapshot (legacy projection view)
//   • /sections/*      → canonical SMFSection rows + sign-off chain
// =====================================================================

const router = Router();
router.use(requireAuth);

// Live-derived snapshot (kept for backward compat and PDF export)
router.get('/', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const smf = await generateSiteMasterFile(req.user!.tenantId);
    res.json({ success: true, smf });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ── Canonical sections ───────────────────────────────────────────────

router.get('/sections', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const unit = (req.query.unit as string) || 'cannabis';
    const [sections, summary] = await Promise.all([
      smfSections.listSections(req.user!.tenantId, unit),
      smfSections.summary(req.user!.tenantId, unit),
    ]);
    res.json({ success: true, sections, summary });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/sections/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const section = await smfSections.getSection(p(req.params.id), req.user!.tenantId);
    if (!section) return res.status(404).json({ success: false, error: 'Section not found' });
    res.json({ success: true, section });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Edit section body (RP+ — resets sign-off chain)
router.patch('/sections/:id', requireLevel(4), async (req: AuthRequest, res: Response) => {
  try {
    const { bodyText } = req.body;
    if (typeof bodyText !== 'string') return res.status(400).json({ success: false, error: 'bodyText required' });
    const section = await smfSections.updateBody(p(req.params.id), req.user!.tenantId, bodyText);
    res.json({ success: true, section });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// Sign-off chain — strict order: RP → DAR → AR
router.post('/sections/:id/sign-rp', requireRole('RESPONSIBLE_PHARMACIST'), async (req: AuthRequest, res: Response) => {
  try {
    const section = await smfSections.signSection(p(req.params.id), req.user!.tenantId, 'RP', req.user!.userId, req.body?.notes);
    res.json({ success: true, section });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/sections/:id/sign-dar', requireRole('TENANT_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const section = await smfSections.signSection(p(req.params.id), req.user!.tenantId, 'DAR', req.user!.userId, req.body?.notes);
    res.json({ success: true, section });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/sections/:id/approve-ar', requireRole('TENANT_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const section = await smfSections.signSection(p(req.params.id), req.user!.tenantId, 'AR', req.user!.userId, req.body?.notes);
    res.json({ success: true, section });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── AI Composer (Opus 4.7) ──────────────────────────────────────
// On demand: drafts a revised section body using fresh facility data.
// RP can then apply (copy to bodyText + reset chain) or discard.
router.post('/sections/:id/compose', requireLevel(4), async (req: AuthRequest, res: Response) => {
  try {
    const result = await composer.composeSectionDraft(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[SMF Composer] failed:', err);
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

router.post('/sections/:id/apply-draft', requireLevel(4), async (req: AuthRequest, res: Response) => {
  try {
    const section = await composer.applyDraft(p(req.params.id), req.user!.tenantId, req.user!.userId);
    res.json({ success: true, section });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/sections/:id/discard-draft', requireLevel(4), async (req: AuthRequest, res: Response) => {
  try {
    const section = await composer.discardDraft(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, section });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

export default router;
