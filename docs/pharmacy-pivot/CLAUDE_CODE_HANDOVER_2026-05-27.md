# Claude Code Handover - Origin Retail POS Shop Install

Date: 2026-05-27  
Primary objective: get Origin Retail POS ready for tomorrow's in-shop installation and keep the pharmacy pickup/dispensing partner production queue moving without touching unrelated systems.

## Read This First

Origin Retail is the retail / Section 21 / pharmacy pickup system. The working code is mainly under:

- `JIGPOS/newbrand`
- `src/server`
- `src/frontend`
- `docs/pharmacy-pivot`
- `database`

TnT-ZA is a separate Track & Trace / EU GMP / QMS system under `tnt-za`. Do not mix TnT-ZA work into Origin Retail POS work unless the user explicitly asks for TnT-ZA.

The immediate real-world context is an on-site farm/shop installation tomorrow. Prioritize working POS, login, product/catalog data, staff PIN flow, payments/receipts, stock visibility, and clear rollback-safe deployment.

## Current Live Targets

| Area | URL / Path | Notes |
|---|---|---|
| Origin Retail live | `https://origin.cleva-ai.co.za` | Main Origin retail domain |
| Origin admin | `https://origin.cleva-ai.co.za/admin.html` | Stakeholder/admin login page |
| Origin retail UAT | `https://origin.cleva-ai.co.za/origin-retail-uat.html` | UAT doc for retail/pharmacy pivot |
| Server | `154.66.197.199` | Use existing SSH key flow |
| Static POS app path | `/var/www/origin/pos` | Deployed static POS/admin assets |
| PM2 services | `origin-pos`, `origin-b2b` | Restart only the needed service |

Known UAT PIN noted in the repo/doc pack: `123456`. Use only approved test/staff/pharmacy accounts.

## Non-Negotiable Boundaries

1. Do not replace working production files blindly.
2. Deploy only the files that changed and are required.
3. Do not run destructive git commands.
4. The worktree is very dirty; do not revert user changes.
5. Do not rename or delete existing legacy folders during the install window.
6. Do not send emails to seeded/store staff until Floris explicitly approves.
7. Keep Section 21 workflow intact. Pharmacy pickup is an added partner workflow after Section 21 eligibility/prescription controls.
8. Do not report unrelated module names to stakeholders.

## Worktree Warning

`git status` shows a very dirty tree with many modified/deleted/untracked files, especially under `JIGPOS/newbrand`. Treat this as shared user work. Before editing any file:

1. Read the current file.
2. Make minimal scoped edits.
3. Avoid broad formatting.
4. Avoid bulk cleanup.
5. Do not assume deleted files are safe to restore.

## Most Recent Completed Work

### Origin Admin Login

Files touched:

- `JIGPOS/newbrand/admin.html`
- `JIGPOS/newbrand/frontend/admin-auth.js`
- `JIGPOS/newbrand/origin-retail-uat.html`

What changed:

- Admin login visual styling was cleaned up from the bad yellow/brown full-page background.
- Pharmacy roles were allowed through the admin/PIN auth path:
  - `pharmacy_admin`
  - `responsible_pharmacist`
  - `pharmacist`
  - `pharmacy_assistant`
- Origin UAT doc was updated with stakeholder admin login details:
  - `https://origin.cleva-ai.co.za/admin.html`
  - PIN login path
  - approved demo/staff/pharmacy accounts
  - UAT PIN `123456`

Deployment already done for those files only:

- `/var/www/origin/pos/admin.html`
- `/var/www/origin/pos/frontend/admin-auth.js`
- `/var/www/origin/pos/origin-retail-uat.html`

No Origin service restart was needed for those static changes.

## Production Queue Source Documents

Use these docs as the source of truth for the pharmacy pivot:

- `docs/pharmacy-pivot/README.md`
- `docs/pharmacy-pivot/PRODUCTION_READINESS.md`
- `docs/pharmacy-pivot/DATABASE_SCHEMA.md`
- `docs/pharmacy-pivot/WORKFLOWS.md`
- `docs/pharmacy-pivot/API_AND_CTA_QUEUE.md`
- `docs/pharmacy-pivot/UAT_PLAN.md`

The remaining work includes end-to-end UAT and deployment validation against live/staging.

