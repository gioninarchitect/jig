# ORMONDE BRANCH LAUNCH CHECKLIST
**Date: 2026-02-01**

---

## ARCHITECTURE AUDIT - ALL FEATURES VERIFIED

| Feature | Status | Routes | Notes |
|---------|--------|--------|-------|
| Batch/Lot Tracking | COMPLETE | 11 endpoints `/api/v1/batches/*` | Cannabinoid profiles, QA workflow, traceability |
| Purchase Limits | COMPLETE | `/api/v1/purchase-limits/*` | Daily/monthly limits, warnings, override |
| Supplier Management | COMPLETE | 13 endpoints `/api/v1/suppliers/*` | Compliance, license tracking, performance |
| Purchase Orders | COMPLETE | 14 endpoints `/api/v1/purchase-orders/*` | Full lifecycle, PDF generation, email |
| Split Payments | COMPLETE | Order.payments[] array | 8 payment types, refund per payment |
| Marketing Automation | COMPLETE | 15 endpoints `/api/v1/marketing/*` | Email/SMS campaigns, scheduling |
| OTP Authentication | COMPLETE | 8 endpoints `/api/v1/auth/otp/*` | Email OTP, multi-session |
| Ormonde Integration | COMPLETE | ormonde.html | Branded OTP login page |

---

## PRE-LAUNCH SEEDS TO RUN

Execute in order:

```bash
# 1. Seed branches (creates ORM - Ormonde HQ)
node backend/scripts/seed-branches.js

# 2. Seed test users (admin, staff, etc.)
node seed-all-test-users.js

# 3. Seed Ormonde strains (GreenDoor + Indoor)
node seed-ormonde-strains.js

# 4. Setup Ormonde inventory (BranchInventory)
node setup-ormonde-inventory.js
```

---

## PRODUCT INVENTORY - FROM YOUR LISTS

### GreenDoor (Greenhouse) Strains - 10 products
| Strain | Price |
|--------|-------|
| Gary Payton | R70 |
| Black Cherry Punch | R70 |
| Alien Cookies | R60 |
| Beach Wedding | R60 |
| Gorilla Zkittles Big | R60 |
| Super Cheese | R50 |
| Strawberry Lemonade | R40 |
| Cheese | R60 |
| Jungle Diamond | R70 |
| Divine Storm | R70 |

### Indoor Premium Strains - 14 products
| Strain | Price |
|--------|-------|
| Blu Zuchi | R150 |
| Rainbow Sherbit | R150 |
| Rainbow Royal | R150 |
| Don Pernan | R120 |
| Blackberry | R100 |
| Monster Zkittles | R100 |
| Ice Cream Cake | R100 |
| Pitbull | R100 |
| King Truck | R100 |
| Purple Peanut | R80 |
| Bakers | R80 |
| Pink Runts | R80 |
| K. Snow | R80 |
| Zoap | R80 |

**Total: 24 strains**

---

## DASHBOARDS TO TEST

| Dashboard | URL | Role |
|-----------|-----|------|
| Public Store | `/index.html` | Anyone |
| Cart/Checkout | `/cart.html` | Customers |
| Customer Dashboard | `/dashboard.html` | user |
| Admin Dashboard | `/admin.html` | admin |
| Owner Dashboard | `/owner-dashboard.html` | owner |
| Inventory Manager | `/inventory-manager-dashboard.html` | inventory_manager |
| POS System | `/pos.html` | branch_assistant, branch_manager |
| Pack & Dispatch | `/pnd-dashboard.html` | packer, dispatch_manager |
| Supplier Portal | `/supplier-portal.html` | supplier |
| Ormonde Login | `/ormonde.html` | Staff OTP login |

---

## CRITICAL WORKFLOWS TO TEST

### 1. Customer Journey (E-Commerce)
- [ ] Browse products on index.html
- [ ] Filter by Indoor / GreenDoor
- [ ] Add to cart
- [ ] Checkout with EFT payment
- [ ] Receive order confirmation email
- [ ] Admin approves EFT in Payments tab
- [ ] Order status updates to confirmed

### 2. POS Transaction
- [ ] Staff logs in via ormonde.html (OTP)
- [ ] Opens POS at pos.html
- [ ] Selects branch (Ormonde)
- [ ] Adds products to cart
- [ ] Split payment (cash + card)
- [ ] Completes sale
- [ ] Prints/downloads receipt

### 3. Inventory Receiving
- [ ] Create Purchase Order for supplier
- [ ] Submit for approval
- [ ] Owner approves PO
- [ ] Download PO PDF / Email to supplier
- [ ] Receive goods
- [ ] Create batch with cannabinoid profile
- [ ] QA approve batch
- [ ] Stock appears in POS

### 4. Payment Rejection Flow
- [ ] Customer places EFT order
- [ ] Admin rejects payment (e.g., no proof)
- [ ] Inventory is restored (FIXED)
- [ ] Customer notified

---

## BRANCH CONFIGURATION

Ormonde HQ (ORM):
- Type: warehouse
- Address: 123 Main Road, Ormonde, Johannesburg South, Gauteng
- Hours: Mon-Sat 09:00-17:00, Sun Closed
- Tills: 2 (manual speedpoint)
- Tracks: Lifestyle + Medical
- Active: Yes

---

## FINAL CHECKLIST

Before going live:

- [ ] All seed scripts run successfully
- [ ] Admin can log in to admin.html
- [ ] POS can process a sale
- [ ] EFT approval works in admin dashboard
- [ ] Products display with correct prices
- [ ] Invoice PDF generates with DBC branding
- [ ] OTP email delivery working (check SMTP)
- [ ] Ormonde branch shows in POS branch selector
- [ ] BranchInventory has stock for Ormonde

---

## COMMANDS QUICK REFERENCE

```bash
# Start server
cd /Users/florisolivier/DBC/newbrand
npm run dev

# Run all seeds
node backend/scripts/seed-branches.js && \
node seed-all-test-users.js && \
node seed-ormonde-strains.js && \
node setup-ormonde-inventory.js

# Test API health
curl http://localhost:3001/api/v1/health

# Check branch exists
curl http://localhost:3001/api/v1/branches
```

---

## KNOWN ISSUES (FIXED)

1. **Inventory not restored on payment rejection** - FIXED in order.js
2. **Wrong logo on documents** - FIXED to use dbc-logo-nobg.png
3. **PO PDF missing** - ADDED purchaseOrderGenerator.js
4. **PO email to supplier** - ADDED endpoint

---

## CONTACT

For issues during launch:
- Check backend logs: `pm2 logs dbc --lines 100`
- Check MongoDB: `mongosh dbc`
