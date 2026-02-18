/**
 * JIG Craft Cannabis - Order Routes
 *
 * POST   /orders                      - Create a new order
 * GET    /orders                      - List all orders (admin, with filters)
 * GET    /orders/admin/pending-pops   - All pending POP reviews (admin)
 * GET    /orders/:id                  - Get order by ID
 * PATCH  /orders/:id/status           - Update order status (legacy)
 * PATCH  /orders/:id/payment          - Update payment status
 * PATCH  /orders/:id/confirm          - Confirm order + assign invoice (admin)
 * PATCH  /orders/:id/ship             - Ship order with courier info (admin)
 * PATCH  /orders/:id/deliver          - Mark delivered (admin)
 * GET    /orders/:id/invoice-data     - Invoice data for rendering (auth)
 * POST   /orders/:id/pop              - Upload proof of payment (auth)
 * GET    /orders/:id/pop              - List POPs for order (auth)
 * PATCH  /orders/:id/pop/:popId/review - Approve/reject POP (admin)
 */

import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware';
import * as db from '../db';
import { VAT_RATE } from '../../world-model/types';
import { sendOrderNotification } from '../email';

const router = Router();

// ── Multer config for POP uploads ─────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'pop');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed'));
    }
  },
});

// ── Helper: check admin ─────────────────────────────────────

function isAdminUser(req: AuthenticatedRequest): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
  return adminEmails.includes(req.authUser!.email.toLowerCase());
}

// ── Create order ────────────────────────────────────────────

router.post(
  '/',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { items, paymentMethod, deliveryNotes } = req.body;
      const clientId = req.authUser!.clientId;

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'At least one item is required' });
        return;
      }

      const client = await db.getClientById(clientId);
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      let subtotal = 0;
      const resolvedItems = [];

      for (const item of items) {
        const product = await db.getProductById(item.productId);
        if (!product) {
          res.status(400).json({ error: `Product ${item.productId} not found` });
          return;
        }
        if (!product.isActive) {
          res.status(400).json({ error: `Product ${product.name} is not available` });
          return;
        }

        const qty = Number(item.quantity);

        // Match price tier by client tier name, fall back to quantity-based
        const clientTierLabel = client.tier.charAt(0).toUpperCase() + client.tier.slice(1);
        const tierByName = product.priceTiers.find((t) => t.tierName === clientTierLabel);
        const tierByQty = [...product.priceTiers]
          .sort((a, b) => b.minQuantity - a.minQuantity)
          .find((t) => qty >= t.minQuantity);
        const applicableTier = tierByName ?? tierByQty;

        const unitPrice = applicableTier?.price ?? product.costPrice * 2;
        const totalPrice = unitPrice * qty;
        subtotal += totalPrice;

        resolvedItems.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          quantity: qty,
          unitPrice,
          totalPrice,
        });
      }

      const vatAmount = subtotal * VAT_RATE;
      const total = subtotal + vatAmount;

      // Generate unique order ID from total count
      const { total: orderCount } = await db.listAllOrders({ limit: 0 });
      const orderId = `JIG-${String(orderCount + 1).padStart(6, '0')}`;

      const deliveryAddr = client.deliveryAddress ?? client.address ?? {
        street: '', city: '', province: '', postalCode: '', country: 'South Africa',
      };

      const order = await db.createOrder({
        id: orderId,
        clientId,
        items: resolvedItems,
        subtotal,
        vatAmount,
        total,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: paymentMethod || 'eft',
        deliveryAddress: deliveryAddr,
        deliveryNotes: deliveryNotes ?? undefined,
      });

      // Send order notification email to admin (non-blocking)
      sendOrderNotification(order, client).catch(() => {});

      res.status(201).json({ order });
    } catch (err) {
      next(err);
    }
  },
);

// ── List all orders (admin) ─────────────────────────────────

router.get(
  '/',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status, paymentStatus, search, limit, offset } = req.query;
      const result = await db.listAllOrders({
        status: status as string | undefined,
        paymentStatus: paymentStatus as string | undefined,
        search: search as string | undefined,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json({ orders: result.orders, total: result.total });
    } catch (err) {
      next(err);
    }
  },
);

// ── Get pending POPs (admin) ────────────────────────────────

router.get(
  '/admin/pending-pops',
  requireAuth as never,
  requireAdmin as never,
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const pops = await db.getPendingPops();
      res.json({ pops, count: pops.length });
    } catch (err) {
      next(err);
    }
  },
);

// ── Get order ───────────────────────────────────────────────

router.get(
  '/:id',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const order = await db.getOrderById(req.params.id as string);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      if (!isAdminUser(req) && order.clientId !== req.authUser!.clientId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json({ order });
    } catch (err) {
      next(err);
    }
  },
);

// ── Confirm order (admin) ───────────────────────────────────

router.patch(
  '/:id/confirm',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.id as string;
      const existing = await db.getOrderById(orderId);
      if (!existing) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      await db.updateOrderStatus(orderId, 'confirmed');
      const invoiceNumber = await db.assignInvoiceNumber(orderId);
      const order = await db.getOrderById(orderId);

      res.json({ order, invoiceNumber });
    } catch (err) {
      next(err);
    }
  },
);

