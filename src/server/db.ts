/**
 * JIG Craft Cannabis - Database Service
 *
 * PostgreSQL connection pool with typed query helpers for all tables.
 * Uses the pg library with parameterised queries to prevent SQL injection.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import type {
  Client,
  ClientWorldState,
  ClientPattern,
  Intervention,
  Order,
  OrderItem,
  Product,
  PriceTier,
  PopUpload,
  PopStatus,
} from '../world-model/types';

// ─────────────────────────────────────────────────────────────
// CONNECTION POOL
// ─────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

export { pool };

/** Run a single parameterised query. */
export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/** Obtain a client for transaction work. Caller must release. */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/** Execute a set of statements inside a transaction. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────
// ROW → TYPE MAPPERS
// ─────────────────────────────────────────────────────────────

function rowToClient(r: Record<string, unknown>): Client {
  return {
    id: r.id as string,
    companyName: r.company_name as string,
    tradingName: (r.trading_name as string) ?? undefined,
    registrationNumber: (r.registration_number as string) ?? undefined,
    vatNumber: (r.vat_number as string) ?? undefined,
    contactPerson: r.contact_person as string,
    email: r.email as string,
    phone: r.phone as string,
    address: {
      street: r.address_street as string,
      city: r.address_city as string,
      province: r.address_province as string,
      postalCode: r.address_postal_code as string,
      country: r.address_country as string,
    },
    deliveryAddress: r.delivery_street
      ? {
          street: r.delivery_street as string,
          city: r.delivery_city as string,
          province: r.delivery_province as string,
          postalCode: r.delivery_postal_code as string,
          country: r.delivery_country as string,
        }
      : undefined,
    clientType: r.client_type as Client['clientType'],
    tier: r.tier as Client['tier'],
    creditLimit: Number(r.credit_limit),
    paymentTerms: r.payment_terms as Client['paymentTerms'],
    status: r.status as Client['status'],
    createdAt: new Date(r.created_at as string).getTime(),
    lastActiveAt: new Date(r.last_active_at as string).getTime(),
  };
}

function rowToProduct(r: Record<string, unknown>): Product {
  return {
    id: r.id as string,
    sku: r.sku as string,
    name: r.name as string,
    category: r.category as Product['category'],
    subcategory: (r.subcategory as string) ?? undefined,
    strain: (r.strain as Product['strain']) ?? undefined,
    thcContent: (r.thc_content as string) ?? undefined,
    cbdContent: (r.cbd_content as string) ?? undefined,
    description: (r.description as string) ?? undefined,
    unit: r.unit as Product['unit'],
    stockQuantity: Number(r.stock_quantity),
    reorderPoint: Number(r.reorder_point),
    costPrice: Number(r.cost_price),
    priceTiers: [],
    isActive: r.is_active as boolean,
    createdAt: new Date(r.created_at as string).getTime(),
    updatedAt: new Date(r.updated_at as string).getTime(),
  };
}

function rowToOrder(r: Record<string, unknown>): Order {
  return {
    id: r.id as string,
    clientId: r.client_id as string,
    items: [],
    subtotal: Number(r.subtotal),
    vatAmount: Number(r.vat_amount),
    total: Number(r.total),
    status: r.status as Order['status'],
    paymentStatus: r.payment_status as Order['paymentStatus'],
    paymentMethod: r.payment_method as Order['paymentMethod'],
    paymentDueDate: r.payment_due_date
      ? new Date(r.payment_due_date as string).getTime()
      : undefined,
    paidAt: r.paid_at ? new Date(r.paid_at as string).getTime() : undefined,
    poNumber: (r.po_number as string) ?? undefined,
    invoiceNumber: (r.invoice_number as string) ?? undefined,
    deliveryAddress: {
      street: r.delivery_street as string,
      city: r.delivery_city as string,
      province: r.delivery_province as string,
      postalCode: r.delivery_postal_code as string,
      country: r.delivery_country as string,
    },
    deliveryNotes: (r.delivery_notes as string) ?? undefined,
    trackingNumber: (r.tracking_number as string) ?? undefined,
    courierName: (r.courier_name as string) ?? undefined,
    confirmedAt: r.confirmed_at ? new Date(r.confirmed_at as string).getTime() : undefined,
    shippedAt: r.shipped_at ? new Date(r.shipped_at as string).getTime() : undefined,
    deliveredAt: r.delivered_at ? new Date(r.delivered_at as string).getTime() : undefined,
    createdAt: new Date(r.created_at as string).getTime(),
    updatedAt: new Date(r.updated_at as string).getTime(),
  };
}

function rowToPopUpload(r: Record<string, unknown>): PopUpload {
  return {
    id: r.id as string,
    orderId: r.order_id as string,
    clientId: r.client_id as string,
    fileName: r.file_name as string,
    filePath: r.file_path as string,
    fileSize: Number(r.file_size),
    mimeType: r.mime_type as string,
    status: r.status as PopUpload['status'],
    adminNotes: (r.admin_notes as string) ?? undefined,
    reviewedBy: (r.reviewed_by as string) ?? undefined,
    reviewedAt: r.reviewed_at ? new Date(r.reviewed_at as string).getTime() : undefined,
    uploadedAt: new Date(r.uploaded_at as string).getTime(),
  };
}

function rowToOrderItem(r: Record<string, unknown>): OrderItem {
  return {
    productId: r.product_id as string,
    sku: r.sku as string,
    name: r.name as string,
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    totalPrice: Number(r.total_price),
  };
}

// ─────────────────────────────────────────────────────────────
// CLIENT QUERIES
// ─────────────────────────────────────────────────────────────

export async function getClientById(id: string): Promise<Client | null> {
  const { rows } = await query('SELECT * FROM clients WHERE id = $1', [id]);
  return rows.length > 0 ? rowToClient(rows[0] as Record<string, unknown>) : null;
}

export async function getClientByEmail(email: string): Promise<Client | null> {
  const { rows } = await query('SELECT * FROM clients WHERE email = $1', [
    email,
  ]);
  return rows.length > 0 ? rowToClient(rows[0] as Record<string, unknown>) : null;
}

export async function listClients(
  status?: string,
  limit = 50,
  offset = 0,
): Promise<Client[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (status) {
    conditions.push(`c.status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT c.*, cws.lifetime_value, cws.total_orders
     FROM clients c
     LEFT JOIN client_world_state cws ON cws.client_id = c.id
     ${where} ORDER BY c.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    params,
  );
  return rows.map((r) => {
    const client = rowToClient(r as Record<string, unknown>);
    return {
      ...client,
      lifetimeValue: Number(r.lifetime_value) || 0,
      totalOrders: Number(r.total_orders) || 0,
    };
  });
}

export async function updateClientTier(
  clientId: string,
  tier: Client['tier'],
): Promise<void> {
  await query('UPDATE clients SET tier = $1 WHERE id = $2', [tier, clientId]);
}

export async function touchClientActivity(clientId: string): Promise<void> {
  await query(
    'UPDATE clients SET last_active_at = NOW() WHERE id = $1',
    [clientId],
  );
}

// ─────────────────────────────────────────────────────────────
// PRODUCT QUERIES
// ─────────────────────────────────────────────────────────────

export async function getProductById(id: string): Promise<Product | null> {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);
  if (rows.length === 0) return null;

  const product = rowToProduct(rows[0] as Record<string, unknown>);
  product.priceTiers = await getProductPriceTiers(id);
  return product;
}

export async function listProducts(
  activeOnly = true,
  category?: string,
): Promise<Product[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (activeOnly) {
    conditions.push(`is_active = TRUE`);
  }
  if (category) {
    conditions.push(`category = $${idx++}`);
    params.push(category);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT * FROM products ${where} ORDER BY category, name`,
    params,
  );

  const products = rows.map((r) => rowToProduct(r as Record<string, unknown>));

  // Batch-load price tiers
  if (products.length > 0) {
    const ids = products.map((p) => p.id);
    const { rows: tierRows } = await query(
      `SELECT * FROM product_price_tiers WHERE product_id = ANY($1) ORDER BY min_quantity`,
      [ids],
    );
    const tierMap = new Map<string, PriceTier[]>();
    for (const tr of tierRows) {
      const r = tr as Record<string, unknown>;
      const pid = r.product_id as string;
      if (!tierMap.has(pid)) tierMap.set(pid, []);
      tierMap.get(pid)!.push({
        minQuantity: Number(r.min_quantity),
        price: Number(r.price),
        tierName: r.tier_name as string,
      });
    }
    for (const p of products) {
      p.priceTiers = tierMap.get(p.id) ?? [];
    }
  }

  return products;
}

async function getProductPriceTiers(productId: string): Promise<PriceTier[]> {
  const { rows } = await query(
    'SELECT * FROM product_price_tiers WHERE product_id = $1 ORDER BY min_quantity',
    [productId],
  );
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      minQuantity: Number(row.min_quantity),
      price: Number(row.price),
      tierName: row.tier_name as string,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// ORDER QUERIES
// ─────────────────────────────────────────────────────────────

export async function getOrderById(id: string): Promise<Order | null> {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1', [id]);
  if (rows.length === 0) return null;

  const order = rowToOrder(rows[0] as Record<string, unknown>);
  order.items = await getOrderItems(id);
  return order;
}

export async function getOrdersByClient(
  clientId: string,
  limit = 50,
): Promise<Order[]> {
  const { rows } = await query(
    'SELECT * FROM orders WHERE client_id = $1 ORDER BY created_at DESC LIMIT $2',
    [clientId, limit],
  );
  const orders = rows.map((r) => rowToOrder(r as Record<string, unknown>));

  // Batch-load items
  if (orders.length > 0) {
    const ids = orders.map((o) => o.id);
    const { rows: itemRows } = await query(
      'SELECT * FROM order_items WHERE order_id = ANY($1)',
      [ids],
    );
    const itemMap = new Map<string, OrderItem[]>();
    for (const ir of itemRows) {
      const r = ir as Record<string, unknown>;
      const oid = r.order_id as string;
      if (!itemMap.has(oid)) itemMap.set(oid, []);
      itemMap.get(oid)!.push(rowToOrderItem(r));
    }
    for (const o of orders) {
      o.items = itemMap.get(o.id) ?? [];
    }
  }

  return orders;
}

async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const { rows } = await query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [orderId],
  );
  return rows.map((r) => rowToOrderItem(r as Record<string, unknown>));
}

export async function createOrder(
  order: Omit<Order, 'createdAt' | 'updatedAt'>,
): Promise<Order> {
  await withTransaction(async (txClient) => {
    // Auto-assign PO number
    const poNumber = await nextSequenceValue('po', txClient);
    const poFormatted = `PO-${String(poNumber).padStart(6, '0')}`;

    await txClient.query(
      `INSERT INTO orders (id, client_id, subtotal, vat_amount, total, status, payment_status, payment_method,
        payment_due_date, po_number, delivery_street, delivery_city, delivery_province, delivery_postal_code, delivery_country, delivery_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        order.id,
        order.clientId,
        order.subtotal,
        order.vatAmount,
        order.total,
        order.status,
        order.paymentStatus,
        order.paymentMethod,
        order.paymentDueDate ? new Date(order.paymentDueDate) : null,
        poFormatted,
        order.deliveryAddress.street,
        order.deliveryAddress.city,
        order.deliveryAddress.province,
        order.deliveryAddress.postalCode,
        order.deliveryAddress.country,
        order.deliveryNotes ?? null,
      ],
    );

    for (const item of order.items) {
      await txClient.query(
        `INSERT INTO order_items (order_id, product_id, sku, name, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          order.id,
          item.productId,
          item.sku,
          item.name,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
        ],
      );
    }
  });

  // Read back after transaction commits
  return (await getOrderById(order.id))!;
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  extra?: { trackingNumber?: string; courierName?: string },
): Promise<void> {
  const sets = ['status = $1'];
  const params: unknown[] = [status];
  let idx = 2;

  if (extra?.trackingNumber) {
    sets.push(`tracking_number = $${idx++}`);
    params.push(extra.trackingNumber);
  }
  if (extra?.courierName) {
    sets.push(`courier_name = $${idx++}`);
    params.push(extra.courierName);
  }

  // Set status timestamps
  if (status === 'confirmed') {
    sets.push(`confirmed_at = NOW()`);
  } else if (status === 'shipped') {
    sets.push(`shipped_at = NOW()`);
  } else if (status === 'delivered') {
    sets.push(`delivered_at = NOW()`);
  }

  params.push(orderId);
  await query(
    `UPDATE orders SET ${sets.join(', ')} WHERE id = $${idx}`,
    params,
  );
}

export async function updateOrderPayment(
  orderId: string,
  paymentStatus: Order['paymentStatus'],
  paidAt?: number,
): Promise<void> {
  await query(
    'UPDATE orders SET payment_status = $1, paid_at = $2 WHERE id = $3',
    [paymentStatus, paidAt ? new Date(paidAt) : null, orderId],
  );
}

// ─────────────────────────────────────────────────────────────
// ORDER SEQUENCES
// ─────────────────────────────────────────────────────────────

/** Atomically increment and return the next value for a named sequence. */
export async function nextSequenceValue(
  name: string,
  txClient?: PoolClient,
): Promise<number> {
  const q = txClient ?? pool;
  const { rows } = await q.query(
    `UPDATE order_sequences SET current_value = current_value + 1
     WHERE sequence_name = $1 RETURNING current_value`,
    [name],
  );
  return Number((rows[0] as Record<string, unknown>).current_value);
}

