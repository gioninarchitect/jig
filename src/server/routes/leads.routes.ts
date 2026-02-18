/**
 * JIG Craft Cannabis - Leads Routes (Admin only)
 *
 * GET /leads - List leads with optional tier/status filters
 */

import { Router, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware';
import * as db from '../db';

const router = Router();

router.get(
  '/',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tier, status, limit, offset } = req.query;
      const leads = await db.listLeads(
        tier as string | undefined,
        status as string | undefined,
        Number(limit) || 50,
        Number(offset) || 0,
      );
      res.json({ leads, count: leads.length });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
