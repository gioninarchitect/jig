# DBC SYSTEM TEST PLAN - BY ROLE & DASHBOARD
**Ormonde Branch Launch - 2026-02-01**

---

## TEST ACCOUNTS

| Role | Email | Dashboard |
|------|-------|-----------|
| Customer | customer@test.com | dashboard.html |
| Patient | patient@test.com | dashboard.html (with Section 21) |
| Admin | admin@debudchef.co.za | admin.html |
| Owner | owner@debudchef.co.za | owner-dashboard.html |
| Inventory Manager | inventory@debudchef.co.za | inventory-manager-dashboard.html |
| Staff Manager | manager@debudchef.co.za | pos.html |
| Staff Assistant | assistant@debudchef.co.za | pos.html |
| Packer | packer@debudchef.co.za | pnd-dashboard.html |
| Dispatch | dispatch@debudchef.co.za | pnd-dashboard.html |
| Supplier | supplier@debudchef.co.za | supplier-portal.html |

---

## PHASE 1: PUBLIC STORE (No Login Required)

### Page: index.html

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.1 | View Products | Open index.html | Products display with prices, images |
| 1.2 | Filter by Category | Click "Indoor" / "GreenDoor" | Only matching products show |
| 1.3 | Search Products | Type "Zoap" in search | Zoap strain appears |
| 1.4 | View Product Detail | Click any product | Modal shows description, THC%, effects |
| 1.5 | Add to Cart | Click "Add to Cart" | Toast confirms, cart badge updates |
| 1.6 | View Cart | Click cart icon | Cart drawer slides in with items |
| 1.7 | Update Quantity | Change quantity in cart | Subtotal recalculates |
| 1.8 | Remove Item | Click remove on item | Item removed, total updates |
| 1.9 | Proceed to Checkout | Click "Checkout" | Redirects to login or cart.html |

---

## PHASE 2: CUSTOMER JOURNEY

### Page: login.html → dashboard.html

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.1 | Request OTP | Enter email, click "Send OTP" | OTP email received |
| 2.2 | Verify OTP | Enter 6-digit code | Logged in, redirected to dashboard |
| 2.3 | View Dashboard | Check dashboard.html | Welcome message, order history |
| 2.4 | View Profile | Click profile section | Personal details display |
| 2.5 | View Wellness Points | Check points balance | Points balance shown |

### Page: cart.html (Checkout Flow)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.6 | Review Cart | Open cart.html | All items, quantities, prices correct |
| 2.7 | Apply Voucher | Enter voucher code | Discount applied to total |
| 2.8 | Select Payment - EFT | Choose EFT payment | Bank details displayed |
| 2.9 | Select Payment - Card | Choose Card payment | Card form appears |
| 2.10 | Place Order (EFT) | Complete checkout | Order created, "Pending Payment" status |
| 2.11 | View Order | Check dashboard orders | New order appears with status |
| 2.12 | Upload Proof of Payment | Upload POP for EFT order | File uploaded, status updates |

---

## PHASE 3: STAFF OTP LOGIN

### Page: ormonde.html

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1 | Staff Login | Enter staff email | OTP sent |
| 3.2 | Verify Staff OTP | Enter OTP code | Redirected based on role |
| 3.3 | Wrong OTP | Enter wrong code 3x | Account temporarily locked |
| 3.4 | Resend OTP | Click "Resend" after 60s | New OTP sent |

---

## PHASE 4: STAFF ASSISTANT (POS)

### Page: pos.html
**Role:** branch_assistant

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1 | Select Branch | Choose "Ormonde HQ" | Branch selected, products load |
| 4.2 | Select Till | Choose "Till 1" | Till selected |
| 4.3 | View Products | Browse product grid | All strains visible with stock |
| 4.4 | Search Product | Search "Ice Cream Cake" | Product found |
| 4.5 | Add to Sale | Click product | Added to current sale |
| 4.6 | Adjust Quantity | Change qty to 2 | Line total updates |
| 4.7 | Apply Discount | Add % or R discount | Sale total reduces |
| 4.8 | Cash Payment | Enter cash amount | Change calculated |
| 4.9 | Card Payment | Select card, process | Payment recorded |
| 4.10 | Split Payment | Cash R100 + Card R50 | Both payments recorded |
| 4.11 | Complete Sale | Finalize transaction | Receipt generated, inventory deducted |
| 4.12 | Print Receipt | Click print | Receipt prints/downloads |
| 4.13 | Out of Stock | Try add 0-stock item | Error toast "Out of Stock" |
| 4.14 | Void Line | Remove item from sale | Item removed, total recalculates |

---

