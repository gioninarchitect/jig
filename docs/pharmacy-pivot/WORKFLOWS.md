# Origin Retail Pharmacy Pivot Workflow Specification

Target module: Origin Retail, currently stored in legacy folder `JIGPOS/newbrand`.

Boundary: TNT-ZA remains the main track-and-trace / EU GMP QMS system. These workflows are for the Section 21 retail/pharmacy pickup module.

The existing Section 21 workflow remains in place. These workflows add partner pharmacies as pickup and dispensing partners after Section 21 eligibility and prescription/authorization checks are complete.

## 1. Pharmacy Onboarding

1. Super Admin creates partner pharmacy.
2. System sets pharmacy status to `onboarding`.
3. Pharmacy onboarding documents are uploaded.
4. Admin reviews each document.
5. Responsible pharmacist is added.
6. Pharmacist users are invited and activated.
7. Activation gate checks:
   - license valid
   - required documents approved
   - responsible pharmacist present
   - vault status enabled
   - at least one active pharmacy user
8. System sets pharmacy to `active`.
9. Audit event is written.

## 2. Paid Order to Packed Package

1. Patient/customer places order.
2. System verifies Section 21 eligibility and prescription/authorization reference where required.
3. Patient selects an active partner pharmacy pickup/dispensing point.
4. Payment gateway/manual POP creates `payment_events`.
5. Payment is allocated to consultation, medication, delivery, and other buckets.
6. Order status changes to `paid`.
7. Inventory is reserved by batch.
8. Ops packs order items.
9. Package is created with QR code.
10. Order items are linked to batch/lot/expiry.
11. Inventory movement rows are posted.
12. Order status changes to `packed`.

## 3. Dispatch to Pharmacy

1. Ops scans sealed package.
2. System verifies package is packed and pharmacy is active.
3. Package custody event is written.
4. Order status changes to `shipped_to_pharmacy`.
5. Pharmacy receives inbound notification.
6. Audit event is written.

## 4. Pharmacy Arrival

1. Pharmacist scans package QR.
2. System resolves package and order.
3. System verifies package is expected at this pharmacy.
4. Package custody event is written.
5. Order status changes to `arrived_at_pharmacy`.
6. `arrived_at_pharmacy_at` is set.
7. Customer receives pickup instructions and OTP.
8. Audit event is written.

## 5. Customer Collection

1. Customer presents OTP at pharmacy.
2. Pharmacist opens ready-for-collection queue.
3. Pharmacist verifies OTP.
4. System records OTP success/failure.
5. On success:
   - order status changes to `collected`
   - package status changes to `collected`
   - package custody event is written
   - pharmacy ledger row is posted as `COLLECTION`
   - audit event is written
   - finance reconciliation can now see pharmacy fee accrued

## 6. Uncollected Expiry

1. Nightly job checks orders in `arrived_at_pharmacy` for 21+ days.
2. System changes order status to `uncollected_expired`.
3. System creates return waybill.
4. System creates refund payable.
5. System creates pharmacy return ticket.
6. System writes audit event.
7. Pharmacy sees package in return queue.

## 7. Return to Hub

1. Pharmacy places package in return bin.
2. Pharmacy scans package for return handover.
3. Courier handover custody event is written.
4. Hub scans package receipt.
5. Return waybill status changes to `received_at_hub`.
6. Inventory return movement is posted.
7. Order status changes to `returned_to_hub`.
8. Audit event is written.

## 8. Refund / Credit Note

1. Refund payable is created by expiry, cancellation, stock issue, or manual adjustment.
2. Finance reviews refund payable.
3. Finance approves or voids.
4. Payment/refund event is recorded.
5. Credit note number is assigned where required.
6. Order payment status updates only after refund workflow event.
7. Audit event is written.

## 9. Pharmacy Settlement

1. Finance selects pharmacy and settlement period.
2. System loads accrued ledger rows.
3. System calculates gross fees, returns, adjustments, and net payable.
4. Settlement is generated in `draft`.
5. Finance marks settlement `invoiced`.
6. Finance marks settlement `paid`.
7. Ledger rows are linked to settlement.
8. Audit event is written.

## 10. Exception Handling

Create workflow tickets for:

- Pharmacy onboarding incomplete.
- Pharmacy license expiring/expired.
- Paid order not packed.
- Packed order not dispatched.
- Shipped order not arrived.
- Arrived order uncollected at day 14, day 19, and day 21.
- Collected order without pharmacy ledger row.
- Return requested but not handed to courier.
- Return received without inventory movement.
- Refund payable pending beyond SLA.
- Settlement unpaid beyond SLA.
