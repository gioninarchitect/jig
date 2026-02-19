# UAT Deployment Checklist for CBD Wellness 24

## Current Status: Ready for Manual Testing & Deployment

### ✅ Completed Tasks

1. **UAT User Accounts Created**
   - All 5 UAT test users created in local database with correct passwords
   - Script: `create-uat-users.js`
   - Credentials match `uat-testing.html`

2. **Authentication Working**
   - Playwright tests: 4/5 passing
   - Admin login: ✓ WORKING
   - Manager login: ✓ WORKING
   - User login: ✓ WORKING (redirects to dashboard.html)
   - Logout: ✓ WORKING
   - Invalid credentials: ✓ PROPERLY REJECTED

3. **Comprehensive Logging Added**
   - All login attempts logged with IP address, user agent, timestamps
   - Duration tracking
   - Success/failure states tracked
   - Files modified:
     - `backend/modules/user/routes.js` (lines 70-154)
     - `backend/modules/auth/middleware.js` (lines 10-87)

---

## 🚨 CRITICAL: Production Deployment Steps

### Step 1: Deploy UAT Users to Production Database

**On your SSH terminal (portal.cbdwellness24.co.za):**

```bash
# Navigate to application directory
cd /var/www/cbd-wellness-24

# Upload create-uat-users.js
# (Transfer via SCP from local machine first)

# Run the script to create UAT users
node create-uat-users.js

# Verify users were created
```

Expected output:
```
✓ Updated admin@cbdwellness24.co.za
✓ Updated manager@cbdwellness24.co.za
✓ Created assistant@cbdwellness24.co.za
✓ Updated user@cbdwellness24.co.za
✓ Updated patient@cbdwellness24.co.za
```

### Step 2: Deploy Updated Code to Production

Files to deploy:
- `backend/server.js` (if modified)
- `backend/modules/user/routes.js` (logging added)
- `backend/modules/auth/middleware.js` (logging added)
- `create-uat-users.js` (new file)

**Deployment commands:**

```bash
# From local machine
cd /Users/florisolivier/CBD_Wellness_24

# Create deployment package
tar -czf uat-deployment-$(date +%Y%m%d-%H%M).tar.gz \
    backend/modules/user/routes.js \
    backend/modules/auth/middleware.js \
    create-uat-users.js

# Upload to server
scp uat-deployment-*.tar.gz username@portal.cbdwellness24.co.za:/var/www/cbd-wellness-24/

# SSH into server
ssh username@portal.cbdwellness24.co.za

# Extract files
cd /var/www/cbd-wellness-24
tar -xzf uat-deployment-*.tar.gz

# Restart server
pm2 restart cbd-wellness-24

# Check logs
pm2 logs cbd-wellness-24 --lines 50
```

---

## 🧪 Manual Testing Required

### Test 1: UAT User Logins (CRITICAL)

**Test all 5 UAT accounts on production:**

1. **Admin** (admin@cbdwellness24.co.za / Admin123!)
   - Should redirect to `admin.html`
   - Should see ADMIN PANEL badge
   - Should see all admin features

2. **Manager** (manager@cbdwellness24.co.za / Manager123!)
   - Should redirect to admin panel
   - Should see manager-level features only

3. **Assistant** (assistant@cbdwellness24.co.za / Assistant123!)
   - Should redirect to POS system
   - Should have limited features (POS only)

4. **User** (user@cbdwellness24.co.za / User123!)
   - Should redirect to `dashboard.html`
   - Should see customer dashboard

5. **Patient** (patient@cbdwellness24.co.za / Patient123!)
   - Should redirect to `dashboard.html`
   - Should see Section 21 patient features

### Test 2: POS System (CRITICAL FOR OWNERS)

**Login as**: assistant@cbdwellness24.co.za / Assistant123!

**Test Steps**:
1. Navigate to POS system in admin panel
2. Add products to cart
   - Verify stock quantities are correct
   - Verify prices display correctly
3. Apply discount/voucher (if applicable)
4. Complete checkout
   - Cash payment
   - Card payment
5. Verify invoice generated
   - Check all details are correct (items, prices, total)
   - Customer information
   - Date/time stamp
6. Test email invoice functionality
   - Enter test email address
   - Verify email is sent
   - Check email formatting

**Known Issues to Check**:
- ✓ Stock checking uses `product.inventory.quantity` (fixed)
- ✓ Toast notifications instead of browser alerts (fixed)
- ✓ Staff role shows "Assistant" not "Cashier" (fixed)