## PHASE 5: STAFF MANAGER (POS + Overrides)

### Page: pos.html
**Role:** branch_manager (all branch_assistant tests PLUS:)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5.1 | Override Discount | Apply discount > limit | Allowed for manager |
| 5.2 | Void Transaction | Cancel entire sale | Transaction voided |
| 5.3 | No Sale | Open cash drawer | Drawer opens, logged |
| 5.4 | Price Override | Change item price | Price changed, logged |
| 5.5 | Refund | Process refund | Inventory restored, refund recorded |
| 5.6 | View Till Report | End of day report | Sales summary displays |
| 5.7 | Cash Up | Declare cash amount | Variance calculated |

---

## PHASE 6: ADMIN DASHBOARD

### Page: admin.html
**Role:** admin

| # | Test | Steps | Expected |
|---|------|-------|----------|
| **INVENTORY TAB** |
| 6.1 | View Products | Click Inventory tab | All products listed |
| 6.2 | Edit Product | Click edit on product | Edit modal opens |
| 6.3 | Update Price | Change price, save | Price updated |
| 6.4 | Update Stock | Change quantity | Stock updated |
| 6.5 | Add Product | Click "Add Product" | New product created |
| 6.6 | Deactivate Product | Set status inactive | Product hidden from store |
| **ORDERS TAB** |
| 6.7 | View Orders | Click Orders tab | All orders listed |
| 6.8 | Filter by Status | Filter "pending" | Only pending orders show |
| 6.9 | View Order Detail | Click order | Order details modal |
| **PAYMENTS TAB** |
| 6.10 | View EFT Pending | Click Payments tab | EFT orders awaiting approval |
| 6.11 | Approve EFT | Click approve on order | Order confirmed, customer notified |
| 6.12 | Reject EFT | Click reject on order | Order cancelled, inventory RESTORED |
| 6.13 | View POP | Click to view proof of payment | Image/PDF displays |
| **USERS TAB** |
| 6.14 | View Users | Click Users tab | All users listed |
| 6.15 | Edit User | Click edit user | User details modal |
| 6.16 | Change Role | Update user role | Role updated |
| 6.17 | Suspend User | Suspend account | User cannot login |
| **VOUCHERS TAB** |
| 6.18 | View Vouchers | Click Vouchers tab | All vouchers listed |
| 6.19 | Create Voucher | Add new voucher code | Voucher created |
| 6.20 | Deactivate Voucher | Disable voucher | Voucher no longer works |
| **STAFF TAB** |
| 6.21 | View Staff | Click Staff tab | All staff listed by branch |
| 6.22 | Assign Branch | Assign staff to Ormonde | Staff can access Ormonde POS |

---

## PHASE 7: INVENTORY MANAGER

### Page: inventory-manager-dashboard.html
**Role:** inventory_manager

| # | Test | Steps | Expected |
|---|------|-------|----------|
| **STOCK MANAGEMENT** |
| 7.1 | View Stock Levels | Open dashboard | All products with quantities |
| 7.2 | Low Stock Alert | Check low stock section | Products below threshold shown |
| 7.3 | Stock Adjustment | Adjust quantity | Stock updated, logged |
| **BATCHES TAB** |
| 7.4 | View Batches | Click Batches tab | All batches listed |
| 7.5 | Create Batch | Add new batch | Batch created with cannabinoid profile |
| 7.6 | Enter THC/CBD | Fill cannabinoid data | Profile saved |
| 7.7 | Enter Terpenes | Add terpene data | Terpenes saved |
| 7.8 | QA Approve Batch | Approve batch | Batch status = approved |
| 7.9 | QA Reject Batch | Reject batch | Batch status = rejected |
| 7.10 | View Batch Trace | Click trace | Full supplier-to-sale history |
| **PURCHASE ORDERS TAB** |
| 7.11 | View POs | Click PO tab | All purchase orders |
| 7.12 | Create PO | Click "New PO" | PO form opens |
| 7.13 | Select Supplier | Choose supplier | Supplier details populate |
| 7.14 | Add Line Items | Add products to PO | Items added with prices |
| 7.15 | Calculate Total | Check totals | Subtotal, VAT, total correct |
| 7.16 | Save Draft | Save PO | PO saved as draft |
| 7.17 | Submit for Approval | Submit PO | PO status = submitted |
| 7.18 | Download PO PDF | Click download | PDF downloads with DBC branding |
| 7.19 | Email to Supplier | Click "Email Supplier" | Email sent with PDF attachment |
| **GOODS RECEIVING** |
| 7.20 | Receive Goods | Open received PO | Receiving interface |
| 7.21 | Enter Received Qty | Enter quantities | Quantities recorded |
| 7.22 | Create Batch from PO | Link to new batch | Batch created from PO line |
| 7.23 | Complete Receiving | Mark as received | PO status = received, stock updated |

