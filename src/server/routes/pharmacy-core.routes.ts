import { Router, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware';
import * as pharmacy from '../pharmacy-core.service';

const router = Router();
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'origin_internal_2026';

function actor(req: AuthenticatedRequest): { actorType: 'user' | 'internal'; actorId?: string; ipAddress?: string } {
  if (req.headers['x-internal-key'] === INTERNAL_API_KEY) {
    return { actorType: 'internal', ipAddress: req.ip };
  }
  return { actorType: 'user', actorId: req.authUser?.clientId ?? req.authUser?.email, ipAddress: req.ip };
}

function requireInternalOrAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.headers['x-internal-key'] === INTERNAL_API_KEY) {
    next();
    return;
  }
  void requireAuth(req, res, next);
}

function requireInternalOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.headers['x-internal-key'] === INTERNAL_API_KEY) {
    next();
    return;
  }
  requireAdmin(req, res, next);
}

const wrap = (
  fn: (req: AuthenticatedRequest, res: Response) => Promise<void>,
) => async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

router.get('/pharmacies', requireInternalOrAuth as never, wrap(async (req, res) => {
  const rows = await pharmacy.listPharmacies({ status: req.query.status as string | undefined });
  res.json({ pharmacies: rows, count: rows.length });
}));

router.post('/pharmacies', requireInternalOrAdmin as never, wrap(async (req, res) => {
  const row = await pharmacy.createPharmacy(req.body, actor(req));
  res.status(201).json({ pharmacy: row });
}));

router.post('/pharmacies/:id/documents', requireInternalOrAdmin as never, wrap(async (req, res) => {
  const row = await pharmacy.addPharmacyDocument(req.params.id as string, req.body, actor(req));
  res.status(201).json({ document: row });
}));

router.patch('/pharmacies/:id/documents/:documentId/review', requireInternalOrAdmin as never, wrap(async (req, res) => {
  const row = await pharmacy.reviewPharmacyDocument(req.params.id as string, req.params.documentId as string, req.body, actor(req));
  res.json({ document: row });
}));

router.post('/pharmacies/:id/users', requireInternalOrAdmin as never, wrap(async (req, res) => {
  const row = await pharmacy.addPharmacyUser(req.params.id as string, req.body, actor(req));
  res.status(201).json({ pharmacyUser: row });
}));

router.post('/pharmacies/:id/activate', requireInternalOrAdmin as never, wrap(async (req, res) => {
  const row = await pharmacy.activatePharmacy(req.params.id as string, actor(req));
  res.json({ pharmacy: row });
}));

router.post('/orders', requireInternalOrAuth as never, wrap(async (req, res) => {
  const row = await pharmacy.createPharmacyOrder(req.body, actor(req));
  res.status(201).json({ order: row });
}));

router.get('/orders/:id', requireInternalOrAuth as never, wrap(async (req, res) => {
  const row = await pharmacy.getPharmacyOrder(req.params.id as string);
  res.json(row);
}));

router.post('/orders/:id/payment-events', requireInternalOrAuth as never, wrap(async (req, res) => {
  const row = await pharmacy.recordPayment(req.params.id as string, req.body, actor(req));
  res.status(201).json({ paymentEvent: row });
}));

router.post('/inventory/batches', requireInternalOrAuth as never, wrap(async (req, res) => {
  const row = await pharmacy.createInventoryBatch(req.body, actor(req));
  res.status(201).json({ batch: row });
}));

router.post('/orders/:id/confirm-section21-dispensing', requireInternalOrAuth as never, wrap(async (req, res) => {
  const row = await pharmacy.confirmSection21Dispensing(req.params.id as string, req.body, actor(req));
  res.json({ order: row });
}));

router.post('/orders/:id/pack', requireInternalOrAuth as never, wrap(async (req, res) => {
  const row = await pharmacy.packOrder(req.params.id as string, req.body, actor(req));
  res.status(201).json({ package: row });
}));

router.post('/orders/:id/dispatch-to-pharmacy', requireInternalOrAuth as never, wrap(async (req, res) => {
  const row = await pharmacy.dispatchToPharmacy(req.params.id as string, req.body, actor(req));
  res.json(row);
}));

router.post('/orders/:id/pharmacy-arrival', requireInternalOrAuth as never, wrap(async (req, res) => {
  const row = await pharmacy.pharmacyArrival(req.params.id as string, req.body, actor(req));
  res.json({ order: row });
}));

router.post('/orders/:id/verify-collection-otp', requireInternalOrAuth as never, wrap(async (req, res) => {
  const result = await pharmacy.verifyCollectionOtp(req.params.id as string, String(req.body.collectionOtp), actor(req));
  res.json(result);
}));

router.post('/orders/:id/collect', requireInternalOrAuth as never, wrap(async (req, res) => {
  const result = await pharmacy.collectOrder(req.params.id as string, req.body, actor(req));
  res.json(result);
}));

router.post('/orders/:id/request-return', requireInternalOrAuth as never, wrap(async (req, res) => {
  const result = await pharmacy.requestReturn(req.params.id as string, req.body, actor(req));
  res.status(201).json(result);
}));

router.post('/orders/:id/receive-return', requireInternalOrAuth as never, wrap(async (req, res) => {
  const result = await pharmacy.receiveReturn(req.params.id as string, req.body, actor(req));
  res.json(result);
}));

router.post('/jobs/uncollected-expiry/run', requireInternalOrAdmin as never, wrap(async (req, res) => {
  const results = await pharmacy.runUncollectedExpiry(actor(req));
  res.json({ expired: results.length, results });
}));

router.post('/pharmacy-settlements', requireInternalOrAdmin as never, wrap(async (req, res) => {
  const row = await pharmacy.createSettlement(req.body.pharmacyId, req.body.periodStart, req.body.periodEnd, actor(req));
  res.status(201).json({ settlement: row });
}));

router.patch('/pharmacy-settlements/:id/status', requireInternalOrAdmin as never, wrap(async (req, res) => {
  const row = await pharmacy.updateSettlementStatus(req.params.id as string, req.body.status, actor(req));
  res.json({ settlement: row });
}));

router.get('/ledger', requireInternalOrAdmin as never, wrap(async (req, res) => {
  const rows = await pharmacy.listRows('pharmacy_ledger', { pharmacy_id: req.query.pharmacyId });
  res.json({ ledger: rows, count: rows.length });
}));

router.get('/refunds-payable', requireInternalOrAdmin as never, wrap(async (_req, res) => {
  const rows = await pharmacy.listRows('refunds_payable');
  res.json({ refunds: rows, count: rows.length });
}));

router.patch('/refunds-payable/:id/status', requireInternalOrAdmin as never, wrap(async (req, res) => {
  const row = await pharmacy.updateRefundStatus(req.params.id as string, req.body.status, actor(req));
  res.json({ refund: row });
}));

router.get('/audit-events', requireInternalOrAdmin as never, wrap(async (req, res) => {
  const rows = await pharmacy.listRows('audit_events', {
    entity_type: req.query.entityType,
    entity_id: req.query.entityId,
  });
  res.json({ events: rows, count: rows.length });
}));

export default router;
