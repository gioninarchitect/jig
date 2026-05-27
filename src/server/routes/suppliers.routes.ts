/**
 * PureGro - Supplier Management Routes
 *
 * CRUD for suppliers, supplier products, and purchase orders.
 * Admin-only access.
 */

import { Router, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware';
import { query, withTransaction, getClient } from '../db';

const router = Router();

// ── Suppliers CRUD ──────────────────────────────────────────

/** List all suppliers (optional filters: type, status, search). */
router.get(
  '/',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { type, status, search } = req.query;
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (type) {
        conditions.push(`supplier_type = $${idx++}`);
        params.push(type);
      }
      if (status) {
        conditions.push(`status = $${idx++}`);
        params.push(status);
      }
      if (search) {
        conditions.push(`(company_name ILIKE $${idx} OR contact_person ILIKE $${idx} OR email ILIKE $${idx})`);
        params.push(`%${search}%`);
        idx++;
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await query(
        `SELECT * FROM suppliers ${where} ORDER BY company_name ASC`,
        params,
      );

      // Get product count per supplier
      const { rows: productCounts } = await query(
        `SELECT supplier_id, COUNT(*)::int AS count FROM supplier_products GROUP BY supplier_id`,
      );
      const countMap = new Map(productCounts.map((r: any) => [r.supplier_id, r.count]));

      const suppliers = rows.map((r: any) => ({
        id: r.id,
        companyName: r.company_name,
        supplierType: r.supplier_type,
        contactPerson: r.contact_person,
        email: r.email,
        phone: r.phone,
        address: { street: r.address_street, city: r.address_city, province: r.address_province },
        licenseNumber: r.license_number,
        status: r.status,
        paymentTerms: r.payment_terms,
        notes: r.notes,
        productCount: countMap.get(r.id) || 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      res.json({ suppliers, count: suppliers.length });
    } catch (err) {
      next(err);
    }
  },
);

/** Create a supplier. */
router.post(
  '/',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        companyName, supplierType, contactPerson, email, phone,
        addressStreet, addressCity, addressProvince,
        licenseNumber, paymentTerms, notes,
      } = req.body;

      if (!companyName) {
        res.status(400).json({ error: 'Company name is required' });
        return;
      }

      const { rows } = await query(
        `INSERT INTO suppliers (company_name, supplier_type, contact_person, email, phone,
          address_street, address_city, address_province, license_number, payment_terms, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          companyName, supplierType || 'farm', contactPerson || null,
          email || null, phone || null, addressStreet || null,
          addressCity || null, addressProvince || null,
          licenseNumber || null, paymentTerms || 'COD', notes || null,
        ],
      );

      res.status(201).json({ supplier: mapSupplier(rows[0]) });
    } catch (err) {
      next(err);
    }
  },
);

/** Get a single supplier with their products. */
router.get(
  '/:id',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { rows: sRows } = await query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
      if (sRows.length === 0) {
        res.status(404).json({ error: 'Supplier not found' });
        return;
      }

      const { rows: pRows } = await query(
        'SELECT * FROM supplier_products WHERE supplier_id = $1 ORDER BY product_name ASC',
        [req.params.id],
      );

      const { rows: oRows } = await query(
        `SELECT * FROM supplier_orders WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 20`,
        [req.params.id],
      );

      const supplier = mapSupplier(sRows[0]);
      const products = pRows.map((r: any) => ({
        id: r.id,
        productName: r.product_name,
        sku: r.sku,
        unitPrice: Number(r.unit_price),
        minOrderQty: r.min_order_qty,
        leadTimeDays: r.lead_time_days,
        notes: r.notes,
        createdAt: r.created_at,
      }));
      const orders = oRows.map(mapSupplierOrder);

      res.json({ supplier, products, orders });
    } catch (err) {
      next(err);
    }
  },
);

/** Update a supplier. */
router.patch(
  '/:id',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const fields: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      const allowed = [
        ['companyName', 'company_name'], ['supplierType', 'supplier_type'],
        ['contactPerson', 'contact_person'], ['email', 'email'], ['phone', 'phone'],
        ['addressStreet', 'address_street'], ['addressCity', 'address_city'],
        ['addressProvince', 'address_province'], ['licenseNumber', 'license_number'],
        ['status', 'status'], ['paymentTerms', 'payment_terms'], ['notes', 'notes'],
      ];

      for (const [jsKey, dbKey] of allowed) {
        if (req.body[jsKey] !== undefined) {
          fields.push(`${dbKey} = $${idx++}`);
          params.push(req.body[jsKey]);
        }
      }

      if (fields.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      fields.push(`updated_at = NOW()`);
      params.push(req.params.id);

      const { rows } = await query(
        `UPDATE suppliers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        params,
      );

      if (rows.length === 0) {
        res.status(404).json({ error: 'Supplier not found' });
        return;
      }

      res.json({ supplier: mapSupplier(rows[0]) });
    } catch (err) {
      next(err);
    }
  },
);

