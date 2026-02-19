# Next Session Quick Start - Voucher Module

**Start Date:** Next session
**Goal:** Build complete voucher/coupon system in 2 days
**Revenue Target:** +30% increase in Month 1

---

## 🚀 Session Start Checklist

### Before You Begin:
- [ ] Server running: `npm start` (Port 3001)
- [ ] MongoDB running: Check `bmh` database
- [ ] Read NEXT-MODULE-STRATEGY.md (full spec)
- [ ] Review todo list (10 tasks)

---

## 📋 Build Order (Optimized for Speed)

### **Phase 1: Backend Foundation (2-3 hours)**

#### Task 1: Create Voucher Model
**File:** `/backend/modules/database/models/Voucher.js`

**Fields to include:**
- `code` - Unique voucher code (e.g., "SUMMER2024")
- `type` - percentage | fixed | bogo | free_shipping
- `value` - Discount amount (20 for 20% or R20)
- `minPurchase` - Minimum cart value required
- `startDate` - When voucher becomes active
- `expiryDate` - When voucher expires
- `redemptionLimit` - unlimited | once_per_customer | single_use
- `maxRedemptions` - Total redemption cap
- `redeemCount` - Current redemption count
- `redemptionHistory[]` - Track who redeemed when
- `status` - active | inactive | expired
- `createdBy` - Admin user ID
- `autoApplyTiers[]` - Auto-apply for loyalty tiers

**Validation:**
- Code must be unique and uppercase
- Value must be positive number
- Expiry date must be in future
- Max redemptions must be > 0

---

#### Task 2: Backend API Endpoints
**File:** `/backend/routes/vouchers.js` (already exists - enhance it)

**Endpoints needed:**

1. **POST `/api/v1/vouchers`** (Admin only)
   - Create new voucher
   - Auto-generate code if not provided
   - Return voucher object

2. **GET `/api/v1/vouchers`** (Admin only)
   - List all vouchers with filters
   - Sort by: date, redemptions, status
   - Pagination support

3. **POST `/api/v1/vouchers/validate`** (Customer)
   - Validate voucher code
   - Check expiry, limits, min purchase
   - Return discount amount
   - **DO NOT redeem yet** - just validate

4. **POST `/api/v1/vouchers/redeem/:code`** (System - called on order completion)
   - Increment redeemCount
   - Add to redemptionHistory
   - Update voucher status if maxRedemptions reached

5. **PUT `/api/v1/vouchers/:id`** (Admin only)
   - Update voucher details
   - Can't change code if already redeemed

6. **DELETE `/api/v1/vouchers/:id`** (Admin only)
   - Soft delete (set status to 'inactive')
   - Can't delete if already redeemed

7. **GET `/api/v1/vouchers/:id/analytics`** (Admin only)
   - Redemption stats
   - Revenue generated
   - Top customers who used it

---

### **Phase 2: Admin UI (2-3 hours)**

#### Task 3: Admin Vouchers Tab
**File:** `/admin.html`

**Add to navigation:**
```html
<li data-tab="vouchers">
    <i class="fas fa-ticket-alt"></i> Vouchers
</li>
```

**Tab content sections:**
1. **Create Voucher Form**
   - Code input (auto-generate button)
   - Type selector (dropdown)
   - Value input (number)
   - Min purchase (optional)
   - Date range (start/expiry)
   - Redemption limits
   - Auto-apply tiers (checkboxes)
   - Create button

2. **Voucher List Table**
   - Columns: Code, Type, Value, Redeemed, Expiry, Status, Actions
   - Actions: Edit, Deactivate, Analytics
   - Filter by: Active, Expired, All
   - Sort by: Date, Redemptions

3. **Voucher Analytics Panel**
   - Total vouchers created
   - Active vouchers
   - Total redemptions
   - Total revenue from vouchers
   - Top performing vouchers

**JavaScript functions needed:**
```javascript
async function createVoucher()
async function loadVouchers()
async function editVoucher(id)
async function deactivateVoucher(id)
async function viewVoucherAnalytics(id)
function generateVoucherCode() // Random 8-char code
```

---

### **Phase 3: Checkout Integration (2 hours)**

#### Task 4: Add Voucher Input to Checkout
**Files:** `/cart.html` and `/checkout.html`

