/**
 * JIG Craft Cannabis - Intelligence Routes
 *
 * GET /intelligence/client/:id        - Full client world state
 * GET /intelligence/churn/:id         - Churn analysis
 * GET /intelligence/restock/:id       - Restock predictions
 * GET /intelligence/recommendations/:id - Product recommendations
 * GET /intelligence/interventions/:id  - Active interventions
 * GET /intelligence/tier/:id          - Tier analysis
 * GET /intelligence/payment-risk/:id  - Payment risk assessment
 * GET /intelligence/revenue/:id       - Revenue forecast
 * GET /intelligence/patterns/:id      - Detected patterns
 * GET /intelligence/summary/:id       - Full intelligence summary
 */

import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest, requireAdmin } from '../middleware';
import * as db from '../db';
import {
  createInitialClientState,
  clientWorldReducer,
  analyzeChurnRisk,
  predictRestock,
  generateProductRecommendations,
  analyzeTierStatus,
  assessPaymentRisk,
  forecastRevenue,
  recommendContactTime,
  detectAllPatterns,
  generateInterventions,
} from '../../world-model';
import { computeIntelligenceSummary } from '../../world-model/intelligence-summary';
import type { ClientWorldState } from '../../world-model/types';

const router = Router();

// ── Helpers ─────────────────────────────────────────────────

/**
 * Load the full ClientWorldState for a given client.
 * Pulls from DB world state + orders + patterns.
 */
async function loadClientWorldState(
  clientId: string,
): Promise<ClientWorldState | null> {
  const client = await db.getClientById(clientId);
  if (!client) return null;

  const orders = await db.getOrdersByClient(clientId, 200);
  const patterns = await db.getPatterns(clientId);
  const interventions = await db.getActiveInterventions(clientId);

  // Start with initial state, then hydrate from DB
  const state = createInitialClientState(clientId, client);

  // Hydrate from orders (replay to populate computed fields)
  let hydrated = state;
  for (const order of orders.reverse()) {
    hydrated = clientWorldReducer(hydrated, {
      type: 'ORDER_PLACED',
      orderId: order.id,
      items: order.items,
      subtotal: order.subtotal,
      total: order.total,
      paymentMethod: order.paymentMethod,
    });

    if (order.paymentStatus === 'paid' && order.paidAt) {
      hydrated = clientWorldReducer(hydrated, {
        type: 'PAYMENT_RECEIVED',
        orderId: order.id,
        amount: order.total,
        method: order.paymentMethod,
      });
    }

    if (order.paymentStatus === 'overdue') {
      hydrated = clientWorldReducer(hydrated, {
        type: 'PAYMENT_OVERDUE',
        orderId: order.id,
        daysOverdue: Math.ceil(
          (Date.now() - (order.paymentDueDate ?? order.createdAt)) / 86_400_000,
        ),
        amount: order.total,
      });
    }

    if (order.status === 'confirmed') {
      hydrated = clientWorldReducer(hydrated, {
        type: 'ORDER_CONFIRMED',
        orderId: order.id,
      });
    }

    if (order.status === 'shipped') {
      hydrated = clientWorldReducer(hydrated, {
        type: 'ORDER_SHIPPED',
        orderId: order.id,
        trackingNumber: order.trackingNumber || '',
      });
    }

    if (order.status === 'delivered') {
      hydrated = clientWorldReducer(hydrated, {
        type: 'ORDER_DELIVERED',
        orderId: order.id,
      });
    }
  }

  // Overlay persisted patterns and interventions
  hydrated = { ...hydrated, patterns, interventions };

  return hydrated;
}

/**
 * Guard: ensure the authenticated client can only access their own data,
 * unless they are an admin.
 */
function canAccessClient(req: AuthenticatedRequest, clientId: string): boolean {
  if (!req.authUser) return false;
  // Own data is always accessible
  if (req.authUser.clientId === clientId) return true;
  // Admins can access any client
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
  return adminEmails.includes(req.authUser.email.toLowerCase());
}

// ── Routes ──────────────────────────────────────────────────

// Full client world state
router.get(
  '/client/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!canAccessClient(req, id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const state = await loadClientWorldState(id);
      if (!state) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      // Persist updated state back to DB
      await db.upsertWorldState(id, state);

      res.json({ clientId: id, state });
    } catch (err) {
      next(err);
    }
  },
);

// Churn analysis
router.get(
  '/churn/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!canAccessClient(req, id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const state = await loadClientWorldState(id);
      if (!state) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      const analysis = analyzeChurnRisk(state);
      res.json({ clientId: id, churn: analysis });
    } catch (err) {
      next(err);
    }
  },
);

// Restock predictions
router.get(
  '/restock/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!canAccessClient(req, id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const state = await loadClientWorldState(id);
      if (!state) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      const predictions = predictRestock(state);
      res.json({ clientId: id, predictions });
    } catch (err) {
      next(err);
    }
  },
);

// Product recommendations
router.get(
  '/recommendations/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!canAccessClient(req, id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const state = await loadClientWorldState(id);
      if (!state) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      const allProducts = await db.listProducts(true);
      const recommendations = generateProductRecommendations(state, allProducts);
      res.json({ clientId: id, recommendations });
    } catch (err) {
      next(err);
    }
  },
);

// Active interventions
router.get(
  '/interventions/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!canAccessClient(req, id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const state = await loadClientWorldState(id);
      if (!state) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      const interventions = generateInterventions(state);

      // Persist new interventions to DB
      for (const intervention of interventions) {
        await db.insertIntervention(id, intervention);
      }

      res.json({ clientId: id, interventions });
    } catch (err) {
      next(err);
    }
  },
);

// Tier analysis
router.get(
  '/tier/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!canAccessClient(req, id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const state = await loadClientWorldState(id);
      if (!state) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      const analysis = analyzeTierStatus(state);
      res.json({ clientId: id, tier: analysis });
    } catch (err) {
      next(err);
    }
  },
);

// Payment risk
router.get(
  '/payment-risk/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!canAccessClient(req, id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const state = await loadClientWorldState(id);
      if (!state) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      const risk = assessPaymentRisk(state);
      res.json({ clientId: id, paymentRisk: risk });
    } catch (err) {
      next(err);
    }
  },
);

// Revenue forecast
router.get(
  '/revenue/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!canAccessClient(req, id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const state = await loadClientWorldState(id);
      if (!state) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      const forecast = forecastRevenue(state);
      res.json({ clientId: id, forecast });
    } catch (err) {
      next(err);
    }
  },
);

// Detected patterns
router.get(
  '/patterns/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!canAccessClient(req, id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const state = await loadClientWorldState(id);
      if (!state) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      const detected = detectAllPatterns(state);

      // Persist patterns
      await db.upsertPatterns(id, detected);

      res.json({ clientId: id, patterns: detected });
    } catch (err) {
      next(err);
    }
  },
);

// Full intelligence summary (admin)
router.get(
  '/summary/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!canAccessClient(req, id)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const state = await loadClientWorldState(id);
      if (!state) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      const summary = computeIntelligenceSummary(state);
      const contactRec = recommendContactTime(state);

      res.json({
        clientId: id,
        summary,
        contactRecommendation: contactRec,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
export { loadClientWorldState };