/** Assign an invoice number to an order. Returns the formatted number. */
export async function assignInvoiceNumber(orderId: string): Promise<string> {
  return withTransaction(async (txClient) => {
    const val = await nextSequenceValue('invoice', txClient);
    const invNumber = `INV-${String(val).padStart(6, '0')}`;
    await txClient.query(
      'UPDATE orders SET invoice_number = $1 WHERE id = $2',
      [invNumber, orderId],
    );
    return invNumber;
  });
}

// ─────────────────────────────────────────────────────────────
// ADMIN ORDER QUERIES
// ─────────────────────────────────────────────────────────────

export interface OrderListFilters {
  status?: string;
  paymentStatus?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listAllOrders(
  filters: OrderListFilters = {},
): Promise<{ orders: Order[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`o.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.paymentStatus) {
    conditions.push(`o.payment_status = $${idx++}`);
    params.push(filters.paymentStatus);
  }
  if (filters.search) {
    conditions.push(`(o.id ILIKE $${idx} OR c.company_name ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const countResult = await query(
    `SELECT COUNT(*) FROM orders o LEFT JOIN clients c ON c.id = o.client_id ${where}`,
    params,
  );
  const total = Number((countResult.rows[0] as Record<string, unknown>).count);

  params.push(limit, offset);
  const { rows } = await query(
    `SELECT o.*, c.company_name AS client_name
     FROM orders o LEFT JOIN clients c ON c.id = o.client_id
     ${where} ORDER BY o.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    params,
  );

  const orders = rows.map((r) => {
    const order = rowToOrder(r as Record<string, unknown>);
    // Attach client name as extra info (cast to any since it's not in Order type)
    (order as Order & { clientName?: string }).clientName = (r as Record<string, unknown>).client_name as string;
    return order;
  });

  // Batch-load items
  if (orders.length > 0) {
    const ids = orders.map((o) => o.id);
    const { rows: itemRows } = await query(
      'SELECT * FROM order_items WHERE order_id = ANY($1)',
      [ids],
    );
    const itemMap = new Map<string, OrderItem[]>();
    for (const ir of itemRows) {
      const r = ir as Record<string, unknown>;
      const oid = r.order_id as string;
      if (!itemMap.has(oid)) itemMap.set(oid, []);
      itemMap.get(oid)!.push(rowToOrderItem(r));
    }
    for (const o of orders) {
      o.items = itemMap.get(o.id) ?? [];
    }
  }

  return { orders, total };
}

// ─────────────────────────────────────────────────────────────
// POP UPLOAD QUERIES
// ─────────────────────────────────────────────────────────────

export async function createPopUpload(data: {
  orderId: string;
  clientId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}): Promise<PopUpload> {
  const { rows } = await query(
    `INSERT INTO pop_uploads (order_id, client_id, file_name, file_path, file_size, mime_type)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.orderId, data.clientId, data.fileName, data.filePath, data.fileSize, data.mimeType],
  );
  return rowToPopUpload(rows[0] as Record<string, unknown>);
}

export async function getPopsByOrder(orderId: string): Promise<PopUpload[]> {
  const { rows } = await query(
    'SELECT * FROM pop_uploads WHERE order_id = $1 ORDER BY uploaded_at DESC',
    [orderId],
  );
  return rows.map((r) => rowToPopUpload(r as Record<string, unknown>));
}

export async function reviewPop(
  popId: string,
  status: PopStatus,
  adminNotes: string | null,
  reviewedBy: string,
): Promise<PopUpload> {
  const { rows } = await query(
    `UPDATE pop_uploads SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW()
     WHERE id = $4 RETURNING *`,
    [status, adminNotes, reviewedBy, popId],
  );
  return rowToPopUpload(rows[0] as Record<string, unknown>);
}

export async function getPendingPops(): Promise<(PopUpload & { clientName?: string; orderTotal?: number })[]> {
  const { rows } = await query(
    `SELECT p.*, c.company_name AS client_name, o.total AS order_total
     FROM pop_uploads p
     JOIN clients c ON c.id = p.client_id
     JOIN orders o ON o.id = p.order_id
     WHERE p.status = 'pending'
     ORDER BY p.uploaded_at ASC`,
  );
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      ...rowToPopUpload(row),
      clientName: row.client_name as string,
      orderTotal: Number(row.order_total),
    };
  });
}

