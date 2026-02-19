# Basotho Medical Herbs - Technical Module Breakdown

**Date:** 2025-11-08
**Focus:** Technical architecture for white-label marketplace
**Goal:** Clear separation between base platform and add-on modules

---

## 🏗️ BASE PLATFORM (R22,000 Setup)

### **What's Included in Base Platform:**

This is the **core Basotho Medical Herbs system** that every merchant gets:

#### **Frontend Pages:**
```
✅ index.html                    - Homepage
✅ login.html                    - Authentication
✅ register.html                 - User signup
✅ dashboard.html                - Customer dashboard
✅ products.html                 - Product catalog
✅ product.html                  - Single product view
✅ cart.html                     - Shopping cart
✅ checkout.html                 - Checkout flow
✅ admin.html                    - Admin dashboard
✅ pos.html                      - POS system
✅ section21-info.html           - Section 21 information page
```

#### **Backend Core:**
```
✅ backend/server.js             - Express server (Port 3001)
✅ backend/modules/auth/         - JWT authentication
✅ backend/modules/database/     - MongoDB connection
✅ backend/modules/payment/      - Payment gateway (InstaPay, EFT, Card)
✅ backend/modules/notification/ - Email (nodemailer) & SMS (Twilio)
✅ backend/modules/logger/       - Winston logging
✅ backend/modules/pos/          - POS integration
```

#### **Core Database Models:**
```
✅ User.js                       - Customer accounts, roles, tiers
✅ Product.js                    - Product catalog
✅ MenuItem.js                   - La Brewha/Bean & Bud menu
✅ Order.js                      - E-commerce orders
```

#### **Core API Routes:**
```
✅ /api/v1/users                 - User management
✅ /api/v1/products              - Product CRUD
✅ /api/v1/menu                  - Menu items
✅ /api/v1/order                 - Order processing
✅ /api/v1/cart                  - Shopping cart
✅ /api/v1/dashboard             - User dashboard data
```

#### **Core Features:**
- Product catalog management
- User authentication (JWT)
- Shopping cart & checkout
- Order management
- Payment processing
- Inventory tracking
- Admin dashboard
- POS system
- Email notifications
- Mobile responsive design

---

## 🔌 ADD-ON MODULES (Charged Separately)

### **Currently Built Modules:**

#### **1. Drive-Through Module** 🚗
**Status:** ✅ BUILT (Basic flow working, EFT approval pending)
**Files:**
```
Frontend:
- drive-through.html              - Customer order interface
- drive-through-staff.html        - Staff queue dashboard

Backend:
- backend/routes/drive-through.js - API endpoints (540 lines)

Database:
- backend/modules/database/models/DriveThrough.js
```

**Features:**
- Customer order-ahead
- GPS tracking (5km geofence)
- Staff queue management
- Real-time order tracking
- Payment integration
- Section 21 compliance checks

**What Needs White-Labeling:**
⚠️ **Hardcoded Fourways location:** `-26.0287, 28.0022`
- Need to make location configurable per merchant
- Store settings table in database

---

#### **2. Viral Influencer Module** 🎯
**Status:** ✅ FULLY BUILT (2,700 lines)
**Files:**
```
Frontend:
- viral-influencer.html           - Influencer dashboard
- viral-admin.html                - Admin campaign management

Backend:
- backend/routes/viral.js         - Viral scoring (942 lines)
- backend/routes/influencer-verification.js - Social verification (1,022 lines)

Database:
- backend/modules/database/models/ViralScore.js (280 lines)
- backend/modules/database/models/ViralCampaign.js (456 lines)
```

**Features:**
- Social media verification (Instagram, TikTok, YouTube, Twitter)
- Influencer tier assignment
- Viral score algorithm
- Campaign management
- Performance tracking
- Firecrawl integration

**What Needs White-Labeling:**
✅ Already generic - no hardcoded business logic
⚠️ Firecrawl API key needs to be merchant-specific

---

#### **3. Section 21 Medical Cannabis Module** 💊
**Status:** ✅ FULLY BUILT
**Files:**
```
Frontend:
- section21-info.html             - Information page
- (Integrated in dashboard.html)  - Document upload

Backend:
- backend/routes/section21.js    - Compliance routes

Database:
- backend/modules/database/models/Section21Document.js
```

**Features:**
- Authorization letter upload
- Prescription verification
- Doctor credential checking
- 180-day renewal tracking
- Compliance enforcement (no discounts on medicine)

**What Needs White-Labeling:**
⚠️ **Basotho Medical Herbs branding** in section21-info.html
- Email: section21@basothomedicalherbs.ls → merchant email
- Company name references

---

