# Origin Retail Pharmacy Pivot Document Pack

Date: 2026-05-20  
System: Origin Retail, currently stored in legacy folder `JIGPOS/newbrand`

This folder is the production-focused queue for pivoting the retail system toward partner pharmacies.

This is not the TNT-ZA track-and-trace system. `tnt-za` remains the main track-and-trace / EU GMP QMS system. The pharmacy pivot belongs to Origin Retail, currently stored in `JIGPOS/newbrand`.

This does not replace the existing Section 21 workflow. Section 21 eligibility, prescription/authorization checks, and patient controls remain in Origin Retail. The pharmacy pivot adds partner pharmacies as pickup and dispensing partners after those checks are satisfied.

## Documents

- [Production Readiness](./PRODUCTION_READINESS.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Workflow Specification](./WORKFLOWS.md)
- [API and CTA Queue](./API_AND_CTA_QUEUE.md)
- [UAT Plan](./UAT_PLAN.md)

## Production Principle

The system must be auditable by design. Financial history, stock history, package custody, and audit history must not be overwritten. Corrections, returns, refunds, and reversals must be new balancing entries linked to the original record.

## Current Gap

The existing system has basic orders, products, POP/payment status, delivery states, client verification, supplier management, and a POS bridge. It does not yet have the pharmacy production backbone:

- Partner pharmacy onboarding
- Pharmacist users and pharmacy permissions
- Pharmacy pickup order lifecycle
- Package QR and custody tracking
- Batch-level inventory movements
- Payment event allocation
- Pharmacy ledger and settlement
- Return waybills
- Refunds payable
- 21-day uncollected expiry automation
- Canonical audit events

The priority is to build the production data foundation first so workflow CTAs cannot drift into frontend-only or status-only behaviour.
