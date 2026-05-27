/**
 * PureGro - B2B Stats API
 *
 * Exposes aggregate B2B wholesale KPIs for the POS owner dashboard.
 * Auth: X-Internal-Key header (server-to-server from nginx proxy).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../db';

const router = Router();

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'puregro_internal_2026';

/** Verify X-Internal-Key header. */
function requireInternalKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-internal-key'] as string | undefined;
  if (!key || key !== INTERNAL_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.get(
  '/',
  requireInternalKey,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Run all queries in parallel
      const [
        clientsResult,
        activeClientsResult,
        mtdOrdersResult,
        prevMonthResult,
        pendingResult,
        overdueResult,
        allTimeResult,
      ] = await Promise.all([
        // Total clients
        pool.query('SELECT COUNT(*)::int AS count FROM clients'),
        // Active clients (ordered in last 90 days)
        pool.query(
          `SELECT COUNT(DISTINCT client_id)::int AS count FROM orders
           WHERE created_at >= NOW() - INTERVAL '90 days'`,
        ),
        // MTD orders
        pool.query(
          `SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0)::numeric AS revenue
           FROM orders WHERE created_at >= $1`,
          [monthStart],
        ),
        // Previous month (for growth calc)
        pool.query(
          `SELECT COALESCE(SUM(total), 0)::numeric AS revenue
           FROM orders WHERE created_at >= $1 AND created_at < $2`,
          [prevMonthStart, monthStart],
        ),
        // Pending orders
        pool.query(
          `SELECT COUNT(*)::int AS count FROM orders WHERE status = 'pending'`,
        ),
        // Overdue payments
        pool.query(
          `SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0)::numeric AS amount
           FROM orders WHERE payment_status = 'overdue'`,
        ),
        // All-time totals
        pool.query(
          `SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0)::numeric AS revenue
           FROM orders`,
        ),
      ]);

      const mtdRevenue = Number(mtdOrdersResult.rows[0].revenue);
      const prevRevenue = Number(prevMonthResult.rows[0].revenue);
      const growth = prevRevenue > 0
        ? Math.round(((mtdRevenue - prevRevenue) / prevRevenue) * 100)
        : mtdRevenue > 0 ? 100 : 0;

      res.json({
        clients: {
          total: clientsResult.rows[0].count,
          active: activeClientsResult.rows[0].count,
        },
        orders: {
          mtdCount: mtdOrdersResult.rows[0].count,
          mtdRevenue,
          pending: pendingResult.rows[0].count,
          overdue: overdueResult.rows[0].count,
          overdueAmount: Number(overdueResult.rows[0].amount),
        },
        growth,
        allTime: {
          orderCount: allTimeResult.rows[0].count,
          revenue: Number(allTimeResult.rows[0].revenue),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