#### **4. Affiliate Marketing Module** 💰
**Status:** ✅ FULLY BUILT
**Files:**
```
Frontend:
- affiliate.html                  - Affiliate dashboard

Backend:
- backend/routes/affiliate.js    - Affiliate API

Database:
- backend/modules/database/models/Affiliate.js
```

**Features:**
- Affiliate signup
- Commission tracking (15% default)
- Link generation
- Performance reports
- Payout management

**What Needs White-Labeling:**
⚠️ **Commission rate:** Hardcoded 15%
- Need merchant-configurable commission rates
- Different rates per tier

---

#### **5. Voucher/Coupon Module** 🎫
**Status:** 🔄 BACKEND 60% DONE
**Files:**
```
Backend:
- backend/routes/vouchers.js     - API routes exist

Database:
- (Need to create Voucher.js model)
```

**Features Built:**
- Basic voucher routes defined
- Redemption tracking structure

**What Needs to Be Built:**
- [ ] Voucher database model
- [ ] Admin UI for voucher creation
- [ ] Checkout integration
- [ ] Section 21 compliance (no discounts on medicine)
- [ ] R700 onboarding voucher support

**What Needs White-Labeling:**
✅ Will be generic from start

---

#### **6. Loyalty Points & Tiers Module** ⭐
**Status:** 🔄 BACKEND 50% DONE
**Files:**
```
Database:
- User.js has wellnessPoints field
- User.js has membershipTier field
```

**Features Built:**
- Points field in User model
- Tier field in User model

**What Needs to Be Built:**
- [ ] Points earning rules
- [ ] Points redemption system
- [ ] Tier benefits configuration
- [ ] Customer dashboard UI
- [ ] Admin points management

**What Needs White-Labeling:**
⚠️ **Tier names:** Bronze/Silver/Gold/Platinum/Diamond
- Need merchant-configurable tier names
- "Wellness Points" → merchant-specific terminology

---

## 🛠️ WHITE-LABELING REQUIREMENTS

### **What Needs to Be Configurable:**

#### **1. Store Settings Table (New)**
Create database model: `StoreSettings.js`

```javascript
{
  merchantId: ObjectId,
  businessName: String,           // "Basotho Medical Herbs" → "ABC Pharmacy"
  branding: {
    logo: String,                 // URL to logo
    primaryColor: String,         // "#2D5016" → merchant color
    secondaryColor: String,
    favicon: String
  },
  contact: {
    email: String,                // "hello@basothomedicalherbs.ls" → merchant email
    phone: String,
    address: String
  },
  location: {
    latitude: Number,             // -26.0287 → merchant coords
    longitude: Number,            // 28.0022 → merchant coords
    address: String,
    city: String,
    province: String,
    postalCode: String
  },
  modules: {
    driveThrough: Boolean,        // Enabled/disabled per merchant
    viralInfluencer: Boolean,
    section21: Boolean,
    affiliate: Boolean,
    vouchers: Boolean,
    loyaltyPoints: Boolean
  },
  moduleSettings: {
    driveThrough: {
      geofenceRadius: Number,     // Default 5km, merchant can change
      operatingHours: Object
    },
    affiliate: {
      defaultCommission: Number,  // Default 15%, merchant can change
      tiers: Array               // Custom commission tiers
    },
    loyaltyPoints: {
      pointsPerRand: Number,      // Default 1 point per R1
      tierNames: Array,           // Custom tier names
      tierBenefits: Object
    }
  }
}
```

---

#### **2. Files That Need Dynamic Branding:**

**High Priority (Customer-Facing):**
```
⚠️ index.html                    - Replace "Basotho Medical Herbs" with {{businessName}}
⚠️ section21-info.html           - Replace contact info
⚠️ drive-through.html            - Replace logo, name
⚠️ drive-through-staff.html      - Store location from settings
⚠️ All email templates           - Company name, logo, contact
```

**Medium Priority (Admin-Facing):**
```
⚠️ admin.html                    - Dashboard title
⚠️ viral-admin.html              - Company branding
⚠️ affiliate.html                - Commission rates
```

---

#### **3. Hardcoded Values to Extract:**

**Location-Specific:**
```javascript
// Current (Fourways-specific):
const STORE_LOCATION = { lat: -26.0287, lng: 28.0022 };

// Should be:
const STORE_LOCATION = {
  lat: merchant.location.latitude,
  lng: merchant.location.longitude
};
```

**Branding-Specific:**
```javascript
// Current:
<title>Basotho Medical Herbs</title>
<h1>Basotho Medical Herbs</h1>
Email: hello@basothomedicalherbs.ls

// Should be:
<title>{{merchant.businessName}}</title>
<h1>{{merchant.businessName}}</h1>
Email: {{merchant.contact.email}}
```