**HTML structure:**
```html
<div class="voucher-section">
    <h4>Have a coupon code?</h4>
    <div class="voucher-input-group">
        <input type="text"
               id="voucherCode"
               placeholder="Enter code (e.g., SUMMER20)"
               maxlength="20">
        <button onclick="applyVoucher()">Apply</button>
    </div>

    <!-- Success message -->
    <div id="voucherSuccess" style="display:none;">
        <i class="fas fa-check-circle"></i>
        Code <strong id="appliedCode"></strong> applied!
        You saved <strong id="savedAmount"></strong>
        <button onclick="removeVoucher()">Remove</button>
    </div>

    <!-- Error message -->
    <div id="voucherError" style="display:none;"></div>
</div>

<!-- Order summary with discount line -->
<div class="order-summary">
    <div class="line-item">
        <span>Subtotal</span>
        <span id="subtotal">R0.00</span>
    </div>

    <div class="line-item discount" id="discountLine" style="display:none;">
        <span>Discount (<span id="discountCode"></span>)</span>
        <span id="discountAmount" class="text-success">-R0.00</span>
    </div>

    <div class="line-item total">
        <span><strong>Total</strong></span>
        <span id="total"><strong>R0.00</strong></span>
    </div>
</div>
```

**JavaScript functions:**
```javascript
let appliedVoucher = null;

async function applyVoucher() {
    const code = document.getElementById('voucherCode').value.trim().toUpperCase();
    const cartTotal = calculateCartTotal();

    const response = await fetch(`${API_URL}/vouchers/validate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, cartTotal })
    });

    const data = await response.json();

    if (data.success) {
        appliedVoucher = data.voucher;
        showVoucherSuccess(data.voucher);
        updateOrderSummary();
    } else {
        showVoucherError(data.error);
    }
}

function removeVoucher() {
    appliedVoucher = null;
    document.getElementById('voucherSuccess').style.display = 'none';
    document.getElementById('voucherCode').value = '';
    updateOrderSummary();
}

