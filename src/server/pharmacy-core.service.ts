import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { query, withTransaction } from './db';

type Actor = {
  actorType: 'user' | 'pharmacy_user' | 'system' | 'internal';
  actorId?: string;
  ipAddress?: string;
};

type Json = Record<string, unknown>;

function otpHash(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

function packageCode(orderNumber: string): string {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `PKG-${orderNumber}-${suffix}`;
}

function settlementNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PHS-${stamp}-${suffix}`;
}

async function audit(
  tx: PoolClient,
  entityType: string,
  entityId: string,
  eventType: string,
  actor: Actor,
  metadata: Json = {},
  beforeState?: Json | null,
  afterState?: Json | null,
): Promise<void> {
  await tx.query(
    `INSERT INTO audit_events (
      entity_type, entity_id, event_type, actor_type, actor_id,
      before_state, after_state, metadata, ip_address
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      entityType,
      entityId,
      eventType,
      actor.actorType,
      actor.actorId ?? null,
      beforeState ? JSON.stringify(beforeState) : null,
      afterState ? JSON.stringify(afterState) : null,
      JSON.stringify(metadata),
      actor.ipAddress ?? null,
    ],
  );
}

async function transitionOrder(
  tx: PoolClient,
  orderId: string,
  toStatus: string,
  actor: Actor,
  reasonCode: string,
  metadata: Json = {},
): Promise<Record<string, unknown>> {
  const current = await tx.query('SELECT * FROM pharmacy_orders WHERE id = $1 FOR UPDATE', [orderId]);
  if (current.rowCount === 0) {
    throw new Error('Pharmacy order not found');
  }

  const before = current.rows[0] as Record<string, unknown>;
  const fromStatus = before.status as string;

  const timestampColumn: Record<string, string> = {
    arrived_at_pharmacy: 'arrived_at_pharmacy_at',
    collected: 'collected_at',
    uncollected_expired: 'uncollected_expired_at',
    returned_to_hub: 'returned_to_hub_at',
  };

  const sets = ['status = $2', 'updated_at = NOW()'];
  const params: unknown[] = [orderId, toStatus];
  if (timestampColumn[toStatus]) {
    sets.push(`${timestampColumn[toStatus]} = NOW()`);
  }

  const updated = await tx.query(
    `UPDATE pharmacy_orders SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );

  await tx.query(
    `INSERT INTO order_status_events (
      order_id, from_status, to_status, reason_code, actor_type, actor_id, metadata
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      orderId,
      fromStatus,
      toStatus,
      reasonCode,
      actor.actorType,
      actor.actorId ?? null,
      JSON.stringify(metadata),
    ],
  );

  await audit(
    tx,
    'pharmacy_order',
    orderId,
    `order.${toStatus}`,
    actor,
    { reasonCode, ...metadata },
    before,
    updated.rows[0] as Record<string, unknown>,
  );

  return updated.rows[0] as Record<string, unknown>;
}

async function assertPharmacyActive(tx: PoolClient, pharmacyId: string): Promise<Record<string, unknown>> {
  const result = await tx.query('SELECT * FROM partner_pharmacies WHERE id = $1 FOR UPDATE', [pharmacyId]);
  if (result.rowCount === 0) throw new Error('Partner pharmacy not found');
  const pharmacy = result.rows[0] as Record<string, unknown>;
  if (pharmacy.status !== 'active' || pharmacy.vault_status !== true) {
    throw new Error('Partner pharmacy is not active and vault-enabled');
  }
  if (pharmacy.license_expiry && new Date(pharmacy.license_expiry as string) < new Date()) {
    throw new Error('Partner pharmacy license is expired');
  }
  return pharmacy;
}

async function handlingFee(tx: PoolClient, pharmacyId: string, total: number): Promise<number> {
  const { rows } = await tx.query(
    'SELECT handling_fee_type, handling_fee_value FROM partner_pharmacies WHERE id = $1',
    [pharmacyId],
  );
  if (rows.length === 0) throw new Error('Partner pharmacy not found');
  const row = rows[0] as { handling_fee_type: string; handling_fee_value: string };
  const value = Number(row.handling_fee_value);
  if (row.handling_fee_type === 'PERCENT') return Number((total * (value / 100)).toFixed(2));
  return Number(value.toFixed(2));
}

