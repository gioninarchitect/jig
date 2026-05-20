# Origin Retail Pharmacy Pivot API and CTA Queue

Target module: Origin Retail, currently stored in legacy folder `JIGPOS/newbrand`.

Boundary: TNT-ZA remains the main track-and-trace / EU GMP QMS system. These APIs/CTAs belong to the Section 21 retail/pharmacy module.

Keep the existing Section 21 workflow. These APIs add pharmacy pickup and dispensing-partner CTAs after Section 21 eligibility and prescription/authorization references are present.

## Roles

- `SUPER_ADMIN`
- `FINANCE_ADMIN`
- `OPS_ADMIN`
- `INVENTORY_ADMIN`
- `PHARMACY_ADMIN`
- `RESPONSIBLE_PHARMACIST`
- `PHARMACIST`
- `PHARMACY_ASSISTANT`
- `AUDITOR`

## P0 Admin APIs

- `POST /pharmacies`
- `GET /pharmacies`
- `GET /pharmacies/:id`
- `PATCH /pharmacies/:id`
- `POST /pharmacies/:id/documents`
- `PATCH /pharmacies/:id/documents/:documentId/review`
- `POST /pharmacies/:id/users`
- `PATCH /pharmacies/:id/users/:userId`
- `POST /pharmacies/:id/activate`
- `POST /pharmacies/:id/suspend`

## P0 Order APIs

- `POST /orders/:id/assign-pharmacy`
- `POST /orders/:id/confirm-section21-dispensing`
- `POST /orders/:id/record-payment`
- `POST /orders/:id/pack`
- `POST /orders/:id/seal-package`
- `POST /orders/:id/dispatch-to-pharmacy`
- `POST /orders/:id/pharmacy-arrival`
- `POST /orders/:id/verify-collection-otp`
- `POST /orders/:id/collect`
- `POST /orders/:id/request-return`
- `POST /orders/:id/receive-return`

## P0 Inventory APIs

- `POST /inventory/batches`
- `GET /inventory/batches`
- `POST /inventory/reserve`
- `POST /inventory/movements`
- `GET /inventory/movements`
- `POST /inventory/returns/:packageId/receive`

## P0 Finance APIs

- `GET /payment-events`
- `GET /payment-allocations`
- `GET /pharmacy-ledger`
- `POST /pharmacy-settlements`
- `GET /pharmacy-settlements`
- `PATCH /pharmacy-settlements/:id`
- `GET /refunds-payable`
- `PATCH /refunds-payable/:id/approve`
- `PATCH /refunds-payable/:id/paid`
- `PATCH /refunds-payable/:id/void`

## P0 Audit APIs

- `GET /audit-events`
- `GET /orders/:id/audit`
- `GET /packages/:id/custody`
- `GET /pharmacies/:id/audit`

## Required CTAs

### Super Admin

- Create pharmacy
- Activate pharmacy
- Suspend pharmacy
- Add responsible pharmacist
- Override blocked workflow with reason
- View audit events

### Ops Admin

- Assign pharmacy
- Pack order
- Seal package
- Dispatch package
- Generate/manual return
- Receive return at hub

### Inventory Admin

- Create batch
- Reserve stock
- Adjust stock with reason
- Quarantine batch
- Recall batch
- Receive returned stock

### Pharmacy User

- Scan arrival
- View ready queue
- Verify OTP
- Mark collected
- Move package to return bin
- Print/view return waybill
- Handover return to courier

### Finance Admin

- View payment allocation
- View pharmacy ledger
- Generate settlement
- Mark settlement invoiced
- Mark settlement paid
- Review refund payable
- Approve/pay/void refund
- Export reconciliation

### Auditor

- View order timeline
- View package custody
- View pharmacy ledger
- View payment events
- View inventory movements
- Export audit pack

## CTA Persistence Rules

Every CTA must have a persistence contract:

- database transaction starts
- permission is checked
- current state is validated
- target state is written
- linked financial/stock/custody records are written
- audit event is written
- notification/ticket is created if needed
- transaction commits

If any step fails, the full CTA must fail and roll back.
