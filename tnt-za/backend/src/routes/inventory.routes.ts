import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as inv from '../services/inventory.service';

// =====================================================================
// Cultivation inventory / stock — /api/inventory/* (Loraine, replaces paper)
//   items · movements (IN/OUT) · chemical register · alerts
//   Balance auto-maintained; corrections require a reason + full audit.
// =====================================================================

const router = Router();
router.use(requireAuth);

const uname = (req: AuthRequest) => (req.user as any)?.name || (req.user as any)?.email?.split('@')[0] || 'staff';
const toDate = (s?: string) => (s ? new Date(s) : undefined);

// ── Items ──
router.get('/items', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.facilityId) await inv.ensureSeedItems(req.user!.tenantId, req.user!.facilityId);
    res.json({ success: true, items: await inv.listItems(req.user!.tenantId, p(req.query.category as string)) });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/items', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.body?.name?.trim() || !inv.CATEGORIES.includes(req.body.category)) {
      return res.status(400).json({ success: false, error: 'name and a valid category are required' });
    }
    const item = await inv.createItem({
      name: req.body.name, category: req.body.category, unit: req.body.unit,
      reorderLevel: req.body.reorderLevel != null && req.body.reorderLevel !== '' ? parseFloat(req.body.reorderLevel) : undefined,
      facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.status(201).json({ success: true, item });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.patch('/items/:id', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, item: await inv.updateItem(String(req.params.id), req.body, { userId: req.user!.userId, tenantId: req.user!.tenantId }) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── Movements ──
router.get('/items/:id/movements', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, movements: await inv.listMovements(req.user!.tenantId, String(req.params.id)) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/movements', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    if (req.body.type !== 'IN' && req.body.type !== 'OUT') return res.status(400).json({ success: false, error: 'type must be IN or OUT' });
    const r = await inv.recordMovement({
      itemId: req.body.itemId, type: req.body.type, quantity: parseFloat(req.body.quantity),
      date: toDate(req.body.date), productIn: req.body.productIn, batchNumber: req.body.batchNumber,
      expiryDate: toDate(req.body.expiryDate), comment: req.body.comment,
      userId: req.user!.userId, userName: uname(req), tenantId: req.user!.tenantId,
    });
    res.status(201).json({ success: true, ...r });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.patch('/movements/:id', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, ...(await inv.updateMovement(String(req.params.id), req.body, { userId: req.user!.userId, tenantId: req.user!.tenantId })) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── Register + alerts ──
router.get('/register', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, register: await inv.getRegister(req.user!.tenantId) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.get('/alerts', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, alerts: await inv.getAlerts(req.user!.tenantId) }); }
  catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

export default router;
