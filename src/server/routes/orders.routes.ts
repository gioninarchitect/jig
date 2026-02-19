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
import * as chatDb from '../chat/chatDb';
import * as telegram from '../chat/telegramService';
import { emitEvent } from '../n8n/emitter';

const router = Router();

/** Send a Telegram notification to a client (non-blocking, best-effort). */
async function notifyClient(clientId: string, text: string): Promise<void> {
  try {
    const links = await chatDb.getLinksByClientId(clientId);
    for (const link of links) {
      if (link.platform === 'telegram') {
        await telegram.sendMessage(link.platformUserId, text, 'HTML');
      }
    }
  } catch (err) {
    console.error('[OrderNotify] Failed to send chat notification:', (err as Error).message);
  }
}

/** Get tracking URL for common SA couriers. */
function getCourierTrackingUrl(courier: string, tracking: string): string | null {
  const c = courier.toLowerCase();
  if (c.includes('courier guy') || c.includes('tcg')) {
    return `https://www.thecourierguy.co.za/tracking?tracking=${tracking}`;
  }
  if (c.includes('dawn wing') || c.includes('dawnwing')) {
    return `https://www.dawnwing.co.za/tools/track?waybill=${tracking}`;
  }
  if (c.includes('aramex')) {
    return `https://www.aramex.com/track/results?ShipmentNumber=${tracking}`;
  }
  if (c.includes('ram') && !c.includes('aramex')) {
    return `https://www.ram.co.za/track-and-trace/?consignmentno=${tracking}`;
  }
  if (c.includes('fastway') || c.includes('aramax')) {
    return `https://www.fastway.co.za/courier-services/track-your-parcel?l=${tracking}`;
  }
  if (c.includes('dhl')) {
    return `https://www.dhl.com/za-en/home/tracking.html?tracking-id=${tracking}`;
  }
  if (c.includes('fedex')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${tracking}`;
  }
  return null;
}

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

      // Emit n8n event
      emitEvent('order.created', {
        orderId: order.id,
        clientId,
        companyName: client.companyName,
        total: order.total,
        itemCount: resolvedItems.length,
        paymentMethod: order.paymentMethod,
      });

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

      // Notify client via Telegram with full invoice
      if (order) {
        const itemLines = order.items.map(
          (i) => `  ${i.name} x${i.quantity}  R${(i.quantity * i.unitPrice).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        );
        notifyClient(existing.clientId, [
          `<b>Order Confirmed!</b>`,
          ``,
          `<b>━━ INVOICE ━━</b>`,
          `PO: <b>${order.poNumber}</b>`,
          `Invoice: <b>${invoiceNumber}</b>`,
          `Date: ${new Date().toLocaleDateString('en-ZA')}`,
          ``,
          `<b>Items:</b>`,
          ...itemLines,
          ``,
          `Subtotal: R${order.subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `VAT (15%): R${order.vatAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          `<b>Total: R${order.total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</b>`,
          ``,
          `<b>Payment Details:</b>`,
          `Bank: ${process.env.JIG_BANK_NAME || 'FNB'}`,
          `Account: ${process.env.JIG_BANK_ACCOUNT_NAME || 'JIG Craft Cannabis'}`,
          `Acc No: ${process.env.JIG_BANK_ACCOUNT_NUMBER || 'Contact admin'}`,
          `Branch: ${process.env.JIG_BANK_BRANCH_CODE || 'Contact admin'}`,
          `Ref: ${order.poNumber}`,
          ``,
          `Full invoice: jig.cleva-ai.co.za`,
        ].join('\n')).catch(() => {});
      }

      // Emit n8n event
      emitEvent('order.confirmed', {
        orderId,
        clientId: existing.clientId,
        invoiceNumber,
        total: order?.total,
        poNumber: order?.poNumber,
        items: order?.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
      });

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

      // Notify client via Telegram with delivery details
      const shipLines = [
        `<b>Order Shipped!</b>`,
        ``,
        `Your order <b>${order?.poNumber || orderId}</b> is on its way.`,
        ``,
      ];
      if (courierName) shipLines.push(`Courier: <b>${courierName}</b>`);
      if (trackingNumber) shipLines.push(`Tracking: <b>${trackingNumber}</b>`);
      if (order?.deliveryAddress) {
        const addr = order.deliveryAddress;
        const addrStr = [addr.street, addr.city, addr.province, addr.postalCode].filter(Boolean).join(', ');
        if (addrStr) shipLines.push(`Delivering to: ${addrStr}`);
      }
      shipLines.push('');
      shipLines.push('You will be notified when your order is delivered.');
      if (trackingNumber && courierName) {
        // Common SA courier tracking URLs
        const trackingUrl = getCourierTrackingUrl(courierName, trackingNumber);
        if (trackingUrl) shipLines.push(`Track: ${trackingUrl}`);
      }
      notifyClient(existing.clientId, shipLines.join('\n')).catch(() => {});

      // Emit n8n event
      emitEvent('order.shipped', {
        orderId,
        clientId: existing.clientId,
        courierName,
        trackingNumber,
        poNumber: order?.poNumber,
      });

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

      // Notify client via Telegram
      notifyClient(existing.clientId, [
        `<b>Order Delivered!</b>`,
        ``,
        `Your order <b>${order?.poNumber || orderId}</b> has been delivered.`,
        `Thank you for your business!`,
      ].join('\n')).catch(() => {});

      // Emit n8n event
      emitEvent('order.delivered', {
        orderId,
        clientId: existing.clientId,
        poNumber: order?.poNumber,
      });

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
          address: process.env.JIG_COMPANY_ADDRESS || 'Johannesburg, Gauteng, South Africa',
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

      // Emit n8n event
      emitEvent('pop.uploaded', {
        popId: pop.id,
        orderId,
        clientId: req.authUser!.clientId,
        fileName: file.originalname,
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

      // Notify client about POP review
      const order = await db.getOrderById(req.params.id as string);
      if (order) {
        if (status === 'approved') {
          notifyClient(order.clientId, [
            `<b>Payment Verified!</b>`,
            ``,
            `Your proof of payment for order <b>${order.poNumber || order.id}</b> has been approved.`,
            `Amount: <b>R${order.total.toFixed(2)}</b>`,
          ].join('\n')).catch(() => {});
        } else {
          notifyClient(order.clientId, [
            `<b>POP Review Update</b>`,
            ``,
            `Your proof of payment for order <b>${order.poNumber || order.id}</b> was not accepted.`,
            adminNotes ? `Reason: ${adminNotes}` : 'Please upload a clearer image or correct document.',
            ``,
            `Tap /pop to re-upload.`,
          ].join('\n')).catch(() => {});
        }
      }

      // Emit n8n event
      emitEvent(status === 'approved' ? 'pop.approved' : 'pop.rejected', {
        popId: req.params.popId,
        orderId: req.params.id,
        clientId: order?.clientId,
        status,
        adminNotes,
        total: order?.total,
      });

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

      // Emit n8n event
      if (paymentStatus === 'paid') {
        emitEvent('payment.received', {
          orderId: req.params.id,
          clientId: order?.clientId,
          total: order?.total,
          poNumber: order?.poNumber,
        });
      } else if (paymentStatus === 'overdue') {
        emitEvent('payment.overdue', {
          orderId: req.params.id,
          clientId: order?.clientId,
          total: order?.total,
          poNumber: order?.poNumber,
        });
      }

      // Notify client on payment status changes
      if (order && paymentStatus === 'paid') {
        notifyClient(order.clientId, [
          `<b>Payment Confirmed!</b>`,
          ``,
          `Payment received for order <b>${order.poNumber || order.id}</b>.`,
          `Amount: <b>R${order.total.toFixed(2)}</b>`,
          ``,
          `Thank you!`,
        ].join('\n')).catch(() => {});
      } else if (order && paymentStatus === 'overdue') {
        notifyClient(order.clientId, [
          `<b>Payment Overdue</b>`,
          ``,
          `Payment for order <b>${order.poNumber || order.id}</b> is overdue.`,
          `Amount: <b>R${order.total.toFixed(2)}</b>`,
          ``,
          `Please arrange payment as soon as possible.`,
          `Tap /pop to upload proof of payment.`,
        ].join('\n')).catch(() => {});
      }

      res.json({ order });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
