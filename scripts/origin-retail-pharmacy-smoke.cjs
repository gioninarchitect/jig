require('dotenv/config');
const { Pool } = require('pg');

const API_URL = process.env.ORIGIN_RETAIL_SMOKE_API_URL || 'http://127.0.0.1:3002/api/v1/origin-retail/pharmacy-core';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'origin_internal_2026';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-internal-key': INTERNAL_KEY,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function main() {
  const stamp = Date.now();
  const actor = `smoke-${stamp}`;

  const pharmacy = (await api('/pharmacies', {
    method: 'POST',
    body: {
      facilityName: `Origin Retail Smoke Pharmacy ${stamp}`,
      tradingName: `Smoke Pharmacy ${stamp}`,
      licenseNumber: `SMOKE-${stamp}`,
      responsiblePharmacistName: 'Smoke Responsible Pharmacist',
      responsiblePharmacistReg: `RP-${stamp}`,
      handlingFeeType: 'FLAT',
      handlingFeeValue: 35,
      address: { city: 'Cape Town' },
      contact: { email: `smoke-${stamp}@example.test` },
    },
  })).pharmacy;

  const requiredDocs = [
    'pharmacy_license',
    'responsible_pharmacist_registration',
    'bank_confirmation',
    'signed_partner_agreement',
    'storage_sop',
  ];
  for (const docType of requiredDocs) {
    const doc = (await api(`/pharmacies/${pharmacy.id}/documents`, {
      method: 'POST',
      body: { docType, fileName: `${docType}.pdf`, filePath: `/uat/${docType}.pdf` },
    })).document;
    await api(`/pharmacies/${pharmacy.id}/documents/${doc.id}/review`, {
      method: 'PATCH',
      body: { status: 'approved', adminNotes: `approved by ${actor}` },
    });
  }

  await api(`/pharmacies/${pharmacy.id}/users`, {
    method: 'POST',
    body: {
      email: `responsible-${stamp}@example.test`,
      name: 'Smoke Responsible Pharmacist',
      role: 'RESPONSIBLE_PHARMACIST',
      registrationNumber: `RP-${stamp}`,
      canScanArrivals: true,
      canReleaseCollections: true,
      canMarkReturns: true,
      canViewSettlements: true,
    },
  });
  await api(`/pharmacies/${pharmacy.id}/activate`, { method: 'POST', body: {} });

  const batch = (await api('/inventory/batches', {
    method: 'POST',
    body: {
      sku: `SKU-${stamp}`,
      productName: 'Smoke Section 21 Medicine',
      batchNumber: `BATCH-${stamp}`,
      lotNumber: `LOT-${stamp}`,
      expiryDate: '2028-12-31',
      quantityOnHand: 20,
    },
  })).batch;

  const order = (await api('/orders', {
    method: 'POST',
    body: {
      orderNumber: `OR-${stamp}-A`,
      pharmacyId: pharmacy.id,
      consultationFee: 100,
      medicationTotal: 250,
      total: 350,
      collectionOtp: '246810',
      collectionOtpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      section21DocumentRef: `S21-${stamp}`,
      prescriptionReference: `RX-${stamp}`,
      prescriberReference: `DR-${stamp}`,
      items: [{ sku: `SKU-${stamp}`, name: 'Smoke Section 21 Medicine', quantity: 2, unitPrice: 125, totalPrice: 250 }],
    },
  })).order;

  await api(`/orders/${order.id}/confirm-section21-dispensing`, {
    method: 'POST',
    body: { section21DocumentRef: `S21-${stamp}`, prescriptionReference: `RX-${stamp}`, prescriberReference: `DR-${stamp}` },
  });
  await api(`/orders/${order.id}/payment-events`, {
    method: 'POST',
    body: {
      gateway: 'manual',
      gatewayReference: `PAY-${stamp}`,
      eventType: 'paid',
      amount: 350,
      allocations: [
        { allocationType: 'consultation_fee', amount: 100 },
        { allocationType: 'medication_total', amount: 250 },
      ],
    },
  });

  const detail = await api(`/orders/${order.id}`);
  await api(`/orders/${order.id}/pack`, {
    method: 'POST',
    body: { items: [{ inventoryBatchId: batch.id, orderItemId: detail.items[0].id, quantity: 2 }] },
  });
  await api(`/orders/${order.id}/dispatch-to-pharmacy`, { method: 'POST', body: { courierName: 'Smoke Courier' } });
  await api(`/orders/${order.id}/pharmacy-arrival`, { method: 'POST', body: {} });
  const otp = await api(`/orders/${order.id}/verify-collection-otp`, { method: 'POST', body: { collectionOtp: '246810' } });
  if (!otp.valid) throw new Error('Expected collection OTP to validate');
  await api(`/orders/${order.id}/collect`, { method: 'POST', body: { collectionOtp: '246810' } });

  const returnOrder = (await api('/orders', {
    method: 'POST',
    body: {
      orderNumber: `OR-${stamp}-B`,
      pharmacyId: pharmacy.id,
      medicationTotal: 125,
      total: 125,
      collectionOtp: '135790',
      collectionOtpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      section21DocumentRef: `S21-${stamp}-B`,
      prescriptionReference: `RX-${stamp}-B`,
      items: [{ sku: `SKU-${stamp}`, name: 'Smoke Section 21 Medicine', quantity: 1, unitPrice: 125, totalPrice: 125 }],
    },
  })).order;
  await api(`/orders/${returnOrder.id}/payment-events`, { method: 'POST', body: { eventType: 'paid', amount: 125 } });
  const returnDetail = await api(`/orders/${returnOrder.id}`);
  await api(`/orders/${returnOrder.id}/pack`, {
    method: 'POST',
    body: { items: [{ inventoryBatchId: batch.id, orderItemId: returnDetail.items[0].id, quantity: 1 }] },
  });
  await api(`/orders/${returnOrder.id}/dispatch-to-pharmacy`, { method: 'POST', body: { courierName: 'Smoke Courier' } });
  await api(`/orders/${returnOrder.id}/pharmacy-arrival`, { method: 'POST', body: {} });
  await pool.query(
    "UPDATE pharmacy_orders SET arrived_at_pharmacy_at = NOW() - INTERVAL '22 days' WHERE id = $1",
    [returnOrder.id],
  );
  const expiry = await api('/jobs/uncollected-expiry/run', { method: 'POST', body: {} });
  if (expiry.expired < 1) throw new Error('Expected the 21-day expiry job to expire one order');
  await api(`/orders/${returnOrder.id}/receive-return`, { method: 'POST', body: { locationId: 'hub-smoke' } });

  const finalDetail = await api(`/orders/${order.id}`);
  const returnFinalDetail = await api(`/orders/${returnOrder.id}`);
  const checks = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM payment_events WHERE order_id IN ($1,$2)) AS payment_events,
       (SELECT COUNT(*)::int FROM payment_allocations WHERE order_id = $1) AS payment_allocations,
       (SELECT COUNT(*)::int FROM inventory_movements WHERE order_id IN ($1,$2)) AS inventory_movements,
       (SELECT COUNT(*)::int FROM package_custody_events pce JOIN order_packages op ON op.id = pce.package_id WHERE op.order_id IN ($1,$2)) AS custody_events,
       (SELECT COUNT(*)::int FROM pharmacy_ledger WHERE order_id = $1 AND action_type = 'COLLECTION') AS collection_ledger,
       (SELECT COUNT(*)::int FROM refunds_payable WHERE order_id = $2) AS refunds_payable,
       (SELECT COUNT(*)::int FROM return_waybills WHERE order_id = $2) AS return_waybills,
       (SELECT COUNT(*)::int FROM workflow_tickets WHERE entity_id = $2::text) AS return_tickets,
       (SELECT COUNT(*)::int FROM audit_events WHERE entity_id IN ($1::text,$2::text,$3::text)) AS audit_events`,
    [order.id, returnOrder.id, pharmacy.id],
  );

  const row = checks.rows[0];
  for (const [key, value] of Object.entries(row)) {
    if (Number(value) < 1) throw new Error(`Expected ${key} to be persisted`);
  }
  if (finalDetail.order.status !== 'collected') throw new Error(`Expected collected order, got ${finalDetail.order.status}`);
  if (returnFinalDetail.order.status !== 'returned_to_hub') throw new Error(`Expected returned_to_hub order, got ${returnFinalDetail.order.status}`);

  let appendOnlyBlocked = false;
  try {
    await pool.query('UPDATE payment_events SET amount = amount + 1 WHERE order_id = $1', [order.id]);
  } catch {
    appendOnlyBlocked = true;
  }
  if (!appendOnlyBlocked) throw new Error('Expected payment_events update to be blocked by append-only trigger');

  console.log(JSON.stringify({
    ok: true,
    pharmacyId: pharmacy.id,
    collectedOrderId: order.id,
    returnedOrderId: returnOrder.id,
    checks: row,
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
