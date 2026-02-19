# 🚀 BASOTHO MEDICAL HERBS - UAT READY CHECKLIST

**Date**: 2025-11-04
**Server**: `http://localhost:3001`
**Status**: ✅ READY FOR TESTING

---

## ✅ WHAT'S WORKING

### 1. Product Browsing ✅
- **URL**: http://localhost:3001/products.html
- **What works**:
  - Products load from MongoDB database
  - Images display with fallbacks
  - Filters work (category, price, search)
  - "Add to Cart" button functional
- **Test**: Browse products, click "Add to Cart"

### 2. Shopping Cart ✅
- **URL**: http://localhost:3001/cart.html
- **What works**:
  - **Guest users**: Cart in browser localStorage
  - **Logged-in users**: Cart syncs to MongoDB
  - Update quantities
  - Remove items
  - Coupon codes work (WELCOME10, SAVE20)
  - Shipping calculation
- **Test**: Add products, update quantities, apply coupon

### 3. Checkout/Order ✅
- **URL**: http://localhost:3001/order.html
- **What works**:
  - Order summary display
  - Bank details (EFT)
  - Bitcoin payment option
  - InstaPay simulation
  - Proof of payment upload
  - **FIXED**: Orders now save to MongoDB via /api/v1/orders/create
- **Test**: Complete checkout flow

### 4. Authentication ✅
- **URL**: http://localhost:3001/login.html
- **What works**:
  - Login with email/password
  - JWT token storage
  - Role-based redirects (admin/staff/customer)
- **Test**: Login as different user types

### 5. Admin Dashboard ✅
- **URL**: http://localhost:3001/admin.html
- **What works**:
  - POS system interface
  - Product management UI
  - **FIXED**: Dashboard now shows real orders from MongoDB
  - **FIXED**: Payment approvals fetch from /api/v1/orders/all?paymentStatus=pending
  - **FIXED**: Approve/reject buttons call API endpoints
  - **FIXED**: Stats updated from real database data
- **Test**: Login as admin, view orders, approve/reject payments

---

## ⚠️ KNOWN ISSUES (Not Blocking UAT)

### 1. Voucher System - Demo Data (Low Priority)
- **Problem**: Vouchers still use localStorage
- **Impact**: Low - Vouchers only needed when sub-stores join
- **Fix time**: 15 minutes when needed
- **Note**: Intentionally deferred until sub-stores are onboarded

---

## 🎯 UAT TEST SCENARIOS

### Scenario 1: Guest Checkout
```
1. Browse http://localhost:3001/products.html
2. Add 3 products to cart
3. Go to http://localhost:3001/cart.html
4. Apply coupon code "WELCOME10"
5. Click "Proceed to Checkout"
6. Complete order at http://localhost:3001/order.html
7. Upload proof of payment

✅ Expected: Order summary shows, payment methods work
✅ FIXED: Order now saves to MongoDB database
```

### Scenario 2: Logged-in User
```
1. Login at http://localhost:3001/login.html
   - Email: test@example.com
   - Password: (create test user first)
2. Browse products
3. Add to cart
4. Checkout

✅ Expected: Cart persists to MongoDB, survives refresh
```

### Scenario 3: Admin Order Management
```
1. Login as admin
2. Go to http://localhost:3001/admin.html
3. View "Payment Approvals" tab - see pending orders
4. Click "View POP" to see order details
5. Click "Approve" or "Reject" to process payment
6. View "Orders" tab to see all orders

✅ FIXED: Admin dashboard now shows real orders from MongoDB
✅ FIXED: Approve/reject actions update database via API
```

---

## 🔧 API ENDPOINTS (Backend Ready)

All these work and can be tested with Postman/curl:

```
Products:
GET  /api/v1/products              - List all products ✅
GET  /api/v1/products/:id          - Get product by ID ✅

Cart (requires auth):
GET    /api/v1/cart                - Get user's cart ✅
POST   /api/v1/cart/add            - Add item to cart ✅
PUT    /api/v1/cart/item/:index    - Update quantity ✅
DELETE /api/v1/cart/item/:index    - Remove item ✅

Orders:
POST /api/v1/orders/create              - Create order (guest + logged-in) ✅
GET  /api/v1/orders/my-orders           - Get user orders ✅
GET  /api/v1/orders/all                 - Get all orders (admin) ✅
POST /api/v1/orders/:orderId/approve    - Approve payment (admin) ✅
POST /api/v1/orders/:orderId/reject     - Reject payment (admin) ✅

POS:
POST /api/v1/pos/sale              - Create POS sale ✅
GET  /api/v1/pos/sales/today       - Today's sales ✅

Vouchers:
POST /api/v1/vouchers/validate     - Validate coupon ✅
GET  /api/v1/vouchers/my-vouchers  - User's vouchers ✅
```

---

## 📊 DATABASE STATUS

**MongoDB**: `bmh`

**Collections**:
- ✅ `products` - Ready (need to seed)
- ✅ `users` - Ready
- ✅ `carts` - Ready
- ✅ `orders` - Ready
- ✅ `sales` - Ready
- ✅ `vouchers` - Ready

**To seed products**:
```bash
npm run seed
```

---

## 🚦 UAT GO/NO-GO

### ✅ READY FOR UAT - ALL CRITICAL FIXES COMPLETE:
- ✅ Products browsing works (MongoDB)
- ✅ Cart works (localStorage for guests, MongoDB for logged-in)
- ✅ Checkout flow works
- ✅ Payment methods display correctly
- ✅ **Orders persist to MongoDB**
- ✅ **Admin dashboard shows real orders**
- ✅ **Payment approval/rejection works**
- ✅ Backend APIs fully functional

### 🎯 RECOMMENDATION:
**UAT READY** - All critical functionality complete
Client can start full testing of the e-commerce flow

---

## 📞 SUPPORT DURING UAT

If issues found, check:
1. Is server running? `npm run dev`
2. Is MongoDB running? `mongosh bmh`
3. Check browser console for errors (F12)
4. Check server logs for API errors

**Contact info**: hello@basothomedicalherbs.ls
