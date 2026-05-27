/**
 * PureGro Premium Cannabis Care - Product Routes
 *
 * Proxies product data from the JIGPOS MDC (Master Digital Catalog).
 * MDC is the single source of truth — only products with mdcStage='live'
 * are exposed to B2B clients.
 *
 * GET /products          - List all live MDC products
 * GET /products/:id      - Get single product by MDC _id
 */

import { Router, Response, NextFunction } from 'express';
import { optionalAuth, AuthenticatedRequest } from '../middleware';

const router = Router();

const POS_API_URL = (process.env.POS_API_URL || 'http://127.0.0.1:3004').replace(/\/$/, '');
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'puregro_internal_2026';

// ── Shape Mapper: JIGPOS Product → B2B ProductData ──────

interface JigProduct {
  _id: string;
  id?: string;
  sku: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  track?: string;
  price: number;
  wholesalePrice?: number;
  costPrice?: number;
  wholesaleTiers?: { minQty: number; pricePerUnit: number }[];
  inventory?: { quantity?: number };
  status?: string;
  mdcStage?: string;
  strain?: string;
  thcContent?: string;
  cbdContent?: string;
  images?: { url?: string; alt?: string; isPrimary?: boolean }[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function mapProduct(p: JigProduct) {
  const tiers = (p.wholesaleTiers || []).map((t) => ({
    minQuantity: t.minQty,
    price: t.pricePerUnit,
    tierName: `${t.minQty}+ units`,
  }));

  // If no tiers but wholesalePrice exists, create a default tier
  if (tiers.length === 0 && p.wholesalePrice) {
    tiers.push({ minQuantity: 1, price: p.wholesalePrice, tierName: 'Wholesale' });
  }

  return {
    id: p._id || p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    subcategory: p.subcategory || undefined,
    strain: p.strain || 'na',
    thcContent: p.thcContent || undefined,
    cbdContent: p.cbdContent || undefined,
    description: p.description || '',
    unit: 'units' as const,
    costPrice: p.wholesalePrice ?? p.costPrice ?? p.price,
    isActive: p.status === 'active',
    stockQuantity: p.inventory?.quantity ?? 0,
    priceTiers: tiers,
  };
}

// ── List products (from MDC) ─────────────────────────────

router.get(
  '/',
  optionalAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;

      // Fetch from JIGPOS MDC
      const url = new URL(`${POS_API_URL}/api/v1/products`);
      url.searchParams.set('limit', '500');
      if (category) url.searchParams.set('category', category);

      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json', 'X-Internal-Key': INTERNAL_API_KEY },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        console.error(`[Products] MDC fetch failed: ${response.status} ${response.statusText}`);
        res.status(502).json({ error: 'Product catalog temporarily unavailable' });
        return;
      }

      const data = await response.json() as { products?: JigProduct[] };
      const raw = data.products || [];

      // Filter to only MDC 'live' stage products
      const live = raw.filter((p) => p.mdcStage === 'live' && p.status === 'active');

      // Map to B2B shape
      const products = live.map(mapProduct);

      // Strip costPrice for non-admin
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
      const isAdmin = req.authUser && adminEmails.includes(req.authUser.email.toLowerCase());

      const sanitised = products.map((p) => {
        if (isAdmin) return p;
        const { costPrice: _cost, ...rest } = p;
        return rest;
      });

      res.json({ products: sanitised, count: sanitised.length });
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        console.error('[Products] MDC request timed out');
        res.status(504).json({ error: 'Product catalog request timed out' });
        return;
      }
      next(err);
    }
  },
);

// ── Get single product (from MDC) ────────────────────────

router.get(
  '/:id',
  optionalAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Fetch all products and find by ID (JIGPOS doesn't expose /products/:id publicly)
      const url = new URL(`${POS_API_URL}/api/v1/products`);
      url.searchParams.set('limit', '500');

      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json', 'X-Internal-Key': INTERNAL_API_KEY },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        res.status(502).json({ error: 'Product catalog temporarily unavailable' });
        return;
      }

      const data = await response.json() as { products?: JigProduct[] };
      const raw = data.products || [];
      const found = raw.find((p) => (p._id || p.id) === id);

      if (!found || found.mdcStage !== 'live') {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const product = mapProduct(found);

      // Strip costPrice for non-admin
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
      const isAdmin = req.authUser && adminEmails.includes(req.authUser.email.toLowerCase());

      if (!isAdmin) {
        const { costPrice: _cost, ...rest } = product;
        res.json({ product: rest });
        return;
      }

      res.json({ product });
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        res.status(504).json({ error: 'Product catalog request timed out' });
        return;
      }
      next(err);
    }
  },
);

export default router;