// ── Supplier Products ───────────────────────────────────────

/** Add a product to a supplier's catalog. */
router.post(
  '/:id/products',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { productName, sku, unitPrice, minOrderQty, leadTimeDays, notes } = req.body;
      if (!productName) {
        res.status(400).json({ error: 'Product name is required' });
        return;
      }

      const { rows } = await query(
        `INSERT INTO supplier_products (supplier_id, product_name, sku, unit_price, min_order_qty, lead_time_days, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.params.id, productName, sku || null, unitPrice || null, minOrderQty || 1, leadTimeDays || 7, notes || null],
      );

      res.status(201).json({
        product: {
          id: rows[0].id,
          productName: rows[0].product_name,
          sku: rows[0].sku,
          unitPrice: Number(rows[0].unit_price),
          minOrderQty: rows[0].min_order_qty,
          leadTimeDays: rows[0].lead_time_days,
          notes: rows[0].notes,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── Purchase Orders ─────────────────────────────────────────

/** List purchase orders (optional filters: status, supplierId). */
router.get(
  '/orders/list',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status, supplierId } = req.query;
      const conditions: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (status) { conditions.push(`so.status = $${idx++}`); params.push(status); }
      if (supplierId) { conditions.push(`so.supplier_id = $${idx++}`); params.push(supplierId); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows } = await query(
        `SELECT so.*, s.company_name AS supplier_name
         FROM supplier_orders so
         LEFT JOIN suppliers s ON s.id = so.supplier_id
         ${where}
         ORDER BY so.created_at DESC
         LIMIT 100`,
        params,
      );

      res.json({ orders: rows.map(mapSupplierOrder), count: rows.length });
    } catch (err) {
      next(err);
    }
  },
);

/** Create a purchase order to a supplier. */
router.post(
  '/orders',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { supplierId, items, expectedDelivery, notes } = req.body;
      if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Supplier ID and at least one item are required' });
        return;
      }

      const result = await withTransaction(async (txClient) => {
        // Generate PO number
        const { rows: countRows } = await txClient.query('SELECT COUNT(*)::int AS c FROM supplier_orders');
        const poNumber = `SPO-${String(countRows[0].c + 1).padStart(5, '0')}`;

        let total = 0;
        for (const item of items) {
          total += (item.unitPrice || 0) * (item.quantity || 0);
        }

        const { rows: orderRows } = await txClient.query(
          `INSERT INTO supplier_orders (supplier_id, po_number, total, expected_delivery, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [supplierId, poNumber, total, expectedDelivery || null, notes || null, req.authUser?.email || 'admin'],
        );

        for (const item of items) {
          await txClient.query(
            `INSERT INTO supplier_order_items (order_id, product_name, quantity, unit_price, total_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [orderRows[0].id, item.productName, item.quantity, item.unitPrice || 0, (item.unitPrice || 0) * (item.quantity || 0)],
          );
        }

        return orderRows[0];
      });

      res.status(201).json({ order: mapSupplierOrder(result) });
    } catch (err) {
      next(err);
    }
  },
);

/** Update PO status (sent, confirmed, shipped, received, cancelled). */
router.patch(
  '/orders/:id/status',
  requireAuth as never,
  requireAdmin as never,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const validStatuses = ['draft', 'sent', 'confirmed', 'shipped', 'received', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        return;
      }

      const extra = status === 'received' ? ', received_at = NOW()' : '';
      const { rows } = await query(
        `UPDATE supplier_orders SET status = $1, updated_at = NOW()${extra} WHERE id = $2 RETURNING *`,
        [status, req.params.id],
      );

      if (rows.length === 0) {
        res.status(404).json({ error: 'Purchase order not found' });
        return;
      }

      res.json({ order: mapSupplierOrder(rows[0]) });
    } catch (err) {
      next(err);
    }
  },
);

// ── Helpers ─────────────────────────────────────────────────

function mapSupplier(r: any) {
  return {
    id: r.id,
    companyName: r.company_name,
    supplierType: r.supplier_type,
    contactPerson: r.contact_person,
    email: r.email,
    phone: r.phone,
    address: { street: r.address_street, city: r.address_city, province: r.address_province },
    licenseNumber: r.license_number,
    status: r.status,
    paymentTerms: r.payment_terms,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapSupplierOrder(r: any) {
  return {
    id: r.id,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name || undefined,
    poNumber: r.po_number,
    status: r.status,
    total: Number(r.total),
    expectedDelivery: r.expected_delivery,
    receivedAt: r.received_at,
    notes: r.notes,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export default router;
