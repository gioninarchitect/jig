# DBC Dashboard Testing Plan

## Pre-requisites

### 1. Start the Backend Server
```bash
cd /Users/florisolivier/DBC/newbrand
npm run dev
```
Expected: Server running on port 3001, MongoDB connected

### 2. Verify Test Users Exist
```bash
node backend/scripts/seed-test-users.js
```

### 3. Test User Credentials
| Role | Email | Password |
|------|-------|----------|
| Owner | owner@debudchef.co.za | Owner123! |
| Admin | admin@debudchef.co.za | Admin123! |
| Inventory Manager | inventory@debudchef.co.za | Inventory123! |
| Packer | packer@debudchef.co.za | Packer123! |
| Dispatch | dispatch@debudchef.co.za | Dispatch123! |
| Staff | staff@debudchef.co.za | Staff123! |

---

## Phase 1: Authentication & Login

### Test 1.1: Login Flow
- [ ] Open http://localhost:3001/login.html
- [ ] Enter owner credentials
- [ ] Verify OTP email is sent
- [ ] Enter OTP code
- [ ] Verify redirect to appropriate dashboard

---

## Phase 2: Supplier Portal Testing

### Test 2.1: Supplier Login
- [ ] Open http://localhost:3001/supplier-portal.html
- [ ] Click "Supplier Login"
- [ ] Enter supplier credentials (need to create test supplier first)
- [ ] Verify dashboard loads

### Test 2.2: Supplier Products
- [ ] Navigate to "Products" tab
- [ ] Click "Add Product" button
- [ ] Fill in product details:
  - Name: "Test Strain A"
  - SKU: "TST-001"
  - Category: flower
  - Price: 150
  - Stock: 100
- [ ] Save product
- [ ] Verify product appears in list
- [ ] Click "Submit for Approval"
- [ ] Verify status changes to "pending"

### Test 2.3: Supplier Profile
- [ ] Navigate to "Profile" tab
- [ ] Verify supplier info displays
- [ ] Edit contact details
- [ ] Save changes

---

## Phase 3: PND Dashboard Testing

### Test 3.1: Packer View
- [ ] Login as packer@debudchef.co.za
- [ ] Open http://localhost:3001/pnd-dashboard.html
- [ ] Select "Packer" role
- [ ] Verify packing jobs section loads
- [ ] Check for orders with status "confirmed" or "processing"

### Test 3.2: Complete Packing Job
- [ ] Select a packing job
- [ ] Capture "Before" photo (simulated)
- [ ] Capture "After" photo (simulated)
- [ ] Click "Complete Packing"
- [ ] Verify order status changes to "packed"
- [ ] Verify toast notification appears

### Test 3.3: Dispatch View
- [ ] Select "Dispatch Manager" role
- [ ] Verify dispatch queue loads
- [ ] Check for orders with status "packed"

### Test 3.4: Complete Dispatch
- [ ] Select a dispatch item
- [ ] Enter courier name
- [ ] Enter tracking number
- [ ] Click "Dispatch"
- [ ] Verify order status changes to "shipped"

---

## Phase 4: Inventory Manager Dashboard Testing

### Test 4.1: Access Dashboard
- [ ] Login as inventory@debudchef.co.za
- [ ] Open http://localhost:3001/inventory-manager-dashboard.html
- [ ] Verify dashboard loads with sidebar navigation

### Test 4.2: Batch Management
- [ ] Click "Batch Management" in sidebar
- [ ] Click "Create Batch" button
- [ ] Fill in batch details:
  - Product: Select from dropdown
  - Quantity: 500
  - Unit: grams
  - THC: 22.5
  - CBD: 0.8
  - Expiry: 6 months from now
- [ ] Save batch
- [ ] Verify batch appears in table with "Pending QA" status
- [ ] Click Approve button
- [ ] Verify status changes to "Approved"

### Test 4.3: Purchase Order Management
- [ ] Click "Purchase Orders" in sidebar
- [ ] Click "Create Purchase Order"
- [ ] Select supplier from dropdown
- [ ] Add line items:
  - Product, Quantity, Unit Price
- [ ] Click "Add Line Item" to add more
- [ ] Save as Draft
- [ ] Verify PO appears in table
- [ ] Click Submit for Approval
- [ ] Verify status changes to "Submitted"

### Test 4.4: Supplier Management
- [ ] Click "Suppliers" in sidebar
- [ ] Click "Add Supplier"
- [ ] Fill in supplier details:
  - Name: "Green Farms SA"
  - Type: cultivator
  - Contact: "John Smith"
  - Email: test@greenfarms.co.za
  - Phone: 0821234567
- [ ] Save supplier
- [ ] Verify supplier card appears in grid

### Test 4.5: MDC Control Panel
- [ ] Click "MDC Control Panel" in sidebar
- [ ] Verify stats cards show counts
- [ ] Test "Refresh Uploads" button
- [ ] Test product track tagging (Section 21 / Lifestyle / Both)