// ─────────────────────────────────────────────────────────────
// CLIENT WORLD STATE QUERIES
// ─────────────────────────────────────────────────────────────

export async function getWorldState(
  clientId: string,
): Promise<Record<string, unknown> | null> {
  const { rows } = await query(
    'SELECT * FROM client_world_state WHERE client_id = $1',
    [clientId],
  );
  return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
}

export async function upsertWorldState(
  clientId: string,
  state: ClientWorldState,
): Promise<void> {
  await query(
    `INSERT INTO client_world_state (
      client_id,
      lifetime_value, total_orders, average_order_value, last_order_at, last_order_value,
      order_frequency_days, preferred_products, preferred_categories, price_point_sensitivity,
      bulk_buyer, seasonal_pattern,
      total_paid, outstanding_balance, payment_reliability, average_days_to_payment,
      late_payments, credit_utilization, last_payment_at, payment_trend,
      estimated_stock_days, last_restock_date, average_consumption_rate, stock_alerts, reorder_predictions,
      account_age_days, tier, satisfaction_score, support_tickets, complaints_count,
      nps_score, churn_risk, last_contact_at, assigned_sales_rep,
      preferred_order_day, preferred_order_time, browsing_history, cart_abandonment,
      cart_abandonment_value, email_open_rate, promotion_response_rate,
      last_login_at, session_count, average_session_minutes,
      last_updated
    ) VALUES (
      $1,
      $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12,
      $13, $14, $15, $16,
      $17, $18, $19, $20,
      $21, $22, $23, $24, $25,
      $26, $27, $28, $29, $30,
      $31, $32, $33, $34,
      $35, $36, $37, $38,
      $39, $40, $41,
      $42, $43, $44,
      NOW()
    ) ON CONFLICT (client_id) DO UPDATE SET
      lifetime_value = EXCLUDED.lifetime_value,
      total_orders = EXCLUDED.total_orders,
      average_order_value = EXCLUDED.average_order_value,
      last_order_at = EXCLUDED.last_order_at,
      last_order_value = EXCLUDED.last_order_value,
      order_frequency_days = EXCLUDED.order_frequency_days,
      preferred_products = EXCLUDED.preferred_products,
      preferred_categories = EXCLUDED.preferred_categories,
      price_point_sensitivity = EXCLUDED.price_point_sensitivity,
      bulk_buyer = EXCLUDED.bulk_buyer,
      seasonal_pattern = EXCLUDED.seasonal_pattern,
      total_paid = EXCLUDED.total_paid,
      outstanding_balance = EXCLUDED.outstanding_balance,
      payment_reliability = EXCLUDED.payment_reliability,
      average_days_to_payment = EXCLUDED.average_days_to_payment,
      late_payments = EXCLUDED.late_payments,
      credit_utilization = EXCLUDED.credit_utilization,
      last_payment_at = EXCLUDED.last_payment_at,
      payment_trend = EXCLUDED.payment_trend,
      estimated_stock_days = EXCLUDED.estimated_stock_days,
      last_restock_date = EXCLUDED.last_restock_date,
      average_consumption_rate = EXCLUDED.average_consumption_rate,
      stock_alerts = EXCLUDED.stock_alerts,
      reorder_predictions = EXCLUDED.reorder_predictions,
      account_age_days = EXCLUDED.account_age_days,
      tier = EXCLUDED.tier,
      satisfaction_score = EXCLUDED.satisfaction_score,
      support_tickets = EXCLUDED.support_tickets,
      complaints_count = EXCLUDED.complaints_count,
      nps_score = EXCLUDED.nps_score,
      churn_risk = EXCLUDED.churn_risk,
      last_contact_at = EXCLUDED.last_contact_at,
      assigned_sales_rep = EXCLUDED.assigned_sales_rep,
      preferred_order_day = EXCLUDED.preferred_order_day,
      preferred_order_time = EXCLUDED.preferred_order_time,
      browsing_history = EXCLUDED.browsing_history,
      cart_abandonment = EXCLUDED.cart_abandonment,
      cart_abandonment_value = EXCLUDED.cart_abandonment_value,
      email_open_rate = EXCLUDED.email_open_rate,
      promotion_response_rate = EXCLUDED.promotion_response_rate,
      last_login_at = EXCLUDED.last_login_at,
      session_count = EXCLUDED.session_count,
      average_session_minutes = EXCLUDED.average_session_minutes,
      last_updated = NOW()`,
    [
      clientId,
      state.purchasing.lifetimeValue,
      state.purchasing.totalOrders,
      state.purchasing.averageOrderValue,
      state.purchasing.lastOrderAt ? new Date(state.purchasing.lastOrderAt) : null,
      state.purchasing.lastOrderValue,
      state.purchasing.orderFrequencyDays,
      JSON.stringify(state.purchasing.preferredProducts),
      JSON.stringify(state.purchasing.preferredCategories),
      state.purchasing.pricePointSensitivity,
      state.purchasing.bulkBuyer,
      state.purchasing.seasonalPattern,
      state.payment.totalPaid,
      state.payment.outstandingBalance,
      state.payment.paymentReliability,
      state.payment.averageDaysToPayment,
      state.payment.latePayments,
      state.payment.creditUtilization,
      state.payment.lastPaymentAt ? new Date(state.payment.lastPaymentAt) : null,
      state.payment.paymentTrend,
      state.inventory.estimatedStockDays,
      state.inventory.lastRestockDate ? new Date(state.inventory.lastRestockDate) : null,
      state.inventory.averageConsumptionRate,
      JSON.stringify(state.inventory.stockAlerts),
      JSON.stringify(state.inventory.reorderPredictions),
      state.relationship.accountAgeDays,
      state.relationship.tier,
      state.relationship.satisfactionScore,
      state.relationship.supportTickets,
      state.relationship.complaintsCount,
      state.relationship.npsScore,
      state.relationship.churnRisk,
      state.relationship.lastContactAt ? new Date(state.relationship.lastContactAt) : null,
      state.relationship.assignedSalesRep,
      state.behavioral.preferredOrderDay,
      state.behavioral.preferredOrderTime,
      JSON.stringify(state.behavioral.browsingHistory),
      state.behavioral.cartAbandonment,
      state.behavioral.cartAbandonmentValue,
      state.behavioral.emailOpenRate,
      state.behavioral.promotionResponseRate,
      state.behavioral.lastLoginAt ? new Date(state.behavioral.lastLoginAt) : null,
      state.behavioral.sessionCount,
      state.behavioral.averageSessionMinutes,
    ],
  );
}