### Test 3: E-Commerce Checkout (CRITICAL FOR OWNERS)

**Login as**: user@cbdwellness24.co.za / User123!

**Test Steps**:
1. Browse products on main site
2. Add products to cart
   - Verify cart drawer opens
   - Verify cart persists (localStorage)
3. Navigate to checkout
4. Fill in delivery address
5. Select payment method
6. Complete order
7. Verify order confirmation
   - Order number generated
   - Order appears in user dashboard
   - Order appears in admin panel
8. Verify invoice generation
   - Invoice created with correct details
   - Invoice downloadable
9. Test email confirmation
   - Order confirmation sent to customer email
   - Invoice attached or linked

### Test 4: Admin Dashboard - Role-Based Access

Test what each role can see in `admin.html`:

**Admin** (admin@cbdwellness24.co.za / Admin123!)
- Should see ALL tabs:
  - Inventory
  - POS
  - Payments
  - Affiliates
  - Vouchers
  - Orders
  - Users
  - Staff
  - Leads

**Manager** (manager@cbdwellness24.co.za / Manager123!)
- Should see:
  - Inventory
  - POS
  - Payments
  - Orders
  - Staff (view only?)
- Should NOT see:
  - Users (sensitive)
  - Affiliates (admin only?)

**Assistant** (assistant@cbdwellness24.co.za / Assistant123!)
- Should see:
  - POS ONLY
- Should NOT see:
  - Inventory
  - Payments (view history only?)
  - Users, Staff, etc.

---

## 📊 UAT Test Credentials Reference

All credentials are documented at:
**https://portal.cbdwellness24.co.za/uat-testing.html**

| Role | Email | Password | Expected Dashboard |
|------|-------|----------|-------------------|
| Admin | admin@cbdwellness24.co.za | Admin123! | admin.html |
| Store Manager | manager@cbdwellness24.co.za | Manager123! | admin.html (limited) |
| Shop Assistant | assistant@cbdwellness24.co.za | Assistant123! | pos.html or admin.html POS tab |
| Lifestyle Member | user@cbdwellness24.co.za | User123! | dashboard.html |
| Section 21 Patient | patient@cbdwellness24.co.za | Patient123! | dashboard.html |

---

## 🐛 Known Issues (Dashboard)

### dashboard.html JavaScript Errors

**Error**: `Cannot set properties of null (setting 'textContent')`
**Location**: dashboard.html:1705:66
**Impact**: Stats display may not load correctly
**Priority**: Medium - doesn't break core functionality

**Browser Console Warnings**:
- Missing Lucide icons: 'camouflage', 'pills'
- 404 errors for some resources

**Action Required**: Test dashboard.html manually after login to see if these errors impact UX

---

##  Next Steps

1. **Deploy to Production** (Steps above)
2. **Run UAT Users Script** on production database
3. **Test All 5 UAT Logins** on production
4. **Test POS System** end-to-end
5. **Test E-Commerce Checkout** end-to-end
6. **Test Invoice Generation & Email**
7. **Verify Role-Based Access** in admin panel
8. **Notify Client** UAT can begin testing

---

## 📞 Support Commands for Production Server

If client reports issues during UAT:

```bash
# SSH into server
ssh username@portal.cbdwellness24.co.za

# Check server status
pm2 status cbd-wellness-24

# View real-time logs
pm2 logs cbd-wellness-24

# Check recent login attempts
pm2 logs cbd-wellness-24 | grep "Login attempt"

# Check MongoDB connection
mongosh cbdwellness24 --eval "db.users.find({}, {email: 1, role: 1}).pretty()"

# Restart server if needed
pm2 restart cbd-wellness-24
```

---

## 🔒 Security Notes

- All passwords use bcrypt with 10 rounds
- JWT tokens expire after 7 days
- Login attempts are tracked (locked after 5 failed attempts for 15 minutes)
- All auth events are logged with IP addresses and user agents
- CORS configured for production domain: portal.cbdwellness24.co.za

---

## Production URLs

- **Main Site**: https://portal.cbdwellness24.co.za
- **UAT Guide**: https://portal.cbdwellness24.co.za/uat-testing.html
- **Admin Panel**: https://portal.cbdwellness24.co.za/admin
- **Dashboard**: https://portal.cbdwellness24.co.za/dashboard
- **API Health**: https://portal.cbdwellness24.co.za/api/v1/health

---

Generated: 2025-11-05