export async function createPharmacy(data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const { rows } = await tx.query(
      `INSERT INTO partner_pharmacies (
        facility_name, pharmacy_registration_number, license_number, license_expiry,
        responsible_pharmacist_name, responsible_pharmacist_email, responsible_pharmacist_registration,
        contact_email, contact_phone, address_street, address_city, address_province,
        address_postal_code, handling_fee_type, handling_fee_value, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        data.facilityName,
        data.pharmacyRegistrationNumber ?? null,
        data.licenseNumber ?? null,
        data.licenseExpiry ?? null,
        data.responsiblePharmacistName ?? null,
        data.responsiblePharmacistEmail ?? null,
        data.responsiblePharmacistRegistration ?? null,
        data.contactEmail ?? null,
        data.contactPhone ?? null,
        data.addressStreet ?? null,
        data.addressCity ?? null,
        data.addressProvince ?? null,
        data.addressPostalCode ?? null,
        data.handlingFeeType ?? 'FLAT',
        data.handlingFeeValue ?? 0,
        actor.actorId ?? null,
      ],
    );
    await audit(tx, 'partner_pharmacy', rows[0].id, 'pharmacy.created', actor, {}, null, rows[0]);
    return rows[0];
  });
}

export async function listPharmacies(filters: { status?: string }) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM partner_pharmacies ${clause} ORDER BY facility_name`, params);
  return rows;
}

export async function addPharmacyDocument(pharmacyId: string, data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const { rows } = await tx.query(
      `INSERT INTO pharmacy_onboarding_documents (
        pharmacy_id, doc_type, file_name, file_path, file_size, mime_type, expiry_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (pharmacy_id, doc_type)
      DO UPDATE SET file_name = EXCLUDED.file_name, file_path = EXCLUDED.file_path,
        file_size = EXCLUDED.file_size, mime_type = EXCLUDED.mime_type, expiry_date = EXCLUDED.expiry_date,
        status = 'pending', reviewed_by = NULL, reviewed_at = NULL, admin_notes = NULL, updated_at = NOW()
      RETURNING *`,
      [
        pharmacyId,
        data.docType,
        data.fileName ?? null,
        data.filePath ?? null,
        data.fileSize ?? null,
        data.mimeType ?? null,
        data.expiryDate ?? null,
      ],
    );
    await audit(tx, 'partner_pharmacy', pharmacyId, 'pharmacy.document_uploaded', actor, { docType: data.docType }, null, rows[0]);
    return rows[0];
  });
}

export async function reviewPharmacyDocument(pharmacyId: string, documentId: string, data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const before = await tx.query(
      'SELECT * FROM pharmacy_onboarding_documents WHERE id = $1 AND pharmacy_id = $2 FOR UPDATE',
      [documentId, pharmacyId],
    );
    if (before.rowCount === 0) throw new Error('Pharmacy document not found');
    const { rows } = await tx.query(
      `UPDATE pharmacy_onboarding_documents
       SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $4 AND pharmacy_id = $5 RETURNING *`,
      [data.status, data.adminNotes ?? null, actor.actorId ?? null, documentId, pharmacyId],
    );
    await audit(tx, 'partner_pharmacy', pharmacyId, 'pharmacy.document_reviewed', actor, { documentId, status: data.status }, before.rows[0], rows[0]);
    return rows[0];
  });
}

export async function addPharmacyUser(pharmacyId: string, data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const { rows } = await tx.query(
      `INSERT INTO pharmacy_users (
        pharmacy_id, external_user_id, email, name, role, registration_number,
        can_scan_arrivals, can_release_collections, can_mark_returns, can_view_settlements, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (pharmacy_id, email)
      DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, registration_number = EXCLUDED.registration_number,
        can_scan_arrivals = EXCLUDED.can_scan_arrivals, can_release_collections = EXCLUDED.can_release_collections,
        can_mark_returns = EXCLUDED.can_mark_returns, can_view_settlements = EXCLUDED.can_view_settlements,
        active = TRUE, updated_at = NOW()
      RETURNING *`,
      [
        pharmacyId,
        data.externalUserId ?? null,
        data.email,
        data.name,
        data.role,
        data.registrationNumber ?? null,
        Boolean(data.canScanArrivals),
        Boolean(data.canReleaseCollections),
        Boolean(data.canMarkReturns),
        Boolean(data.canViewSettlements),
        actor.actorId ?? null,
      ],
    );
    await audit(tx, 'partner_pharmacy', pharmacyId, 'pharmacy.user_upserted', actor, { email: data.email, role: data.role }, null, rows[0]);
    return rows[0];
  });
}

