/**
 * PureGro Premium Cannabis Care - Client Routes
 *
 * GET  /clients           - List clients (admin)
 * GET  /clients/me        - Get current client profile
 * GET  /clients/:id       - Get client by ID (admin or own)
 * GET  /clients/:id/orders - Get client order history
 * GET  /clients/:id/events - Get client event log
 */

import { Router, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware';
import * as db from '../db';

const router = Router();

// ── List clients (admin only) ───────────────────────────────

router.get(
  '/',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined;
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const clients = await db.listClients(status, limit, offset);
      res.json({ clients, count: clients.length });
    } catch (err) {
      next(err);
    }
  },
);

// ── Get current client (self) ───────────────────────────────

router.get(
  '/me',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const client = await db.getClientById(req.authUser!.clientId);
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      res.json({ client });
    } catch (err) {
      next(err);
    }
  },
);

// ── Get client by ID ────────────────────────────────────────

router.get(
  '/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;

      // Non-admins can only see their own profile
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
      const isAdmin = adminEmails.includes(req.authUser!.email.toLowerCase());
      if (!isAdmin && req.authUser!.clientId !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const client = await db.getClientById(id);
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      res.json({ client });
    } catch (err) {
      next(err);
    }
  },
);

// ── Get client orders ───────────────────────────────────────

router.get(
  '/:id/orders',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;

      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
      const isAdmin = adminEmails.includes(req.authUser!.email.toLowerCase());
      if (!isAdmin && req.authUser!.clientId !== id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const orderLimit = Number(req.query.limit) || 50;
      const orders = await db.getOrdersByClient(id, orderLimit);
      res.json({ orders, count: orders.length });
    } catch (err) {
      next(err);
    }
  },
);

// ── Get client event log (admin only) ───────────────────────

router.get(
  '/:id/events',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const eventLimit = Number(req.query.limit) || 50;
      const events = await db.getEventLog(id, eventLimit);
      res.json({ events, count: events.length });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
