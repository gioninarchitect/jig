# UAT Test Results - Basotho Medical Herbs
**Date**: 2025-11-05
**Server**: http://localhost:3001
**Status**: IN PROGRESS

---

## Test Credentials Status: ✅ WORKING

All 5 UAT users created successfully with correct passwords:

| Role | Email | Password | Database Status |
|------|-------|----------|----------------|
| Admin | admin@basothomedicalherbs.ls | Admin123! | ✅ Active |
| Store Manager | manager@basothomedicalherbs.ls | Manager123! | ✅ Active |
| Shop Assistant | assistant@basothomedicalherbs.ls | Assistant123! | ✅ Active |
| Lifestyle Member | user@basothomedicalherbs.ls | User123! | ✅ Active |
| Section 21 Patient | patient@basothomedicalherbs.ls | Patient123! | ✅ Active |

---

## 1. Admin Testing (admin@basothomedicalherbs.ls / Admin123!)

### Login Tests
- [ ] Login to admin panel at `/admin.html`
- [ ] Verify ADMIN PANEL badge visible
- [ ] Verify email displays in header

### Admin Panel Features
- [ ] View all users and their roles
- [ ] Manage products and inventory
- [ ] View all orders and bug reports
- [ ] Access bug dashboard at `/bug-dashboard.html`
- [ ] Access bug kanban at `/bug-kanban.html`

### Admin Dashboard Tabs (Verify ALL visible)
- [ ] Inventory Management
- [ ] POS System
- [ ] Payments
- [ ] Affiliates
- [ ] Vouchers
- [ ] Orders
- [ ] Users Management
- [ ] Staff Management
- [ ] Leads Management

---

## 2. Manager Testing (manager@basothomedicalherbs.ls / Manager123!)

### Login Tests
- [ ] Login to POS system
- [ ] Verify correct role displayed

### Manager Features
- [ ] Manage branch inventory
- [ ] Process sales transactions
- [ ] View sales reports
- [ ] Manage staff assignments

### Manager Dashboard Tabs (Verify LIMITED access)
- [ ] Inventory Management (should see)
- [ ] POS System (should see)
- [ ] Payments (should NOT see OR limited)
- [ ] Orders (should see)
- [ ] Staff Management (should see limited)
- [ ] Users Management (should NOT see)

---

## 3. Assistant Testing (assistant@basothomedicalherbs.ls / Assistant123!)

### Login Tests
- [ ] Login to POS system
- [ ] Verify Assistant role displayed

### Assistant Features
- [ ] Access POS tab ONLY
- [ ] Process sales transactions
- [ ] Cannot access inventory management
- [ ] Cannot access user management
- [ ] Cannot access staff management

---

## 4. POS System Testing (CRITICAL - Test with Assistant role)

**Login as**: assistant@basothomedicalherbs.ls / Assistant123!

### Product Selection
- [ ] Navigate to POS tab
- [ ] Search for product by name
- [ ] Filter products by category
- [ ] Add product to cart
- [ ] Verify stock quantity displays
- [ ] Verify product price displays
- [ ] Add multiple different products
- [ ] Change product quantity in cart
- [ ] Remove product from cart

### Stock Checking
- [ ] Verify out-of-stock products show toast notification
- [ ] Verify cannot add out-of-stock items
- [ ] Verify stock decreases after sale

### Checkout Process
- [ ] Apply discount (if applicable)
- [ ] Apply voucher code (if applicable)
- [ ] Calculate total correctly
- [ ] Select payment method: Cash
- [ ] Select payment method: Card
- [ ] Complete transaction
- [ ] Verify success message

### Invoice Generation
- [ ] Invoice generated automatically
- [ ] Invoice shows correct items
- [ ] Invoice shows correct prices
- [ ] Invoice shows correct total
- [ ] Invoice shows customer info
- [ ] Invoice shows date/time
- [ ] Invoice shows payment method
- [ ] Invoice has unique order number

