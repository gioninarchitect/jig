/**
 * PureGro Premium Cannabis Care - Event Routes
 *
 * POST /events/order-placed       - Emit ORDER_PLACED event
 * POST /events/order-confirmed    - Emit ORDER_CONFIRMED event
 * POST /events/order-shipped      - Emit ORDER_SHIPPED event
 * POST /events/order-delivered    - Emit ORDER_DELIVERED event
 * POST /events/order-cancelled    - Emit ORDER_CANCELLED event
 * POST /events/payment-received   - Emit PAYMENT_RECEIVED event
 * POST /events/payment-overdue    - Emit PAYMENT_OVERDUE event
 * POST /events/product-viewed     - Emit PRODUCT_VIEWED event
 * POST /events/cart-abandoned     - Emit CART_ABANDONED event
 * POST /events/complaint          - Emit COMPLAINT_RECEIVED event
 * POST /events/feedback           - Emit FEEDBACK_RECEIVED event
 */

import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware';
import * as db from '../db';
import { loadClientWorldState } from './intelligence.routes';
import {
  clientWorldReducer,
  detectAllPatterns,
  generateInterventions,
} from '../../world-model';
import {
  emitOrderPlaced,
  emitOrderConfirmed,
  emitOrderShipped,
  emitOrderDelivered,
  emitOrderCancelled,
  emitPaymentReceived,
  emitPaymentOverdue,
  emitProductViewed,
  emitCartAbandoned,
  emitComplaintReceived,
  emitFeedbackReceived,
} from '../../world-model';
import type { ClientWorldEvent } from '../../world-model/types';

const router = Router();

// ── Helper: process event, update state, detect patterns ────

async function processEvent(
  clientId: string,
  event: ClientWorldEvent,
): Promise<{ state: Record<string, unknown>; newPatterns: number; newInterventions: number }> {
  const currentState = await loadClientWorldState(clientId);
  if (!currentState) throw new Error('Client not found');

  const newState = clientWorldReducer(currentState, event);
  const patterns = detectAllPatterns(newState);
  const interventions = generateInterventions(newState);

  await db.upsertWorldState(clientId, newState);
  await db.upsertPatterns(clientId, patterns);
  await db.logEvent(clientId, event.type, event as unknown as Record<string, unknown>);

  for (const intervention of interventions) {
    await db.insertIntervention(clientId, intervention);
  }

  return {
    state: { churnRisk: newState.relationship.churnRisk, tier: newState.relationship.tier },
    newPatterns: patterns.length,
    newInterventions: interventions.length,
  };
}

// ── Order Events ────────────────────────────────────────────

router.post(
  '/order-placed',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, items, subtotal, total, paymentMethod } = req.body;
      const clientId = req.authUser!.clientId;

      if (!orderId || !items || !subtotal || !total) {
        res.status(400).json({ error: 'orderId, items, subtotal, total are required' });
        return;
      }

      const event: ClientWorldEvent = {
        type: 'ORDER_PLACED',
        orderId,
        items,
        subtotal,
        total,
        paymentMethod: paymentMethod || 'eft',
      };

      emitOrderPlaced(orderId, items, subtotal, total, paymentMethod || 'eft');

      const result = await processEvent(clientId, event);
      res.json({ message: 'Order placed event processed', ...result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/order-confirmed',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.body;
      const clientId = req.authUser!.clientId;

      const event: ClientWorldEvent = { type: 'ORDER_CONFIRMED', orderId };
      emitOrderConfirmed(orderId);

      const result = await processEvent(clientId, event);
      res.json({ message: 'Order confirmed event processed', ...result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/order-shipped',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, trackingNumber } = req.body;
      const clientId = req.authUser!.clientId;

      const event: ClientWorldEvent = {
        type: 'ORDER_SHIPPED',
        orderId,
        trackingNumber: trackingNumber || '',
      };

      emitOrderShipped(orderId, trackingNumber || '');

      const result = await processEvent(clientId, event);
      res.json({ message: 'Order shipped event processed', ...result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/order-delivered',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.body;
      const clientId = req.authUser!.clientId;

      const event: ClientWorldEvent = { type: 'ORDER_DELIVERED', orderId };
      emitOrderDelivered(orderId);

      const result = await processEvent(clientId, event);
      res.json({ message: 'Order delivered event processed', ...result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/order-cancelled',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, reason } = req.body;
      const clientId = req.authUser!.clientId;

      const event: ClientWorldEvent = {
        type: 'ORDER_CANCELLED',
        orderId,
        reason: reason || 'Client requested',
      };

      emitOrderCancelled(orderId, reason || 'Client requested');

      const result = await processEvent(clientId, event);
      res.json({ message: 'Order cancelled event processed', ...result });
    } catch (err) {
      next(err);
    }
  },
);

// ── Payment Events ──────────────────────────────────────────

router.post(
  '/payment-received',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, amount, method } = req.body;
      const clientId = req.authUser!.clientId;

      const event: ClientWorldEvent = {
        type: 'PAYMENT_RECEIVED',
        orderId,
        amount,
        method: method || 'eft',
      };

      emitPaymentReceived(orderId, amount, method || 'eft');

      const result = await processEvent(clientId, event);
      res.json({ message: 'Payment received event processed', ...result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/payment-overdue',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId, daysOverdue, amount } = req.body;
      const clientId = req.authUser!.clientId;

      const event: ClientWorldEvent = {
        type: 'PAYMENT_OVERDUE',
        orderId,
        daysOverdue,
        amount,
      };

      emitPaymentOverdue(orderId, daysOverdue, amount);

      const result = await processEvent(clientId, event);
      res.json({ message: 'Payment overdue event processed', ...result });
    } catch (err) {
      next(err);
    }
  },
);

// ── Behavioral Events ───────────────────────────────────────

router.post(
  '/product-viewed',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { productId, duration } = req.body;
      const clientId = req.authUser!.clientId;

      const event: ClientWorldEvent = {
        type: 'PRODUCT_VIEWED',
        productId,
        duration: duration || 0,
      };

      emitProductViewed(productId, duration || 0);

      const result = await processEvent(clientId, event);
      res.json({ message: 'Product viewed event processed', ...result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/cart-abandoned',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { items, totalValue } = req.body;
      const clientId = req.authUser!.clientId;

      const event: ClientWorldEvent = {
        type: 'CART_ABANDONED',
        items: items || [],
        totalValue: totalValue || 0,
      };

      emitCartAbandoned(items || [], totalValue || 0);

      const result = await processEvent(clientId, event);
      res.json({ message: 'Cart abandoned event processed', ...result });
    } catch (err) {
      next(err);
    }
  },
);

// ── Relationship Events ─────────────────────────────────────

router.post(
  '/complaint',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { category, severity } = req.body;
      const clientId = req.authUser!.clientId;

      const event: ClientWorldEvent = {
        type: 'COMPLAINT_RECEIVED',
        category,
        severity: severity || 'medium',
      };

      emitComplaintReceived(category, severity || 'medium');

      const result = await processEvent(clientId, event);
      res.json({ message: 'Complaint event processed', ...result });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/feedback',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { score, comment } = req.body;
      const clientId = req.authUser!.clientId;

      const event: ClientWorldEvent = {
        type: 'FEEDBACK_RECEIVED',
        score,
        comment: comment || '',
      };

      emitFeedbackReceived(score, comment || '');

      const result = await processEvent(clientId, event);
      res.json({ message: 'Feedback event processed', ...result });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