// ── Ship order (admin) ──────────────────────────────────────

router.patch(
  '/:id/ship',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.id as string;
      const { courierName, trackingNumber } = req.body;

      const existing = await db.getOrderById(orderId);
      if (!existing) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      await db.updateOrderStatus(orderId, 'shipped', { courierName, trackingNumber });
      const order = await db.getOrderById(orderId);

      res.json({ order });
    } catch (err) {
      next(err);
    }
  },
);

// ── Mark delivered (admin) ──────────────────────────────────

router.patch(
  '/:id/deliver',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.id as string;
      const existing = await db.getOrderById(orderId);
      if (!existing) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      await db.updateOrderStatus(orderId, 'delivered');
      const order = await db.getOrderById(orderId);

      res.json({ order });
    } catch (err) {
      next(err);
    }
  },
);

// ── Invoice data ────────────────────────────────────────────

router.get(
  '/:id/invoice-data',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const order = await db.getOrderById(req.params.id as string);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      if (!isAdminUser(req) && order.clientId !== req.authUser!.clientId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const client = await db.getClientById(order.clientId);

      res.json({
        order,
        client: client ? {
          companyName: client.companyName,
          tradingName: client.tradingName,
          registrationNumber: client.registrationNumber,
          vatNumber: client.vatNumber,
          contactPerson: client.contactPerson,
          email: client.email,
          phone: client.phone,
          address: client.address,
        } : null,
        company: {
          name: process.env.JIG_COMPANY_NAME || 'JIG Craft Cannabis (Pty) Ltd',
          registration: process.env.JIG_COMPANY_REG || '',
          vat: process.env.JIG_COMPANY_VAT || '',
          address: process.env.JIG_COMPANY_ADDRESS || 'Cape Town, Western Cape, South Africa',
          email: process.env.JIG_COMPANY_EMAIL || 'info@jigcannabis.com',
          phone: process.env.JIG_COMPANY_PHONE || '',
        },
        banking: {
          bankName: process.env.JIG_BANK_NAME || 'First National Bank',
          accountName: process.env.JIG_BANK_ACCOUNT_NAME || 'JIG Craft Cannabis (Pty) Ltd',
          accountNumber: process.env.JIG_BANK_ACCOUNT_NUMBER || '',
          branchCode: process.env.JIG_BANK_BRANCH_CODE || '',
          reference: process.env.JIG_BANK_REFERENCE || 'Use your PO number as reference',
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── Upload POP ──────────────────────────────────────────────

router.post(
  '/:id/pop',
  requireAuth as never,
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'File too large. Maximum 10MB allowed.' });
            return;
          }
        }
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.id as string;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const order = await db.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      if (!isAdminUser(req) && order.clientId !== req.authUser!.clientId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const pop = await db.createPopUpload({
        orderId,
        clientId: req.authUser!.clientId,
        fileName: file.originalname,
        filePath: `/uploads/pop/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
      });

      res.status(201).json({ pop });
    } catch (err) {
      next(err);
    }
  },
);

// ── List POPs for order ─────────────────────────────────────

router.get(
  '/:id/pop',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.id as string;
      const order = await db.getOrderById(orderId);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      if (!isAdminUser(req) && order.clientId !== req.authUser!.clientId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const pops = await db.getPopsByOrder(orderId);
      res.json({ pops, count: pops.length });
    } catch (err) {
      next(err);
    }
  },
);

// ── Review POP (admin) ──────────────────────────────────────

router.patch(
  '/:id/pop/:popId/review',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status, adminNotes } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        res.status(400).json({ error: 'Status must be approved or rejected' });
        return;
      }

      const pop = await db.reviewPop(
        req.params.popId as string,
        status,
        adminNotes ?? null,
        req.authUser!.clientId,
      );

      // If approved, update order payment to paid
      if (status === 'approved') {
        await db.updateOrderPayment(req.params.id as string, 'paid', Date.now());
      }

      res.json({ pop });
    } catch (err) {
      next(err);
    }
  },
);

// ── Update order status (legacy) ────────────────────────────

router.patch(
  '/:id/status',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status, trackingNumber } = req.body;
      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        return;
      }

      await db.updateOrderStatus(req.params.id as string, status, { trackingNumber });
      const order = await db.getOrderById(req.params.id as string);

      res.json({ order });
    } catch (err) {
      next(err);
    }
  },
);

// ── Update payment status ───────────────────────────────────

router.patch(
  '/:id/payment',
  requireAuth as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { paymentStatus } = req.body;
      const validStatuses = ['pending', 'partial', 'paid', 'overdue', 'refunded'];

      if (!validStatuses.includes(paymentStatus)) {
        res.status(400).json({ error: `Invalid payment status. Must be one of: ${validStatuses.join(', ')}` });
        return;
      }

      const paidAt = paymentStatus === 'paid' ? Date.now() : undefined;
      await db.updateOrderPayment(req.params.id as string, paymentStatus, paidAt);
      const order = await db.getOrderById(req.params.id as string);

      res.json({ order });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