// ─────────────────────────────────────────────────────────────
// PATTERN QUERIES
// ─────────────────────────────────────────────────────────────

export async function upsertPatterns(
  clientId: string,
  patterns: ClientPattern[],
): Promise<void> {
  for (const p of patterns) {
    await query(
      `INSERT INTO client_patterns (client_id, pattern_type, category, frequency, confidence, last_detected, evidence)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       ON CONFLICT (client_id, pattern_type) DO UPDATE SET
         frequency = client_patterns.frequency + 1,
         confidence = EXCLUDED.confidence,
         last_detected = NOW(),
         evidence = EXCLUDED.evidence`,
      [clientId, p.patternType, p.category, 1, p.confidence, p.evidence ?? null],
    );
  }
}

export async function getPatterns(clientId: string): Promise<ClientPattern[]> {
  const { rows } = await query(
    'SELECT * FROM client_patterns WHERE client_id = $1 ORDER BY last_detected DESC',
    [clientId],
  );
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      clientId: row.client_id as string,
      patternType: row.pattern_type as string,
      category: row.category as ClientPattern['category'],
      frequency: Number(row.frequency),
      confidence: Number(row.confidence),
      lastDetected: new Date(row.last_detected as string).getTime(),
      evidence: (row.evidence as string) ?? undefined,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// INTERVENTION QUERIES
// ─────────────────────────────────────────────────────────────

export async function insertIntervention(
  clientId: string,
  intervention: Intervention,
): Promise<string> {
  const { rows } = await query(
    `INSERT INTO interventions (client_id, type, channel, priority, triggered_by, message)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      clientId,
      intervention.type,
      intervention.channel,
      intervention.priority,
      intervention.triggeredBy,
      intervention.message,
    ],
  );
  return (rows[0] as Record<string, unknown>).id as string;
}

export async function getActiveInterventions(
  clientId: string,
): Promise<Intervention[]> {
  const { rows } = await query(
    `SELECT * FROM interventions WHERE client_id = $1 AND status IN ('pending', 'sent')
     ORDER BY triggered_at DESC LIMIT 20`,
    [clientId],
  );
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      clientId: row.client_id as string,
      type: row.type as Intervention['type'],
      channel: row.channel as Intervention['channel'],
      priority: row.priority as Intervention['priority'],
      triggeredBy: row.triggered_by as string,
      message: row.message as string,
      status: row.status as Intervention['status'],
      triggeredAt: new Date(row.triggered_at as string).getTime(),
      respondedAt: row.responded_at
        ? new Date(row.responded_at as string).getTime()
        : undefined,
      outcome: (row.outcome as Intervention['outcome']) ?? undefined,
    };
  });
}

export async function updateInterventionStatus(
  interventionId: string,
  status: string,
  outcome?: string,
): Promise<void> {
  await query(
    `UPDATE interventions SET status = $1, outcome = $2, responded_at = NOW() WHERE id = $3`,
    [status, outcome ?? null, interventionId],
  );
}

// ─────────────────────────────────────────────────────────────
// EVENT LOG
// ─────────────────────────────────────────────────────────────

export async function logEvent(
  clientId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await query(
    'INSERT INTO event_log (client_id, event_type, payload) VALUES ($1, $2, $3)',
    [clientId, eventType, JSON.stringify(payload)],
  );
}

export async function getEventLog(
  clientId: string,
  limit = 50,
): Promise<Array<{ eventType: string; payload: Record<string, unknown>; createdAt: number }>> {
  const { rows } = await query(
    'SELECT event_type, payload, created_at FROM event_log WHERE client_id = $1 ORDER BY created_at DESC LIMIT $2',
    [clientId, limit],
  );
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      eventType: row.event_type as string,
      payload: row.payload as Record<string, unknown>,
      createdAt: new Date(row.created_at as string).getTime(),
    };
  });
}

// ─────────────────────────────────────────────────────────────
// AUTH QUERIES
// ─────────────────────────────────────────────────────────────

export async function createOtp(
  email: string,
  otpCode: string,
  purpose: string,
  expiresAt: Date,
): Promise<string> {
  const { rows } = await query(
    `INSERT INTO auth_otp (email, otp_code, purpose, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [email, otpCode, purpose, expiresAt],
  );
  return (rows[0] as Record<string, unknown>).id as string;
}

export async function verifyOtp(
  email: string,
  otpCode: string,
): Promise<{ valid: boolean; otpId?: string }> {
  const { rows } = await query(
    `SELECT id, attempts, max_attempts FROM auth_otp
     WHERE email = $1 AND otp_code = $2 AND is_verified = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email, otpCode],
  );

  if (rows.length === 0) return { valid: false };

  const row = rows[0] as Record<string, unknown>;
  const attempts = Number(row.attempts);
  const maxAttempts = Number(row.max_attempts);
  const otpId = row.id as string;

  if (attempts >= maxAttempts) return { valid: false };

  // Mark as verified
  await query(
    'UPDATE auth_otp SET is_verified = TRUE, verified_at = NOW() WHERE id = $1',
    [otpId],
  );

  return { valid: true, otpId };
}

export async function incrementOtpAttempts(
  email: string,
): Promise<void> {
  await query(
    `UPDATE auth_otp SET attempts = attempts + 1
     WHERE email = $1 AND is_verified = FALSE AND expires_at > NOW()`,
    [email],
  );
}

export async function createSession(
  clientId: string,
  tokenHash: string,
  expiresAt: Date,
  userAgent?: string,
  ipAddress?: string,
): Promise<string> {
  const { rows } = await query(
    `INSERT INTO auth_sessions (client_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [clientId, tokenHash, expiresAt, userAgent ?? null, ipAddress ?? null],
  );
  return (rows[0] as Record<string, unknown>).id as string;
}

export async function getSessionByToken(
  tokenHash: string,
): Promise<{ clientId: string; sessionId: string } | null> {
  const { rows } = await query(
    `SELECT id, client_id FROM auth_sessions
     WHERE token_hash = $1 AND is_active = TRUE AND expires_at > NOW()`,
    [tokenHash],
  );
  if (rows.length === 0) return null;
  const row = rows[0] as Record<string, unknown>;
  return { clientId: row.client_id as string, sessionId: row.id as string };
}

export async function deactivateSession(tokenHash: string): Promise<void> {
  await query(
    'UPDATE auth_sessions SET is_active = FALSE WHERE token_hash = $1',
    [tokenHash],
  );
}

export async function touchSession(tokenHash: string): Promise<void> {
  await query(
    'UPDATE auth_sessions SET last_used_at = NOW() WHERE token_hash = $1',
    [tokenHash],
  );
}

// ─────────────────────────────────────────────────────────────
// LEADS QUERIES
// ─────────────────────────────────────────────────────────────

export async function listLeads(
  tier?: string,
  status?: string,
  limit = 50,
  offset = 0,
): Promise<Record<string, unknown>[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (tier) {
    conditions.push(`tier = $${idx++}`);
    params.push(tier);
  }
  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT * FROM leads ${where} ORDER BY tier ASC, created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    params,
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    businessName: r.business_name,
    contactName: r.contact_name,
    phone: r.phone,
    email: r.email,
    whatsapp: r.whatsapp,
    instagram: r.instagram,
    website: r.website,
    province: r.province,
    city: r.city,
    address: r.address,
    businessType: r.business_type,
    estimatedTier: r.tier,
    tier: r.tier,
    estMonthlyVolume: r.est_monthly_volume,
    currentSupplier: r.current_supplier,
    status: r.status ?? 'new',
    notes: r.notes,
    createdAt: r.created_at,
  }));
}
