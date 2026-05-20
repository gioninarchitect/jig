# Origin Retail Pharmacy Pivot UAT Plan

Target module: Origin Retail, currently stored in legacy folder `JIGPOS/newbrand`.

Boundary: TNT-ZA remains the main track-and-trace / EU GMP QMS system. This UAT plan is for the Section 21 retail/pharmacy pickup module.

Section 21 remains in scope as the prerequisite workflow. UAT must prove that pharmacy pickup does not bypass Section 21 eligibility, prescription, or authorization controls.

## UAT Goal

Prove that the pharmacy pickup model works end to end with persisted data, role-based actions, financial controls, stock controls, package custody, returns, refunds, and audit visibility.

## Test Roles

- Super Admin
- Ops Admin
- Inventory Admin
- Finance Admin
- Responsible Pharmacist
- Pharmacist
- Pharmacy Assistant
- Auditor

## UAT Scenario 1 - Pharmacy Onboarding

Expected result: pharmacy cannot go active until all required controls pass.

Steps:

1. Super Admin creates partner pharmacy.
2. Upload required onboarding documents.
3. Reject one document.
4. Confirm activation is blocked.
5. Replace rejected document.
6. Approve all required documents.
7. Add responsible pharmacist.
8. Add pharmacist user.
9. Activate pharmacy.
10. Auditor verifies onboarding audit trail.

Pass criteria:

- Required documents are persisted.
- Review decisions are persisted.
- Activation gate blocks incomplete pharmacy.
- Audit events exist.

## UAT Scenario 2 - Paid Order to Pharmacy Dispatch

Expected result: paid order becomes packed and shipped with batch and package records.

Steps:

1. Create patient/customer with valid Section 21 eligibility where required.
2. Create order assigned to active pharmacy pickup/dispensing partner.
3. Confirm Section 21 document/prescription reference is linked to the order.
4. Record payment event.
5. Confirm payment allocation.
6. Reserve batch stock.
7. Pack order item from batch.
8. Generate package QR.
9. Seal package.
10. Dispatch package to pharmacy.

Pass criteria:

- Order status changes are persisted.
- Payment event and allocations exist.
- Inventory movement rows exist.
- Package and custody rows exist.
- Audit events exist.

## UAT Scenario 3 - Pharmacy Arrival and Collection

Expected result: pharmacy collection earns handling fee only after valid OTP collection.

Steps:

1. Pharmacist scans package arrival.
2. Confirm order appears in ready-for-collection queue.
3. Attempt wrong OTP.
4. Confirm failed attempt is recorded.
5. Enter correct OTP.
6. Mark collected.
7. Finance checks pharmacy ledger.

Pass criteria:

- Arrival timestamp is persisted.
- OTP failure and success are auditable.
- Collection changes order and package state.
- Pharmacy ledger row is created.
- Fee is accrued, not paid yet.

## UAT Scenario 4 - 21-Day Uncollected Expiry

Expected result: uncollected orders automatically trigger return and refund workflow.

Steps:

1. Seed an order with `arrived_at_pharmacy_at` older than 21 days.
2. Run expiry job manually.
3. Confirm order status becomes `uncollected_expired`.
4. Confirm return waybill is created.
5. Confirm refund payable is created.
6. Confirm workflow ticket is created.
7. Confirm notifications are queued/sent.

Pass criteria:

- All linked records are created in one transaction.
- Audit events exist.
- Pharmacy sees package in return queue.
- Finance sees refund payable.

## UAT Scenario 5 - Return to Hub

Expected result: returned package closes only after physical hub scan.

Steps:

1. Pharmacy scans package into return bin.
2. Pharmacy scans courier handover.
3. Hub scans returned package.
4. Inventory Admin confirms returned inventory movement.
5. Order changes to `returned_to_hub`.

Pass criteria:

- Return custody events exist.
- Waybill status changes to `received_at_hub`.
- Inventory movement exists.
- Audit events exist.

## UAT Scenario 6 - Settlement

Expected result: finance can settle pharmacy handling fees from ledger rows.

Steps:

1. Finance opens pharmacy ledger.
2. Generate settlement for period.
3. Confirm collected orders included.
4. Confirm returns/reversals included.
5. Mark settlement invoiced.
6. Mark settlement paid.

Pass criteria:

- Settlement totals match ledger rows.
- Ledger rows link to settlement.
- Paid timestamp is persisted.
- Audit event exists.

## UAT Scenario 7 - Auditor Review

Expected result: auditor can inspect but not edit.

Steps:

1. Auditor opens order timeline.
2. Auditor opens package custody timeline.
3. Auditor opens pharmacy ledger.
4. Auditor opens inventory movements.
5. Auditor attempts restricted edit.

Pass criteria:

- Auditor can view all required records.
- Auditor cannot mutate operational or financial data.
- Access attempt is denied and logged.

## UAT Exit Criteria

UAT passes when:

- All P0 scenarios pass without mock data shortcuts.
- Every CTA writes database records.
- Rollback tests prove partial writes do not persist.
- Finance reconciliation balances.
- Audit trail is complete.
- Role permissions are enforced.
- Scheduled expiry job works manually and automatically.
