/**
 * JIG Craft Cannabis - Product Routes
 *
 * GET /products          - List all active products
 * GET /products/:id      - Get product by ID
 */

import { Router, Response, NextFunction } from 'express';
import { optionalAuth, AuthenticatedRequest } from '../middleware';
import * as db from '../db';

const router = Router();

// ── List products ───────────────────────────────────────────

router.get(
  '/',
  optionalAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const activeOnly = req.query.all !== 'true';
      const products = await db.listProducts(activeOnly, category);

      // Strip cost price for non-admin requests
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
      const isAdmin = req.authUser && adminEmails.includes(req.authUser.email.toLowerCase());

      const sanitised = products.map((p) => {
        if (isAdmin) return p;
        const { costPrice: _cost, ...rest } = p;
        return rest;
      });

      res.json({ products: sanitised, count: sanitised.length });
    } catch (err) {
      next(err);
    }
  },
);

// ── Get single product ──────────────────────────────────────

router.get(
  '/:id',
  optionalAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const product = await db.getProductById(req.params.id as string);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // Strip cost price for non-admin
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
      const isAdmin = req.authUser && adminEmails.includes(req.authUser.email.toLowerCase());

      if (!isAdmin) {
        const { costPrice: _cost, ...rest } = product;
        res.json({ product: rest });
        return;
      }

      res.json({ product });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
