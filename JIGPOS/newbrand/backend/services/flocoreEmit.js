// FLOCORE event-rail emitter — Origin Retail (newbrand).
// Fire-and-forget: emits `pos.sale` on each COMPLETED retail sale so the ILCO head-office rollup
// + cultivation micro-model read real till revenue. Additive; a failed emit must NEVER affect a sale.
//
// EVENTS CONTRACT (FLOCORE, ratified 2026-07-01): payload.amount = NET GOODS value =
//   Σ (line quantity × unit price) — NOT tenders / cash-received / gross. Change handed back on an
//   over-tendered cash sale would otherwise overstate revenue (the KCS/Empact ~R984 bug). Line items
//   are included so FO/DriftSentinel can derive the reconciliation truth INDEPENDENTLY.
//
// Config is 100% env-driven (no tenant identity or secret in code). No-op until FO provisions the
// per-tenant (tenant:ilco) W32 bearer token — so shipping this is safe before the token exists.
const logger = require('../modules/logger');

const BASE     = process.env.FLOCORE_URL          || '';                 // e.g. https://fo.flocore.tech
const URL      = BASE ? `${BASE.replace(/\/+$/, '')}/events/emit` : '';
const TOKEN    = process.env.FLOCORE_TOKEN        || '';                 // per-tenant (tenant:ilco) W32 bearer — FO mints
const TENANT   = process.env.FLOCORE_TENANT_SLUG  || 'ilco';
const MODULE   = process.env.FLOCORE_MODULE_KEY   || 'origin';
const NODE_KEY = process.env.FLOCORE_NODE_KEY     || 'origin_potchefstroom_till';
const TIMEOUT  = Number(process.env.FLOCORE_EVENTS_TIMEOUT_MS || 4000);

// Build the /events/emit envelope for a completed Sale. Pure + exported for testing.
function buildSaleEnvelope(sale) {
  const lineItems = (sale.items || []).map(i => ({
    product_id: i.productId ? String(i.productId) : null,   // null for quick/pack lines not linked to a Product
    name: i.name,
    sku: i.sku || null,
    quantity: Number(i.quantity) || 0,
    unit_price: Number(i.unitPrice) || 0,
    line_total: (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
  }));
  // NET GOODS — Σ qty×unit_price (VAT-inclusive selling price), independent of how it was tendered.
  const amount = Math.round(lineItems.reduce((s, l) => s + l.line_total, 0) * 100) / 100;

  return {
    tenant_id: TENANT,          // FLOCORE stamps tenant from the token; slug is advisory/back-compat
    tenant_slug: TENANT,
    module_key: MODULE,
    type: 'pos.sale',
    entity_type: 'sale',
    entity_id: String(sale.saleNumber || sale._id),   // stable idempotency key
    payload: {
      amount,                                          // NET goods (Σ qty×price) — NOT tenders
      currency: 'ZAR',
      vat_inclusive: true,
      item_count: lineItems.length,
      line_items: lineItems,                           // independent reconciliation source
      occurred_at: sale.createdAt || new Date().toISOString(),
    },
    metadata: {
      node_key: NODE_KEY,
      branch_id: sale.branchId ? String(sale.branchId) : null,
      sale_number: sale.saleNumber || null,
      payment_methods: (sale.payments || []).map(p => p.method),
      idempotencyKey: String(sale.saleNumber || sale._id),
    },
  };
}

// Fire-and-forget emit. Never throws, never blocks the caller beyond the abort timeout.
function emitSale(sale) {
  if (!URL || !TOKEN) return; // not provisioned yet → silent no-op (awaiting FO W32 token)
  let envelope;
  try {
    envelope = buildSaleEnvelope(sale);
  } catch (e) {
    logger.warn('FLOCORE emit: envelope build failed (non-fatal):', e.message);
    return;
  }
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT);
  fetch(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(envelope),
    signal: controller.signal,
  })
    .then(res => { if (!res.ok) logger.warn(`FLOCORE emit non-2xx: ${res.status} for sale ${envelope.entity_id}`); })
    .catch(err => { logger.warn('FLOCORE emit failed (non-fatal):', err.message); })
    .finally(() => clearTimeout(t));
}

module.exports = { emitSale, buildSaleEnvelope };
