# Origin Retail Pharmacy Pivot Production Readiness

## Objective

Move Origin Retail, currently stored in legacy folder `JIGPOS/newbrand`, to a partner-pharmacy pickup model where online payments, pharmacy handling fees, central inventory, package custody, returns, refunds, and settlements are fully persisted and auditable.

Boundary: this is separate from `tnt-za`, which remains the main track-and-trace / EU GMP QMS system.

Section 21 boundary: keep the current Section 21 patient/prescription workflow. Pharmacy pickup is an added dispensing-partner workflow that starts only after the patient/order has the required Section 21 eligibility and prescription/authorization references.

## Non-Negotiable Production Rules

1. Every critical CTA must persist to the database.
2. Every order status change must go through one backend transition service.
3. Every payment event must be recorded as an immutable event.
4. Every financial allocation must be traceable to order, payment, and purpose.
5. Every pharmacy handling fee must be earned through a ledger row.
6. Every stock change must be posted through an inventory movement row.
7. Every package scan must create a custody event.
8. Every refund must be a refunds payable workflow, not just an order status.
9. Every pharmacy action must be linked to a named pharmacist/pharmacy user.
10. Every critical event must write an audit event.

## Production Readiness Checklist

### P0 - Data Foundation

- Add partner pharmacy tables.
- Add pharmacist/pharmacy user tables.
- Add pharmacy onboarding document tables.
- Extend orders for patient, pharmacy, pickup lifecycle, OTP, and timestamps.
- Extend order items for batch, lot, expiry, and inventory movement references.
- Add payment events and payment allocations.
- Add inventory batches and inventory movements.
- Add order packages and package custody events.
- Add pharmacy ledger and settlement tables.
- Add return waybills.
- Add refunds payable.
- Add workflow tickets.
- Add canonical audit events.

### P0 - Transaction Safety

- Wrap order lifecycle actions in database transactions.
- If any linked write fails, roll back the full action.
- Prevent direct status updates outside transition service.
- Prevent stock changes outside inventory movement service.
- Prevent ledger rows outside ledger posting service.
- Add database indexes for order, pharmacy, package, batch, settlement, and audit lookup.

### P0 - Pharmacy Onboarding

- Create partner pharmacy.
- Upload required documents.
- Review and approve/reject documents.
- Add responsible pharmacist.
- Add pharmacist users.
- Validate pharmacy license expiry.
- Validate responsible pharmacist registration.
- Block activation until onboarding is complete.
- Suspend pharmacy when license or key document expires.

### P0 - Order Pickup Lifecycle

Precondition:

- Patient/customer identity exists.
- Section 21 status and prescription/authorization reference are verified where required.
- Partner pharmacy is active, vault-enabled, and approved as a dispensing pickup point.

Required lifecycle:

1. `pending_payment`
2. `paid`
3. `packed`
4. `shipped_to_pharmacy`
5. `arrived_at_pharmacy`
6. `collected`
7. `uncollected_expired`
8. `return_to_hub_requested`
9. `returned_to_hub`
10. `cancelled`
11. `refunded`

Each status change must write:

- current order state
- `order_status_events`
- `audit_events`
- any required linked records, such as package custody, ledger, refund, waybill, or ticket

### P0 - Package and QR Custody

- Create package record at pack stage.
- Generate package QR with package code and order reference.
- Scan package at pack, seal, dispatch, pharmacy arrival, collection, return bin, courier return handover, and hub receipt.
- Store scan payload, actor, location, timestamp, and metadata.

### P0 - Inventory and Batch Controls

- Reserve stock on paid order.
- Pack against batch/lot/expiry.
- Block expired, quarantined, recalled, or insufficient stock.
- Post movement rows for reserve, pack, ship, return, release, adjustment, write-off, and recall.
- Physical return to hub must post inventory return movement.

### P0 - Financial Controls

- Record gateway/manual payment events.
- Allocate payments to consultation fee, medication total, delivery fee, pharmacy fee, refund, or adjustment.
- Earn pharmacy fee only on successful collection.
- Generate settlements from immutable pharmacy ledger rows.
- Create refunds payable for expired/uncollected or cancelled orders.
- Finance must reconcile payment events, allocations, orders, pharmacy ledger, settlements, refunds payable, and inventory movement.

### P0 - 21-Day Uncollected Expiry

Nightly job:

```sql
WHERE order_status = 'arrived_at_pharmacy'
AND arrived_at_pharmacy_at <= CURRENT_DATE - INTERVAL '21 days'
```

Inside one transaction:

1. Set order to `uncollected_expired`.
2. Create `order_status_events`.
3. Create `audit_events`.
4. Create `return_waybills`.
5. Create `refunds_payable`.
6. Create return task in `workflow_tickets`.
7. Notify pharmacy, ops, and finance.

### P1 - Reporting

- Order audit timeline.
- Package custody timeline.
- Pharmacy ledger report.
- Pharmacy settlement report.
- Batch inventory movement report.
- Refunds payable report.
- Exception report.
- Auditor read-only view.

## Production Blockers

These items block production:

- Any CTA that changes UI state without a database write.
- Any stock adjustment without an inventory movement row.
- Any pharmacy fee without a ledger row.
- Any collection without named actor and OTP/counter event.
- Any return without waybill and package custody event.
- Any refund without refunds payable record.
- Any order status changed outside the transition service.
- Any pharmacy active without required onboarding documents.
- Any audit-critical event missing from `audit_events`.

## Go-Live Definition

The pharmacy pivot is production-ready when:

- UAT passes all role scenarios.
- End-to-end UAT and deployment validation pass against the live/staging environment.
- Database migrations are applied cleanly to staging.
- Scheduled jobs are tested manually and automatically.
- Finance reconciliation exports balance.
- Audit timelines are complete and read-only.
- Pharmacy onboarding blocks are proven.
- Package QR scans work across the full custody chain.
- Rollback behaviour is tested for failed linked writes.