export async function activatePharmacy(pharmacyId: string, actor: Actor) {
  return withTransaction(async (tx) => {
    const required = ['pharmacy_license', 'responsible_pharmacist_registration', 'bank_confirmation', 'signed_partner_agreement', 'storage_sop'];
    const docs = await tx.query(
      'SELECT doc_type FROM pharmacy_onboarding_documents WHERE pharmacy_id = $1 AND status = $2',
      [pharmacyId, 'approved'],
    );
    const approved = new Set(docs.rows.map((r) => r.doc_type));
    const missing = required.filter((doc) => !approved.has(doc));
    if (missing.length > 0) {
      throw new Error(`Cannot activate pharmacy. Missing approved documents: ${missing.join(', ')}`);
    }
    const users = await tx.query(
      `SELECT id FROM pharmacy_users
       WHERE pharmacy_id = $1 AND active = TRUE AND role = 'RESPONSIBLE_PHARMACIST'`,
      [pharmacyId],
    );
    if (users.rowCount === 0) throw new Error('Cannot activate pharmacy without an active responsible pharmacist');

    const before = await tx.query('SELECT * FROM partner_pharmacies WHERE id = $1 FOR UPDATE', [pharmacyId]);
    if (before.rowCount === 0) throw new Error('Partner pharmacy not found');
    const { rows } = await tx.query(
      `UPDATE partner_pharmacies
       SET status = 'active', vault_status = TRUE, activated_at = NOW(), activated_by = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [actor.actorId ?? null, pharmacyId],
    );
    await audit(tx, 'partner_pharmacy', pharmacyId, 'pharmacy.activated', actor, {}, before.rows[0], rows[0]);
    return rows[0];
  });
}

export async function createPharmacyOrder(data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    if (!Array.isArray(data.items) || data.items.length === 0) throw new Error('At least one order item is required');
    await assertPharmacyActive(tx, data.pharmacyId as string);
    const total = Number(data.total ?? 0);
    const feeEstimate = await handlingFee(tx, data.pharmacyId as string, total);
    const collectionOtp = data.collectionOtp ? otpHash(String(data.collectionOtp)) : null;

    const { rows } = await tx.query(
      `INSERT INTO pharmacy_orders (
        external_order_id, order_number, patient_id, pharmacy_id, consultation_fee,
        medication_total, delivery_fee, pharmacy_handling_fee_estimate, total, status,
        gateway_payment_reference, collection_otp_hash, collection_otp_expires_at, metadata,
        section21_document_ref, prescription_reference, prescriber_reference,
        section21_verified, dispensing_partner_confirmed
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [
        data.externalOrderId ?? null,
        data.orderNumber,
        data.patientId ?? null,
        data.pharmacyId,
        data.consultationFee ?? 0,
        data.medicationTotal ?? total,
        data.deliveryFee ?? 0,
        feeEstimate,
        total,
        data.status ?? 'pending_payment',
        data.gatewayPaymentReference ?? null,
        collectionOtp,
        data.collectionOtpExpiresAt ?? null,
        JSON.stringify(data.metadata ?? {}),
        data.section21DocumentRef ?? null,
        data.prescriptionReference ?? null,
        data.prescriberReference ?? null,
        Boolean(data.section21Verified),
        Boolean(data.dispensingPartnerConfirmed),
      ],
    );
    const order = rows[0];
    for (const item of data.items as Json[]) {
      await tx.query(
        `INSERT INTO pharmacy_order_items (
          order_id, external_product_id, sku, name, quantity, unit_price, total_price
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          order.id,
          item.externalProductId ?? null,
          item.sku ?? null,
          item.name,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
        ],
      );
    }
    await transitionOrder(tx, order.id, order.status as string, actor, 'order_created', { orderNumber: data.orderNumber });
    return order;
  });
}

export async function getPharmacyOrder(orderId: string) {
  const order = await query('SELECT * FROM pharmacy_orders WHERE id = $1', [orderId]);
  if (order.rowCount === 0) throw new Error('Pharmacy order not found');
  const [items, packages, statusEvents, custodyEvents, inventoryMovements, ledger, refunds, returns] = await Promise.all([
    query('SELECT * FROM pharmacy_order_items WHERE order_id = $1 ORDER BY created_at, id', [orderId]),
    query('SELECT * FROM order_packages WHERE order_id = $1 ORDER BY created_at, id', [orderId]),
    query('SELECT * FROM order_status_events WHERE order_id = $1 ORDER BY created_at, id', [orderId]),
    query(
      `SELECT pce.*
       FROM package_custody_events pce
       JOIN order_packages op ON op.id = pce.package_id
       WHERE op.order_id = $1
       ORDER BY pce.created_at, pce.id`,
      [orderId],
    ),
    query('SELECT * FROM inventory_movements WHERE order_id = $1 ORDER BY created_at, id', [orderId]),
    query('SELECT * FROM pharmacy_ledger WHERE order_id = $1 ORDER BY created_at, id', [orderId]),
    query('SELECT * FROM refunds_payable WHERE order_id = $1 ORDER BY created_at, id', [orderId]),
    query('SELECT * FROM return_waybills WHERE order_id = $1 ORDER BY requested_at, id', [orderId]),
  ]);
  return {
    order: order.rows[0],
    items: items.rows,
    packages: packages.rows,
    statusEvents: statusEvents.rows,
    custodyEvents: custodyEvents.rows,
    inventoryMovements: inventoryMovements.rows,
    ledger: ledger.rows,
    refunds: refunds.rows,
    returns: returns.rows,
  };
}

export async function confirmSection21Dispensing(orderId: string, data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const before = await tx.query('SELECT * FROM pharmacy_orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (before.rowCount === 0) throw new Error('Pharmacy order not found');
    if (!data.section21DocumentRef && !data.prescriptionReference) {
      throw new Error('Section 21 document or prescription reference is required');
    }

    const { rows } = await tx.query(
      `UPDATE pharmacy_orders
       SET section21_document_ref = COALESCE($1, section21_document_ref),
           prescription_reference = COALESCE($2, prescription_reference),
           prescriber_reference = COALESCE($3, prescriber_reference),
           section21_verified = TRUE,
           dispensing_partner_confirmed = TRUE,
           metadata = metadata || $4::jsonb,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        data.section21DocumentRef ?? null,
        data.prescriptionReference ?? null,
        data.prescriberReference ?? null,
        JSON.stringify({ section21ConfirmedAt: new Date().toISOString(), ...(data.metadata ?? {}) }),
        orderId,
      ],
    );

    await audit(
      tx,
      'pharmacy_order',
      orderId,
      'section21.dispensing_confirmed',
      actor,
      {
        section21DocumentRef: data.section21DocumentRef ?? null,
        prescriptionReference: data.prescriptionReference ?? null,
        prescriberReference: data.prescriberReference ?? null,
      },
      before.rows[0],
      rows[0],
    );

    return rows[0];
  });
}

export async function recordPayment(orderId: string, data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const payment = await tx.query(
      `INSERT INTO payment_events (order_id, gateway, gateway_reference, event_type, amount, currency, raw_payload, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        orderId,
        data.gateway ?? 'manual',
        data.gatewayReference ?? null,
        data.eventType ?? 'paid',
        data.amount,
        data.currency ?? 'ZAR',
        JSON.stringify(data.rawPayload ?? {}),
        actor.actorId ?? null,
      ],
    );
    const allocations = Array.isArray(data.allocations) ? data.allocations : [];
    for (const allocation of allocations as Json[]) {
      await tx.query(
        `INSERT INTO payment_allocations (order_id, payment_event_id, allocation_type, amount)
         VALUES ($1,$2,$3,$4)`,
        [orderId, payment.rows[0].id, allocation.allocationType, allocation.amount],
      );
    }
    if (['paid', 'manual_pop_approved'].includes(String(data.eventType ?? 'paid'))) {
      await tx.query(
        `UPDATE pharmacy_orders SET payment_status = 'PAID', updated_at = NOW() WHERE id = $1`,
        [orderId],
      );
      await transitionOrder(tx, orderId, 'paid', actor, 'payment_recorded', { paymentEventId: payment.rows[0].id });
    } else if (data.eventType === 'refunded') {
      await tx.query(
        `UPDATE pharmacy_orders SET payment_status = 'REFUNDED', updated_at = NOW() WHERE id = $1`,
        [orderId],
      );
    }
    return payment.rows[0];
  });
}

export async function createInventoryBatch(data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const { rows } = await tx.query(
      `INSERT INTO inventory_batches (
        external_product_id, sku, product_name, batch_number, lot_number,
        expiry_date, quantity_on_hand, quantity_reserved, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (sku, batch_number, lot_number)
      DO UPDATE SET product_name = EXCLUDED.product_name,
        expiry_date = EXCLUDED.expiry_date,
        quantity_on_hand = EXCLUDED.quantity_on_hand,
        quantity_reserved = EXCLUDED.quantity_reserved,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *`,
      [
        data.externalProductId ?? null,
        data.sku ?? null,
        data.productName ?? null,
        data.batchNumber,
        data.lotNumber ?? '',
        data.expiryDate ?? null,
        data.quantityOnHand ?? 0,
        data.quantityReserved ?? 0,
        data.status ?? 'available',
      ],
    );

    await tx.query(
      `INSERT INTO inventory_movements (
        inventory_batch_id, movement_type, quantity_delta, balance_after, reason_code, performed_by
      ) VALUES ($1,'receipt',$2,$3,$4,$5)`,
      [rows[0].id, data.quantityOnHand ?? 0, data.quantityOnHand ?? 0, 'batch_created_or_replaced', actor.actorId ?? null],
    );
    await audit(tx, 'inventory_batch', rows[0].id, 'inventory.batch_upserted', actor, {}, null, rows[0]);
    return rows[0];
  });
}

export async function packOrder(orderId: string, data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const order = await tx.query('SELECT * FROM pharmacy_orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (order.rowCount === 0) throw new Error('Pharmacy order not found');
    const code = packageCode(order.rows[0].order_number);
    const qr = JSON.stringify({ type: 'pharmacy_package', packageCode: code, orderId, orderNumber: order.rows[0].order_number });
    const pkg = await tx.query(
      `INSERT INTO order_packages (order_id, package_code, qr_payload, status)
       VALUES ($1,$2,$3,'packed') RETURNING *`,
      [orderId, code, qr],
    );

    if (Array.isArray(data.items)) {
      for (const item of data.items as Json[]) {
        const batch = await tx.query('SELECT * FROM inventory_batches WHERE id = $1 FOR UPDATE', [item.inventoryBatchId]);
        if (batch.rowCount === 0) throw new Error('Inventory batch not found');
        const batchRow = batch.rows[0] as Record<string, unknown>;
        if (!['available'].includes(batchRow.status as string)) throw new Error('Inventory batch is not available');
        const quantity = Number(item.quantity);
        const current = Number(batchRow.quantity_on_hand);
        if (current < quantity) throw new Error('Insufficient inventory batch quantity');
        const balanceAfter = current - quantity;
        await tx.query(
          `UPDATE inventory_batches SET quantity_on_hand = $1, updated_at = NOW() WHERE id = $2`,
          [balanceAfter, item.inventoryBatchId],
        );
        const movement = await tx.query(
          `INSERT INTO inventory_movements (
            inventory_batch_id, order_id, order_item_id, package_id, movement_type,
            quantity_delta, balance_after, reason_code, performed_by
          ) VALUES ($1,$2,$3,$4,'pack',$5,$6,$7,$8) RETURNING *`,
          [item.inventoryBatchId, orderId, item.orderItemId ?? null, pkg.rows[0].id, -quantity, balanceAfter, 'order_pack', actor.actorId ?? null],
        );
        if (item.orderItemId) {
          await tx.query(
            `UPDATE pharmacy_order_items
             SET batch_number = $1, lot_number = $2, expiry_date = $3, packed_inventory_movement_id = $4
             WHERE id = $5`,
            [batchRow.batch_number, batchRow.lot_number, batchRow.expiry_date, movement.rows[0].id, item.orderItemId],
          );
        }
      }
    }

    await tx.query(
      `INSERT INTO package_custody_events (package_id, event_type, actor_type, actor_id, location_type, location_id, scan_payload, metadata)
       VALUES ($1,'packed',$2,$3,$4,$5,$6,$7)`,
      [pkg.rows[0].id, actor.actorType, actor.actorId ?? null, data.locationType ?? 'hub', data.locationId ?? null, code, JSON.stringify(data.metadata ?? {})],
    );
    await transitionOrder(tx, orderId, 'packed', actor, 'order_packed', { packageId: pkg.rows[0].id });
    return pkg.rows[0];
  });
}

export async function dispatchToPharmacy(orderId: string, data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const pkg = await tx.query('SELECT * FROM order_packages WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE', [orderId]);
    if (pkg.rowCount === 0) throw new Error('Package not found for order');
    await tx.query(
      `UPDATE order_packages SET status = 'shipped_to_pharmacy', updated_at = NOW() WHERE id = $1`,
      [pkg.rows[0].id],
    );
    await tx.query(
      `INSERT INTO package_custody_events (package_id, event_type, actor_type, actor_id, location_type, location_id, scan_payload, metadata)
       VALUES ($1,'dispatched',$2,$3,'courier',$4,$5,$6)`,
      [pkg.rows[0].id, actor.actorType, actor.actorId ?? null, data.courierName ?? null, data.scanPayload ?? pkg.rows[0].package_code, JSON.stringify(data.metadata ?? {})],
    );
    await transitionOrder(tx, orderId, 'shipped_to_pharmacy', actor, 'dispatch_to_pharmacy', data);
    return { packageId: pkg.rows[0].id };
  });
}

export async function pharmacyArrival(orderId: string, data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const order = await tx.query('SELECT * FROM pharmacy_orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (order.rowCount === 0) throw new Error('Pharmacy order not found');
    await assertPharmacyActive(tx, order.rows[0].pharmacy_id);
    const pkg = await tx.query('SELECT * FROM order_packages WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE', [orderId]);
    if (pkg.rowCount === 0) throw new Error('Package not found for order');
    await tx.query(`UPDATE order_packages SET status = 'arrived_at_pharmacy', updated_at = NOW() WHERE id = $1`, [pkg.rows[0].id]);
    await tx.query(
      `INSERT INTO package_custody_events (package_id, event_type, actor_type, actor_id, location_type, location_id, scan_payload, metadata)
       VALUES ($1,'pharmacy_received',$2,$3,'pharmacy',$4,$5,$6)`,
      [pkg.rows[0].id, actor.actorType, actor.actorId ?? null, order.rows[0].pharmacy_id, data.scanPayload ?? pkg.rows[0].package_code, JSON.stringify(data.metadata ?? {})],
    );
    return transitionOrder(tx, orderId, 'arrived_at_pharmacy', actor, 'pharmacy_arrival', { packageId: pkg.rows[0].id });
  });
}

export async function verifyCollectionOtp(orderId: string, pin: string, actor: Actor) {
  return withTransaction(async (tx) => {
    return verifyCollectionOtpTx(tx, orderId, pin, actor);
  });
}

async function verifyCollectionOtpTx(tx: PoolClient, orderId: string, pin: string, actor: Actor) {
  const order = await tx.query('SELECT id, collection_otp_hash, collection_otp_expires_at FROM pharmacy_orders WHERE id = $1', [orderId]);
  if (order.rowCount === 0) throw new Error('Pharmacy order not found');
  const row = order.rows[0] as Record<string, unknown>;
  const expired = row.collection_otp_expires_at && new Date(row.collection_otp_expires_at as string) < new Date();
  const valid = !expired && row.collection_otp_hash === otpHash(pin);
  await audit(tx, 'pharmacy_order', orderId, valid ? 'collection_otp.valid' : 'collection_otp.invalid', actor, { expired: Boolean(expired) });
  return { valid, expired: Boolean(expired) };
}

export async function collectOrder(orderId: string, data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const otp = await verifyCollectionOtpTx(tx, orderId, String(data.collectionOtp), actor);
    if (!otp.valid) throw new Error('Invalid or expired collection OTP');
    const order = await tx.query('SELECT * FROM pharmacy_orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (order.rowCount === 0) throw new Error('Pharmacy order not found');
    const pkg = await tx.query('SELECT * FROM order_packages WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE', [orderId]);
    if (pkg.rowCount === 0) throw new Error('Package not found for order');
    const fee = await handlingFee(tx, order.rows[0].pharmacy_id, Number(order.rows[0].total));
    await tx.query(`UPDATE order_packages SET status = 'collected', updated_at = NOW() WHERE id = $1`, [pkg.rows[0].id]);
    await tx.query(
      `INSERT INTO package_custody_events (package_id, event_type, actor_type, actor_id, location_type, location_id, scan_payload, metadata)
       VALUES ($1,'customer_collected',$2,$3,'pharmacy',$4,$5,$6)`,
      [pkg.rows[0].id, actor.actorType, actor.actorId ?? null, order.rows[0].pharmacy_id, data.scanPayload ?? pkg.rows[0].package_code, JSON.stringify(data.metadata ?? {})],
    );
    const ledger = await tx.query(
      `INSERT INTO pharmacy_ledger (pharmacy_id, order_id, package_id, action_type, fee_earned, performed_by)
       VALUES ($1,$2,$3,'COLLECTION',$4,$5) RETURNING *`,
      [order.rows[0].pharmacy_id, orderId, pkg.rows[0].id, fee, actor.actorId ?? null],
    );
    const updated = await transitionOrder(tx, orderId, 'collected', actor, 'customer_collection', { ledgerId: ledger.rows[0].id });
    return { order: updated, ledger: ledger.rows[0] };
  });
}

export async function requestReturn(orderId: string, data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    return requestReturnTx(tx, orderId, data, actor);
  });
}

async function requestReturnTx(tx: PoolClient, orderId: string, data: Json, actor: Actor) {
  const order = await tx.query('SELECT * FROM pharmacy_orders WHERE id = $1 FOR UPDATE', [orderId]);
  if (order.rowCount === 0) throw new Error('Pharmacy order not found');
  const pkg = await tx.query('SELECT * FROM order_packages WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE', [orderId]);
  const packageId = pkg.rows[0]?.id ?? null;
  if (packageId) {
    await tx.query(`UPDATE order_packages SET status = 'return_requested', updated_at = NOW() WHERE id = $1`, [packageId]);
  }
  const waybill = await tx.query(
    `INSERT INTO return_waybills (order_id, package_id, pharmacy_id, waybill_number, courier_name, created_by, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [orderId, packageId, order.rows[0].pharmacy_id, data.waybillNumber ?? null, data.courierName ?? null, actor.actorId ?? null, JSON.stringify(data.metadata ?? {})],
  );
  const refund = await tx.query(
    `INSERT INTO refunds_payable (order_id, patient_id, amount, reason_code, linked_payment_reference)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [orderId, order.rows[0].patient_id, data.refundAmount ?? order.rows[0].total, data.reasonCode ?? 'uncollected_expired', order.rows[0].gateway_payment_reference],
  );
  await tx.query(
    `INSERT INTO workflow_tickets (ticket_type, entity_type, entity_id, priority, assigned_role, due_at)
     VALUES ('return_required','pharmacy_order',$1,'high','PHARMACY_ADMIN', NOW() + INTERVAL '2 days')`,
    [orderId],
  );
  await transitionOrder(tx, orderId, 'return_to_hub_requested', actor, 'return_requested', { waybillId: waybill.rows[0].id, refundId: refund.rows[0].id });
  return { waybill: waybill.rows[0], refund: refund.rows[0] };
}

export async function receiveReturn(orderId: string, data: Json, actor: Actor) {
  return withTransaction(async (tx) => {
    const pkg = await tx.query('SELECT * FROM order_packages WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE', [orderId]);
    if (pkg.rowCount === 0) throw new Error('Package not found for order');
    await tx.query(`UPDATE order_packages SET status = 'returned_to_hub', updated_at = NOW() WHERE id = $1`, [pkg.rows[0].id]);
    await tx.query(
      `INSERT INTO package_custody_events (package_id, event_type, actor_type, actor_id, location_type, location_id, scan_payload, metadata)
       VALUES ($1,'hub_received',$2,$3,'hub',$4,$5,$6)`,
      [pkg.rows[0].id, actor.actorType, actor.actorId ?? null, data.locationId ?? null, data.scanPayload ?? pkg.rows[0].package_code, JSON.stringify(data.metadata ?? {})],
    );
    await tx.query(`UPDATE return_waybills SET status = 'received_at_hub', received_at_hub_at = NOW() WHERE order_id = $1`, [orderId]);

    const packedItems = await tx.query(
      `SELECT oi.id, oi.quantity, oi.packed_inventory_movement_id, im.inventory_batch_id
       FROM pharmacy_order_items oi
       JOIN inventory_movements im ON im.id = oi.packed_inventory_movement_id
       WHERE oi.order_id = $1 AND oi.packed_inventory_movement_id IS NOT NULL`,
      [orderId],
    );
    for (const item of packedItems.rows) {
      const batch = await tx.query('SELECT * FROM inventory_batches WHERE id = $1 FOR UPDATE', [item.inventory_batch_id]);
      if (batch.rowCount === 0) continue;
      const balanceAfter = Number(batch.rows[0].quantity_on_hand) + Number(item.quantity);
      await tx.query(
        'UPDATE inventory_batches SET quantity_on_hand = $1, updated_at = NOW() WHERE id = $2',
        [balanceAfter, item.inventory_batch_id],
      );
      const movement = await tx.query(
        `INSERT INTO inventory_movements (
          inventory_batch_id, order_id, order_item_id, package_id, movement_type,
          quantity_delta, balance_after, reason_code, performed_by
        ) VALUES ($1,$2,$3,$4,'return_to_hub',$5,$6,$7,$8) RETURNING *`,
        [item.inventory_batch_id, orderId, item.id, pkg.rows[0].id, item.quantity, balanceAfter, 'physical_return_scan', actor.actorId ?? null],
      );
      await tx.query(
        'UPDATE pharmacy_order_items SET returned_inventory_movement_id = $1 WHERE id = $2',
        [movement.rows[0].id, item.id],
      );
    }

    await transitionOrder(tx, orderId, 'returned_to_hub', actor, 'return_received_at_hub', { packageId: pkg.rows[0].id });
    return { packageId: pkg.rows[0].id };
  });
}

export async function runUncollectedExpiry(actor: Actor) {
  return withTransaction(async (tx) => {
    const orders = await tx.query(
      `SELECT id FROM pharmacy_orders
       WHERE status = 'arrived_at_pharmacy'
       AND arrived_at_pharmacy_at <= NOW() - INTERVAL '21 days'
       FOR UPDATE`,
    );
    const results = [];
    for (const row of orders.rows) {
      await transitionOrder(tx, row.id, 'uncollected_expired', actor, 'uncollected_21_day_expiry');
      const created = await requestReturnTx(tx, row.id, { reasonCode: 'uncollected_expired' }, actor);
      results.push({ orderId: row.id, ...created });
    }
    return results;
  });
}

export async function createSettlement(pharmacyId: string, periodStart: string, periodEnd: string, actor: Actor) {
  return withTransaction(async (tx) => {
    const totals = await tx.query(
      `SELECT
        COALESCE(SUM(fee_earned) FILTER (WHERE action_type = 'COLLECTION'), 0) AS gross,
        COALESCE(SUM(fee_earned) FILTER (WHERE action_type = 'RETURN'), 0) AS returns,
        COALESCE(SUM(fee_earned) FILTER (WHERE action_type IN ('REVERSAL','ADJUSTMENT')), 0) AS adjustments
       FROM pharmacy_ledger
       WHERE pharmacy_id = $1 AND payout_status = 'ACCRUED'
       AND created_at::date BETWEEN $2::date AND $3::date`,
      [pharmacyId, periodStart, periodEnd],
    );
    const gross = Number(totals.rows[0].gross);
    const returns = Number(totals.rows[0].returns);
    const adjustments = Number(totals.rows[0].adjustments);
    const net = gross + returns + adjustments;
    const settlement = await tx.query(
      `INSERT INTO pharmacy_settlements (
        settlement_number, pharmacy_id, period_start, period_end, gross_fee_total,
        return_fee_total, adjustment_total, net_payable
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [settlementNumber(), pharmacyId, periodStart, periodEnd, gross, returns, adjustments, net],
    );
    await tx.query(
      `UPDATE pharmacy_ledger
       SET settlement_id = $1, payout_status = 'INVOICED'
       WHERE pharmacy_id = $2 AND payout_status = 'ACCRUED'
       AND created_at::date BETWEEN $3::date AND $4::date`,
      [settlement.rows[0].id, pharmacyId, periodStart, periodEnd],
    );
    await audit(tx, 'pharmacy_settlement', settlement.rows[0].id, 'settlement.created', actor, { pharmacyId, periodStart, periodEnd });
    return settlement.rows[0];
  });
}

export async function updateSettlementStatus(settlementId: string, status: 'invoiced' | 'paid' | 'cancelled', actor: Actor) {
  return withTransaction(async (tx) => {
    const before = await tx.query('SELECT * FROM pharmacy_settlements WHERE id = $1 FOR UPDATE', [settlementId]);
    if (before.rowCount === 0) throw new Error('Settlement not found');
    const { rows } = await tx.query(
      `UPDATE pharmacy_settlements
       SET status = $1, paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, settlementId],
    );
    if (status === 'paid') {
      await tx.query(`UPDATE pharmacy_ledger SET payout_status = 'PAID' WHERE settlement_id = $1`, [settlementId]);
    }
    await audit(tx, 'pharmacy_settlement', settlementId, `settlement.${status}`, actor, {}, before.rows[0], rows[0]);
    return rows[0];
  });
}

export async function updateRefundStatus(refundId: string, status: 'approved' | 'paid' | 'voided', actor: Actor) {
  return withTransaction(async (tx) => {
    const before = await tx.query('SELECT * FROM refunds_payable WHERE id = $1 FOR UPDATE', [refundId]);
    if (before.rowCount === 0) throw new Error('Refund payable not found');
    const { rows } = await tx.query(
      `UPDATE refunds_payable
       SET status = $1,
           approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END,
           paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END
       WHERE id = $2 RETURNING *`,
      [status, refundId],
    );
    if (status === 'paid') {
      await tx.query(`UPDATE pharmacy_orders SET payment_status = 'REFUNDED', updated_at = NOW() WHERE id = $1`, [rows[0].order_id]);
    }
    await audit(tx, 'refund_payable', refundId, `refund.${status}`, actor, {}, before.rows[0], rows[0]);
    return rows[0];
  });
}

export async function listRows(table: string, filters: Json = {}) {
  const allowed = new Set([
    'pharmacy_orders',
    'payment_events',
    'payment_allocations',
    'pharmacy_ledger',
    'pharmacy_settlements',
    'refunds_payable',
    'return_waybills',
    'workflow_tickets',
    'audit_events',
    'inventory_batches',
    'inventory_movements',
    'order_packages',
    'package_custody_events',
  ]);
  if (!allowed.has(table)) throw new Error('Unsupported table');
  const params: unknown[] = [];
  const where: string[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    params.push(value);
    where.push(`${key} = $${params.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM ${table} ${clause} ORDER BY created_at DESC LIMIT 200`, params);
  return rows;
}
