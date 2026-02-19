# UAT READINESS STATUS - Basotho Medical Herbs

**Date**: 2025-11-04
**Server**: http://localhost:3001

## ✅ WORKING

### Backend (MongoDB + APIs)
- ✅ Server running on port 3001
- ✅ MongoDB connection: `bmh` database
- ✅ Models exist: User, Product, Order, Sale, Cart, Voucher, Affiliate
- ✅ API Routes registered:
  - `/api/v1/products` - GET products list ✅
  - `/api/v1/cart` - Cart management ✅
  - `/api/v1/orders` - Order creation ✅
  - `/api/v1/pos` - POS sales ✅
  - `/api/v1/vouchers` - Voucher system ✅
  - `/api/v1/affiliate` - Affiliate program ✅

### Frontend
- ✅ products.html - Fetches from `/api/v1/products`
- ✅ products.html - Image fallbacks working
- ✅ order.html - Fixed email (hello@basothomedicalherbs.ls)
- ✅ order.html - Fixed logo
- ✅ order.html - Fixed order number prefix (CBD)

## ⚠️ NEEDS FIXING (Priority)

### HIGH PRIORITY
1. **cart.html** - Still uses localStorage (lines 286, 371, 377, 407)
   - Need to replace with `/api/v1/cart` API calls
   - **Impact**: Cart not persisted across sessions

2. **admin.html** - Uses localStorage for ALL data
   - POPs, vouchers, orders, users all in localStorage
   - Need to fetch from real APIs
   - **Impact**: Admin can't see real orders

### MEDIUM PRIORITY
3. **dashboard.html** - Cart in localStorage (lines 1444, 1462, 2082)
   - **Impact**: User cart not synced

4. **order.html** - Bitcoin QR image may be broken
   - **Impact**: Crypto payments may not work

## 🚀 TESTING WORKFLOW FOR UAT

### Step 1: Seed Products
```bash
npm run seed
```

### Step 2: Start Server
```bash
npm run dev
```

### Step 3: Test User Flow
1. Browse http://localhost:3001/products.html
2. Add products to cart
3. Go to http://localhost:3001/cart.html
4. Checkout at http://localhost:3001/order.html
5. Admin views orders at http://localhost:3001/admin.html

## ⏰ NEXT IMMEDIATE FIXES

1. cart.html localStorage → Cart API (30 min)
2. admin.html show real orders (20 min)
3. Test full flow (10 min)

**TOTAL TIME TO UAT READY**: ~1 hour

## 📝 NOTES FOR CLIENT

- Products load from database ✅
- Cart currently browser-only (fixing next)
- Admin dashboard will show real orders soon
- Voucher system ready but can be enabled later when sub-stores join