## Tomorrow Shop Install Goal

The shop install is successful when a real staff member can:

1. Open the POS/admin page on the shop device.
2. Log in with an approved account/PIN.
3. See the correct branch/store context.
4. Search or scan products.
5. Add items to cart.
6. Apply customer/Section 21 checks where required.
7. Complete a sale through the configured payment flow or clearly marked manual payment flow.
8. Print or generate a receipt.
9. See stock update or a persisted sales/order record.
10. Run end-of-day/cashup or at least verify transaction history.

Do not call the shop install done if any CTA only changes frontend state without persisting the result.

## Immediate Install Checklist

### 1. Confirm Live Services

Run from the server:

```bash
pm2 list
curl -I https://origin.cleva-ai.co.za/admin.html
curl -I https://origin.cleva-ai.co.za/pos.html
curl -I https://origin.cleva-ai.co.za/origin-retail-uat.html
```

Expected:

- `origin-pos` online
- `origin-b2b` online if B2B portal is required
- Admin and POS pages return HTTP 200

### 2. Confirm Login

Test:

- Admin login at `/admin.html`
- POS login at `/pos.html` or current POS route
- PIN login using approved UAT/staff account and PIN `123456`

If OTP is unreliable on-site, do not block the install on OTP. Confirm the PIN path is working for approved users.

### 3. Confirm Branch/Store Context

Check that the shop device lands on the intended branch/store and not a stale demo branch.

Likely files to inspect if branch context is wrong:

- `JIGPOS/newbrand/frontend/pos-auth.js`
- `JIGPOS/newbrand/frontend/pos-core.js`
- `JIGPOS/newbrand/frontend/config.js`
- `JIGPOS/newbrand/backend/controllers/branches.controller.js`
- `JIGPOS/newbrand/backend/routes/branches.js`
- `JIGPOS/newbrand/backend/modules/database/models/Branch.js`
- `JIGPOS/newbrand/backend/modules/database/models/User.js`

### 4. Confirm Products and Stock

Test:

- Product list loads.
- Product search works.
- Product prices are correct.
- Product stock is visible.
- Out-of-stock products cannot be sold silently.

Likely files:

- `JIGPOS/newbrand/frontend/pos-products.js`
- `JIGPOS/newbrand/frontend/pos-inventory.js`
- `JIGPOS/newbrand/backend/controllers/products.controller.js`
- `JIGPOS/newbrand/backend/controllers/pos.controller.js`
- `JIGPOS/newbrand/backend/modules/database/models/Product.js`
- `JIGPOS/newbrand/backend/modules/database/models/BranchInventory.js`

### 5. Confirm Cart and Sale Persistence

Test:

- Add product to cart.
- Change quantity.
- Remove product.
- Apply discount only if authorized.
- Complete sale.
- Refresh page and confirm the transaction still exists.

Likely files:

- `JIGPOS/newbrand/frontend/pos-cart.js`
- `JIGPOS/newbrand/frontend/pos-checkout.js`
- `JIGPOS/newbrand/backend/controllers/pos.controller.js`
- `JIGPOS/newbrand/backend/modules/database/models/Sale.js`
- `JIGPOS/newbrand/backend/modules/database/models/Order.js`
- `JIGPOS/newbrand/backend/modules/database/models/Payment.js`

### 6. Confirm Receipt / Print

Test:

- Receipt generates after sale.
- Print layout is usable on the shop device.
- Receipt has correct business/store identity, date/time, items, totals, payment type, and staff/user reference.

Likely files:

- `JIGPOS/newbrand/frontend/pos-printing.js`
- `JIGPOS/newbrand/frontend/pos-checkout.js`
- `JIGPOS/newbrand/frontend/pos.html`

### 7. Confirm Cashup / Shift

Test:

- Open shift/till.
- Record cash in/out if used.
- Close shift.
- Verify totals match visible sales.

Likely files:

- `JIGPOS/newbrand/frontend/pos-shifts.js`
- `JIGPOS/newbrand/frontend/pos-cashup.js`
- `JIGPOS/newbrand/frontend/admin-till-management.js`
- `JIGPOS/newbrand/backend/modules/database/models/TillSession.js`
- `JIGPOS/newbrand/backend/modules/database/models/DailyCashup.js`

## Pharmacy Pivot Production Requirements