function updateOrderSummary() {
    const subtotal = calculateCartTotal();
    let discount = 0;

    if (appliedVoucher) {
        discount = appliedVoucher.discountAmount;
    }

    const total = subtotal - discount;

    document.getElementById('subtotal').textContent = `R${subtotal.toFixed(2)}`;
    document.getElementById('total').textContent = `R${total.toFixed(2)}`;

    if (discount > 0) {
        document.getElementById('discountLine').style.display = 'flex';
        document.getElementById('discountCode').textContent = appliedVoucher.code;
        document.getElementById('discountAmount').textContent = `-R${discount.toFixed(2)}`;
    } else {
        document.getElementById('discountLine').style.display = 'none';
    }
}
```

---

#### Task 5: Order Submission with Voucher
**File:** `/cart.html` or `/checkout.html` - Update `placeOrder()` function

**Include voucher in order:**
```javascript
async function placeOrder() {
    const orderData = {
        items: cartItems,
        subtotal: calculateCartTotal(),
        voucher: appliedVoucher ? {
            code: appliedVoucher.code,
            type: appliedVoucher.type,
            value: appliedVoucher.value,
            discountAmount: appliedVoucher.discountAmount
        } : null,
        total: calculateFinalTotal(),
        // ... other order fields
    };

    const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    });

    const data = await response.json();

    if (data.success && appliedVoucher) {
        // Redeem the voucher
        await fetch(`${API_URL}/vouchers/redeem/${appliedVoucher.code}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId: data.order._id })
        });
    }

    // ... rest of order completion
}
```

---

### **Phase 4: Testing (1-2 hours)**

#### Task 6: Playwright Test
**File:** `/tests/e2e/voucher-flow.spec.js`

**Test coverage:**
```javascript
test('Complete voucher flow', async ({ page }) => {
    // 1. Admin creates voucher
    // 2. Customer adds products to cart
    // 3. Customer applies voucher code
    // 4. Verify discount applied
    // 5. Complete order
    // 6. Verify voucher redeemCount incremented
    // 7. Try to reuse (if once_per_customer) - should fail
});

test('Voucher validation rules', async ({ page }) => {
    // 1. Expired voucher - should fail
    // 2. Below minimum purchase - should fail
    // 3. Max redemptions reached - should fail
    // 4. Invalid code - should fail
});
```

---

#### Task 7: Manual Testing Checklist
- [ ] Create voucher as admin
- [ ] Apply valid voucher at checkout
- [ ] Verify discount calculation correct
- [ ] Complete order with voucher
- [ ] Check voucher redeemCount updated
- [ ] Try to reuse once_per_customer voucher (should fail)
- [ ] Try expired voucher (should fail)
- [ ] Test percentage vs fixed amount discounts
- [ ] Test BOGO voucher (if implemented)
- [ ] View analytics for voucher

---

### **Phase 5: Launch Preparation (1 hour)**

#### Task 8: Create First Campaign
**Voucher:** WELCOME20
**Type:** Percentage
**Value:** 20%
**Min Purchase:** R200
**Expiry:** 30 days from now
**Limit:** Once per customer
**Max Redemptions:** 500

#### Task 9: Email Campaign
**File:** `/backend/modules/notification/email-templates/welcome-voucher.html`

**Subject:** "Welcome to Basotho Medical Herbs - 20% Off Your First Order!"

**Template:**
```html
<h1>Welcome to Basotho Medical Herbs! 🌿</h1>
<p>Use code <strong>WELCOME20</strong> at checkout for 20% off your first order.</p>
<p>Minimum purchase: R200</p>
<p>Valid for 30 days.</p>
<a href="https://portal.basothomedicalherbs.ls/products.html">Shop Now</a>
```

---

## 🎯 Success Criteria

### Minimum Viable Product (Day 1 Complete):
- [ ] Can create voucher in admin panel
- [ ] Can list all vouchers
- [ ] Customer can apply voucher at checkout
- [ ] Discount correctly calculated
- [ ] Voucher redeemed on order completion

### Full Feature Set (Day 2 Complete):
- [ ] All voucher types work (percentage, fixed, BOGO)
- [ ] Validation rules enforced (expiry, limits, min purchase)
- [ ] Analytics dashboard shows redemption stats
- [ ] Playwright tests passing
- [ ] WELCOME20 campaign created and tested

### Marketplace Ready (Week 2):
- [ ] 3 active promotional campaigns
- [ ] 50+ voucher redemptions
- [ ] Documented for white-label merchants
- [ ] Revenue increase measured

---

## 📊 Key Metrics to Track

### Week 1:
- Vouchers created: Target 5+
- Redemptions: Target 50+
- Discount amount given: Track R total
- Revenue with vouchers vs without

### Month 1:
- Total redemptions: Target 500+
- New customers acquired via vouchers: Target 100+
- Revenue increase: Target +30%
- Average order value with voucher: Measure

---

## 🚨 Common Pitfalls to Avoid

1. **Don't allow discount > cart total** - Cap at 100%
2. **Validate on backend, not just frontend** - Security
3. **Check redemption limits BEFORE decrementing inventory** - Race conditions
4. **Store voucher details in order** - For audit trail
5. **Expire vouchers automatically** - Cron job or check on load
6. **Don't let users stack vouchers** - One per order (unless you want to allow it)

---

## 💡 Pro Tips

1. **Auto-generate codes:** Use crypto.randomBytes for unique codes
2. **Case-insensitive matching:** Always convert to uppercase
3. **Soft delete:** Never hard delete vouchers (audit trail)
4. **Pre-launch test:** Create test voucher, verify full flow
5. **Monitor redemptions:** Set up alerts for suspicious activity (same IP, mass redemptions)

---

## 🔗 Reference Files

**Read these before starting:**
- `/NEXT-MODULE-STRATEGY.md` - Full voucher spec (15,000 words)
- `/SESSION-SUMMARY.md` - What we accomplished last session
- `/backend/routes/vouchers.js` - Existing backend code
- `/admin.html` - Where you'll add voucher UI
- `/cart.html` - Where customers apply vouchers

**Similar implementations to reference:**
- `/backend/routes/order.js` - Order creation flow
- `/backend/modules/database/models/Product.js` - Model structure example
- `/pos.html` - Admin UI patterns

---

## ✅ Pre-Start Checklist

Before you write a single line of code:

- [ ] Server running (`npm start`)
- [ ] MongoDB connected
- [ ] Admin login working (admin@basothomedicalherbs.ls / Admin123!)
- [ ] Test user exists (user@basothomedicalherbs.ls / User123!)
- [ ] Products seeded (check /products.html)
- [ ] Cart working (can add products)
- [ ] Reviewed NEXT-MODULE-STRATEGY.md
- [ ] Todo list ready (10 tasks)

---

## 🎬 First 5 Commands to Run

```bash
# 1. Start server
npm start

# 2. Open admin panel
open http://localhost:3001/admin.html

# 3. Check if vouchers route exists
curl http://localhost:3001/api/v1/vouchers

# 4. Create Voucher.js model
touch backend/modules/database/models/Voucher.js

# 5. Run existing tests (baseline)
npm test
```

---

## 📞 Need Help During Session?

**Quick debugging:**
1. Check server logs for errors
2. Use browser DevTools Network tab
3. Verify JWT token in localStorage
4. Check MongoDB collection: `db.vouchers.find()`
5. Test API with curl before frontend

**Common errors:**
- 401 Unauthorized → Check token
- 404 Not Found → Check route is mounted in server.js
- 500 Server Error → Check backend logs
- Voucher not applying → Check validation logic

---

## 🏆 End Goal

By end of next session, you should be able to:

1. Log in as admin
2. Create voucher "WELCOME20" (20% off, min R200)
3. Log in as customer
4. Add R250 worth of products to cart
5. Apply "WELCOME20" code
6. See discount of R50 (20% of R250)
7. Complete order with total R200
8. Verify voucher redemption in admin panel
9. Try to reuse code (should fail if once_per_customer)
10. See analytics showing 1 redemption

**If all 10 steps work → Module complete! 🎉**

---

**LET'S BUILD THIS! 🚀**

Next session starts with Task 1: Create Voucher Model
Estimated completion: 2 days (16 hours)