---

## PHASE 8: OWNER DASHBOARD

### Page: owner-dashboard.html
**Role:** owner

| # | Test | Steps | Expected |
|---|------|-------|----------|
| **OVERVIEW** |
| 8.1 | View KPIs | Open dashboard | Revenue, orders, customers shown |
| 8.2 | Revenue by Branch | Check branch breakdown | Ormonde revenue displayed |
| 8.3 | Top Products | View top sellers | Best-selling strains listed |
| **PO APPROVALS** |
| 8.4 | View Pending POs | Check approvals section | POs awaiting approval |
| 8.5 | Approve PO | Click approve | PO approved, manager notified |
| 8.6 | Reject PO | Click reject with reason | PO rejected, manager notified |
| **SUPPLIER MANAGEMENT** |
| 8.7 | View Suppliers | Click suppliers section | All suppliers listed |
| 8.8 | Verify Supplier | Approve compliance | Supplier verified |
| 8.9 | Suspend Supplier | Suspend account | Supplier cannot receive POs |
| **REPORTS** |
| 8.10 | Sales Report | Generate sales report | Report with date range |
| 8.11 | Inventory Report | Generate stock report | Current stock levels |
| 8.12 | Staff Performance | View staff metrics | Sales per staff member |

---

## PHASE 9: PACK & DISPATCH

### Page: pnd-dashboard.html
**Role:** packer, dispatch_manager

| # | Test | Steps | Expected |
|---|------|-------|----------|
| **PACKER TESTS** |
| 9.1 | View Orders to Pack | Open as packer | "Confirmed" orders listed |
| 9.2 | Start Packing | Click "Start Packing" | Order status = processing |
| 9.3 | View Packing List | See items to pack | All line items displayed |
| 9.4 | Mark Packed | Complete packing | Order status = packed |
| 9.5 | Print Packing Slip | Click print | Packing slip generates |
| **DISPATCH TESTS** |
| 9.6 | View Packed Orders | Open as dispatch | "Packed" orders listed |
| 9.7 | Assign Courier | Select courier | Courier assigned |
| 9.8 | Enter Tracking | Add tracking number | Tracking saved |
| 9.9 | Mark Dispatched | Click dispatch | Order status = dispatched |
| 9.10 | Mark Delivered | Confirm delivery | Order status = delivered |
| 9.11 | View Delivery History | Check completed | All delivered orders listed |

---

## PHASE 10: SUPPLIER PORTAL

### Page: supplier-portal.html
**Role:** supplier

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.1 | Login as Supplier | Use supplier OTP | Supplier dashboard loads |
| 10.2 | View Profile | Check company details | Supplier info displayed |
| 10.3 | View PO History | Check orders received | All POs listed |
| 10.4 | View PO Detail | Click on PO | PO details with line items |
| 10.5 | Download PO | Download PDF | PO PDF downloads |
| 10.6 | Update Compliance | Upload new license | Document uploaded |
| 10.7 | View Performance | Check ratings | Performance metrics shown |

---

## PHASE 11: CRITICAL WORKFLOWS (END-TO-END)

### E2E-1: Customer EFT Order
```
Customer → Browse → Add to Cart → Checkout (EFT) →
Admin → Approve EFT →
Packer → Pack Order →
Dispatch → Ship → Deliver
```

### E2E-2: POS Sale
```
Staff → Login (OTP) → Select Branch →
Add Products → Split Payment (Cash + Card) →
Complete Sale → Print Receipt
```

### E2E-3: Purchase Order Flow
```
Inventory Manager → Create PO → Submit →
Owner → Approve PO →
Inventory Manager → Email Supplier →
Supplier → View PO →
Inventory Manager → Receive Goods → Create Batch → QA Approve
```

### E2E-4: Payment Rejection (Inventory Restoration)
```
Customer → Place EFT Order → (Inventory deducted)
Admin → Reject Payment → (Inventory RESTORED)
Verify → Stock back to original
```

---

## EXECUTION ORDER

1. **Start Server:** `cd /Users/florisolivier/DBC/newbrand && npm run dev`
2. **Open Browser:** http://localhost:3001
3. **Execute Phases 1-11 in order**
4. **Log Results in ORMONDE_LAUNCH_CHECKLIST.md**

---

## TEST RESULT TEMPLATE

| Test ID | Pass/Fail | Notes |
|---------|-----------|-------|
| 1.1 | | |
| 1.2 | | |
| ... | | |