These are not optional for final production, but do not let them derail the shop POS install unless the shop workflow depends on them.

### Required Backend Data Backbone

- Partner pharmacies
- Pharmacist/pharmacy users
- Pharmacy onboarding documents
- Orders extended for pharmacy pickup lifecycle
- Order items with batch/lot/expiry references
- Payment events
- Payment allocations
- Inventory batches
- Inventory movements
- Order packages
- Package custody events
- Pharmacy ledger
- Pharmacy settlements
- Return waybills
- Refunds payable
- Workflow tickets
- Canonical audit events

### Golden Rule

Financial history, stock history, package custody, and audit history are append-only. Do not overwrite history. Corrections, returns, refunds, reversals, and stock adjustments must be balancing entries linked back to the original record.

### Critical Lifecycle

Required order statuses:

- `pending_payment`
- `paid`
- `packed`
- `shipped_to_pharmacy`
- `arrived_at_pharmacy`
- `collected`
- `uncollected_expired`
- `return_to_hub_requested`
- `returned_to_hub`
- `cancelled`
- `refunded`

Every transition must write:

- order current state
- order status event
- audit event
- linked financial, inventory, package, waybill, refund, ticket, or ledger row where relevant

## P0 Build Tasks After Shop Install

1. Add/apply pharmacy pivot DB migration safely.
2. Build one backend transition service for order lifecycle changes.
3. Route all lifecycle CTAs through that service.
4. Add payment events and allocation persistence.
5. Add inventory movement service and block direct stock mutation.
6. Add package QR/custody event service.
7. Add pharmacy ledger posting service.
8. Add refunds payable and return waybill creation.
9. Add 21-day expiry scheduled job.
10. Add audit event writes to all critical actions.
11. Run UAT plan end to end.

## UAT Must Prove

1. Pharmacy onboarding blocks incomplete pharmacies.
2. Section 21 prerequisites are not bypassed.
3. Paid order can be packed and shipped.
4. Pharmacy can scan arrival.
5. Wrong OTP is logged.
6. Correct OTP marks collected.
7. Collection creates pharmacy ledger row.
8. 21-day uncollected expiry creates return waybill, refund payable, ticket, notification, and audit event.
9. Return to hub creates custody and inventory movement rows.
10. Finance settlement is generated from ledger rows.
11. Auditor can view timelines and cannot mutate records.

## Deployment Discipline

Preferred approach during install:

1. Make a small local change.
2. Test locally if practical.
3. Copy only changed files to the server.
4. Restart only the needed PM2 process.
5. Verify live URL and one user workflow.

Do not deploy broad directories during shop hours.

Use a new git branch after the install work is stable. Suggested branch name:

```bash
origin-retail-shop-install-2026-05-27
```

Do not commit unrelated dirty worktree changes.

## Smoke Test Script

There is an existing script:

- `scripts/origin-retail-pharmacy-smoke.cjs`

Use it for pharmacy pivot smoke coverage if it still matches the current API. For the shop POS install, manual UI testing is still required because scanner, printer, branch context, login, and payment flows must be tested on the actual device.

## Stakeholder Reporting Rule

Do not send a stakeholder "done" report until:

1. Live/staging deployment is verified.
2. The shop POS login works.
3. A sale or test transaction persists.
4. Receipt flow is verified.
5. UAT evidence is recorded.
6. Known limitations are listed plainly.

Stakeholder summary should talk about Origin Retail POS, Section 21 continuity, pharmacy pickup/dispensing partner readiness, financial auditability, inventory control, and deployment/UAT status. Keep internal repo/module confusion out of the stakeholder version.

## Suggested First Claude Code Prompt

Use this prompt in the next Claude Code session:

```text
We are working in /Users/florisolivier/origin. Focus only on Origin Retail POS and the pharmacy pickup production queue. Tomorrow is the in-shop POS installation. Read docs/pharmacy-pivot/CLAUDE_CODE_HANDOVER_2026-05-27.md first, then inspect the Origin Retail POS login, branch context, products, cart, sale persistence, receipt, and cashup flow. Do not touch tnt-za unless explicitly asked. Do not revert unrelated dirty worktree changes. Make minimal fixes needed for the shop install, test them, and prepare targeted deploy steps for origin.cleva-ai.co.za.
```