### Invoice Actions
- [ ] Download invoice as PDF
- [ ] Print invoice
- [ ] Email invoice to customer
- [ ] Verify email sent successfully

---

## 5. Regular User Testing (user@basothomedicalherbs.ls / User123!)

### Login Tests
- [ ] Login successfully
- [ ] Redirect to `/dashboard.html`
- [ ] Dashboard loads without errors

### E-Commerce Features
- [ ] Browse lifestyle cannabis products on main site
- [ ] Add products to cart
- [ ] Verify cart persists (MongoDB)
- [ ] View product details
- [ ] Upload Section 21 documents
- [ ] Place orders

### Shopping Cart
- [ ] Cart drawer opens from right
- [ ] Cart shows all added items
- [ ] Cart shows correct quantities
- [ ] Cart shows correct prices
- [ ] Cart shows correct subtotal
- [ ] Update quantity in cart
- [ ] Remove items from cart
- [ ] Cart badge shows item count

### Checkout Flow
- [ ] Proceed to checkout from cart
- [ ] Enter delivery address
- [ ] Select delivery method
- [ ] Enter payment details
- [ ] Review order summary
- [ ] Place order
- [ ] Receive order confirmation number
- [ ] Verify order in dashboard orders list

### Order Management
- [ ] View order history in dashboard
- [ ] View order details
- [ ] Download invoice
- [ ] Track order status
- [ ] Receive email confirmation

---

## 6. Patient Testing (patient@basothomedicalherbs.ls / Patient123!)

### Login Tests
- [ ] Login successfully
- [ ] Redirect to `/dashboard.html`
- [ ] Verify Section 21 status displayed

### Section 21 Features
- [ ] Login and verify Section 21 status
- [ ] Browse medical cannabis products
- [ ] Check prescription requirements
- [ ] Add medical products to cart
- [ ] Place orders with Section 21 verification

### Medical Products Access
- [ ] Cannot access medical products WITHOUT Section 21
- [ ] CAN access medical products WITH Section 21
- [ ] Section 21 number displays in profile
- [ ] Expiry date shows correctly

---

## 7. Bug Tracker Testing

### Submit Bug Report
- [ ] Click black bug button (bottom right on any page)
- [ ] Select bug type: Bug, UI Issue, Data Issue, Performance, Feature
- [ ] Set priority: Low, Medium, High, Critical
- [ ] Enter description and steps to reproduce
- [ ] Optional: Click "Select Area" for screenshot
- [ ] Submit bug report successfully

### View Bug Reports (Admin only)
- [ ] View all bugs in bug dashboard
- [ ] Filter bugs by status
- [ ] Filter bugs by priority
- [ ] View bug details
- [ ] Update bug status
- [ ] Assign bug to developer
- [ ] Add comments to bugs

---

## Issues Found During Testing

### Critical Issues
(List any blocking issues here)

### High Priority Issues
(List important non-blocking issues here)

### Medium Priority Issues
(List moderate issues here)

### Low Priority Issues
(List minor issues here)

---

## Dashboard JavaScript Errors to Investigate

**dashboard.html**:
- Error: `Cannot set properties of null (setting 'textContent')` at line 1705
- Missing Lucide icons: 'camouflage', 'pills'
- 404 errors for some resources

**Impact**: Stats display may not load correctly
**Tested**: Pending manual testing

---

## Production Deployment Checklist

- [ ] All UAT tests passed
- [ ] POS system fully functional
- [ ] E-commerce checkout working
- [ ] Invoice generation working
- [ ] Invoice email working
- [ ] All 5 user roles tested
- [ ] No critical bugs found
- [ ] Upload `create-uat-users.js` to production
- [ ] Run `node create-uat-users.js` on production
- [ ] Deploy updated backend files
- [ ] Restart production server
- [ ] Verify production logins work
- [ ] Notify client UAT ready

---

## Test Notes

(Add any observations, warnings, or recommendations here)