---

## Phase 5: Owner Dashboard Testing

### Test 5.1: Access Dashboard
- [ ] Login as owner@debudchef.co.za
- [ ] Open http://localhost:3001/owner-dashboard.html
- [ ] Verify welcome header shows owner name
- [ ] Verify stats cards load (Revenue, Orders, Inventory, Branches)

### Test 5.2: Pending Approvals
- [ ] Click "Purchase Orders" stat card
- [ ] Verify approval panel opens
- [ ] Click "Approve" on a pending PO
- [ ] Verify toast confirmation
- [ ] Verify count decreases

### Test 5.3: Supplier Verification
- [ ] Click "Supplier Verifications" stat card
- [ ] Verify pending suppliers list
- [ ] Click "Verify" on a supplier
- [ ] Verify toast confirmation

### Test 5.4: Branch Management
- [ ] Click "Add Branch" button
- [ ] Fill in branch details:
  - Name: "DBC Sandton"
  - Code: "DBC-SAN-01"
  - City: Johannesburg
  - Province: Gauteng
- [ ] Save branch
- [ ] Verify branch card appears in grid

### Test 5.5: Staff Overview
- [ ] Verify staff counts display
- [ ] Click "Manage Staff" card
- [ ] Verify redirect to admin panel

---

## Phase 6: POS Testing

### Test 6.1: Access POS
- [ ] Open http://localhost:3001/pos.html
- [ ] Verify products grid loads
- [ ] Verify category tabs appear

### Test 6.2: Customer Selection
- [ ] Click customer selector (shows "Walk-in Customer")
- [ ] Search for a customer by name
- [ ] Select a customer
- [ ] Verify customer name updates
- [ ] Check for purchase limit warning (if applicable)

### Test 6.3: Add to Cart
- [ ] Click on a product
- [ ] Verify toast "Added to Cart"
- [ ] Verify cart count updates
- [ ] Add more products
- [ ] Verify subtotal, VAT, total calculate correctly

### Test 6.4: Single Payment (Cash)
- [ ] Click "CHECKOUT"
- [ ] Click "Cash" tab
- [ ] Enter amount received
- [ ] Verify change calculates
- [ ] Click "COMPLETE SALE"
- [ ] Verify sale complete modal appears

### Test 6.5: Split Payment
- [ ] Add products to cart
- [ ] Click "CHECKOUT"
- [ ] Click "Split Payment" tab (gold button)
- [ ] First payment: Cash - R200
- [ ] Click "Add Another Payment Method"
- [ ] Second payment: Card - R150
- [ ] Verify "Remaining" balance updates
- [ ] When fully paid, click "COMPLETE SPLIT PAYMENT"
- [ ] Verify sale completes

### Test 6.6: Receipt Actions
- [ ] After completing sale, verify modal shows
- [ ] Test "Download Receipt" button
- [ ] Test "Print Receipt" button
- [ ] Enter email and test "Send Receipt Email"

---

## Phase 7: Integration Testing

### Test 7.1: End-to-End Order Flow
1. [ ] Create supplier in inventory-manager-dashboard
2. [ ] Create PO from that supplier
3. [ ] Owner approves PO
4. [ ] Receive goods (creates batch)
5. [ ] QA approve batch
6. [ ] Sell product via POS
7. [ ] Pack order in PND
8. [ ] Dispatch order in PND
9. [ ] Verify order status is "shipped"

### Test 7.2: Purchase Limits
1. [ ] Select medical patient in POS
2. [ ] Add products totaling near daily limit
3. [ ] Verify warning appears
4. [ ] Complete sale
5. [ ] Try another sale
6. [ ] Verify limit blocking works

---

## Phase 8: Error Handling

### Test 8.1: Network Errors
- [ ] Disconnect network
- [ ] Try to load products
- [ ] Verify error message displays
- [ ] Reconnect and retry

### Test 8.2: Invalid Input
- [ ] Try creating batch with 0 quantity
- [ ] Try creating PO without supplier
- [ ] Try checkout with empty cart
- [ ] Verify appropriate error messages

### Test 8.3: Authentication
- [ ] Clear session storage
- [ ] Try accessing protected page
- [ ] Verify redirect to login

---

## Test Results Log

| Test | Pass/Fail | Notes | Date |
|------|-----------|-------|------|
| 1.1 Login Flow | | | |
| 2.1 Supplier Login | | | |
| 2.2 Supplier Products | | | |
| ... | | | |

---

## Issues Found

### Issue #1
**Description:**
**Steps to Reproduce:**
**Expected:**
**Actual:**
**Priority:** High/Medium/Low

---

## Notes
- Run tests in order (Phase 1 -> Phase 8)
- Each phase may require completing previous phases
- Document any issues in the Issues Found section
- All API endpoints should return proper JSON responses