**Module-Specific:**
```javascript
// Current:
const DEFAULT_COMMISSION = 0.15; // 15%

// Should be:
const DEFAULT_COMMISSION = merchant.moduleSettings.affiliate.defaultCommission;
```

---

## 📋 TECHNICAL WORK NEEDED FOR WHITE-LABELING

### **Phase 1: Database Foundation (2-3 hours)**

1. **Create StoreSettings Model**
   - File: `backend/modules/database/models/StoreSettings.js`
   - Include all merchant-specific config
   - Add validation

2. **Create Merchant Onboarding**
   - Setup wizard for new merchants
   - Collect: business name, location, branding
   - Generate initial settings document

3. **Add Settings API**
   - `GET /api/v1/settings` - Fetch merchant settings
   - `PUT /api/v1/settings` - Update settings (admin only)

---

### **Phase 2: Dynamic Configuration (4-5 hours)**

1. **Frontend Templating**
   - Replace hardcoded "Basotho Medical Herbs" with `{{businessName}}`
   - Use template engine OR
   - Fetch settings on page load and inject

2. **Backend Configuration Injection**
   - Middleware to attach merchant settings to request
   - Use settings for location, rates, etc.

3. **Email Template Updates**
   - Dynamic company name, logo, contact info
   - Use merchant settings in all email sends

---

### **Phase 3: Module Isolation (3-4 hours)**

1. **Drive-Through Module**
   - Extract Fourways coordinates → settings
   - Make geofence radius configurable
   - Operating hours per merchant

2. **Affiliate Module**
   - Commission rates from settings
   - Custom tier names
   - Merchant-specific tracking codes

3. **Section 21 Module**
   - Contact email from settings
   - Doctor directory per merchant (optional)

---

### **Phase 4: Multi-Tenant Architecture (Optional - 8-10 hours)**

**If you want multiple merchants on same server:**

1. **Subdomain Strategy**
   - merchant1.basothomedicalherbs.ls
   - merchant2.basothomedicalherbs.ls
   - Each subdomain maps to merchantId

2. **Database Partitioning**
   - All models get `merchantId` field
   - Queries automatically filter by merchant
   - Data isolation

3. **Authentication Scoping**
   - JWT includes merchantId
   - Users can only access their merchant's data

**OR Single-Tenant (Recommended for now):**
- Each merchant gets own server instance
- Separate database per merchant
- Full data isolation
- Easier to manage

---

## 🎯 RECOMMENDED APPROACH

### **For Next Session:**

**Option A: Quick White-Label (1 day)**
- Create StoreSettings model
- Add settings API
- Replace top 10 hardcoded values
- Test with 2nd merchant config

**Option B: Full Multi-Tenant (1 week)**
- Complete database redesign
- Subdomain routing
- Data isolation
- Merchant onboarding wizard

**My Recommendation:** **Option A** (Quick White-Label)
- Faster to market
- Each merchant gets own instance (cleaner)
- Settings stored in database
- 80% of white-labeling done in 1 day

---

## 📊 CURRENT STATE SUMMARY

### **What Works Now (R22K Base):**
✅ E-commerce platform
✅ Admin dashboard
✅ POS system
✅ Product catalog
✅ Order management
✅ Payment processing
✅ User authentication

### **What's Built as Modules (Separate Charge):**
✅ Drive-Through (basic flow)
✅ Viral Influencer (100% complete)
✅ Section 21 Compliance (100% complete)
✅ Affiliate Marketing (100% complete)
🔄 Vouchers (60% backend)
🔄 Loyalty Points (50% backend)

### **What Needs Work for White-Labeling:**
⚠️ Hardcoded Fourways location (3 files)
⚠️ Hardcoded "Basotho Medical Herbs" branding (~15 files)
⚠️ Hardcoded commission rates (2 files)
⚠️ Hardcoded contact info (~8 files)

**Estimated Time to White-Label:** 1-2 days

---

## 🎬 NEXT SESSION PRIORITIES

Based on this technical breakdown, what should we focus on?

1. **White-label the base platform** (1-2 days)
   - Create StoreSettings model
   - Extract hardcoded values
   - Test with 2nd merchant config

2. **Complete Drive-Through module** (0.5 days)
   - Add EFT approval workflow
   - Make location configurable
   - Test end-to-end

3. **Test Viral Influencer module** (0.5 days)
   - Already built, just needs testing
   - Verify Firecrawl integration
   - Create demo

4. **Complete Vouchers module** (2 days)
   - Build admin UI
   - Add checkout integration
   - Section 21 compliance

**Your call - which technical priority should we tackle first?**
