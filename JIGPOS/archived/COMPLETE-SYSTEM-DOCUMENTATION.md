# Basotho Medical Herbs - Complete System Documentation

**For**: Handoff to frontend developer / AI assistant
**Date**: 2025-11-05
**Status**: Comprehensive technical reference

---

## 📁 PROJECT STRUCTURE

```
BMH/
├── backend/
│   ├── server.js                          # Main Express server (Port 3001)
│   ├── modules/
│   │   ├── auth/
│   │   │   └── middleware.js              # JWT authentication, role checking
│   │   ├── database/
│   │   │   ├── index.js                   # MongoDB connection
│   │   │   └── models/                    # Mongoose schemas
│   │   │       ├── User.js                # Users, authentication
│   │   │       ├── Product.js             # Products, inventory
│   │   │       ├── Order.js               # E-commerce orders
│   │   │       ├── MenuItem.js            # Bean & Bud café menu
│   │   │       ├── Affiliate.js           # Wellness advocates
│   │   │       ├── ViralScore.js          # Viral tracking
│   │   │       ├── ViralCampaign.js       # Marketing campaigns
│   │   │       ├── Section21Document.js   # Medical cannabis prescriptions
│   │   │       ├── Branch.js              # Physical store locations
│   │   │       ├── TillSession.js         # POS shift management
│   │   │       ├── Sale.js                # Individual transactions
│   │   │       └── BranchInventory.js     # Multi-location stock
│   │   ├── user/
│   │   │   └── routes.js                  # User auth endpoints (login, register)
│   │   ├── payment/                       # Stripe integration
│   │   ├── cache/                         # Redis caching
│   │   ├── notification/                  # Email (nodemailer) & SMS (Twilio)
│   │   ├── queue/                         # Bull job queue
│   │   ├── pos/
│   │   │   └── service.js                 # POS integration & menu sync
│   │   ├── logger/                        # Winston logging
│   │   └── firecrawl-client.js            # Web scraping
│   ├── routes/
│   │   ├── affiliate.js                   # Affiliate API
│   │   ├── viral.js                       # Viral scoring
│   │   ├── menu.js                        # Coffee shop menu
│   │   ├── section21.js                   # Medical cannabis (auth-gated)
│   │   ├── order.js                       # Order processing
│   │   ├── dashboard.js                   # User dashboard data
│   │   ├── staff.js                       # Staff management
│   │   ├── leads.js                       # Lead tracking
│   │   ├── pos.js                         # POS endpoints
│   │   ├── products.js                    # Product catalog
│   │   ├── cart.js                        # Shopping cart
│   │   ├── vouchers.js                    # Discount codes
│   │   └── bug-reports.js                 # Bug tracking
│   └── tests/
│       └── auth.test.js                   # Jest authentication tests
│
├── frontend/                              # Client-side JavaScript modules
│
├── tests/
│   └── e2e/
│       ├── auth.spec.js                   # Basic auth tests
│       └── uat-complete.spec.js           # Full UAT test suite
│
├── css/                                   # Stylesheets (forest green theme)
├── images/                                # Product & menu images
├── uploads/                               # User-uploaded files (Section 21 docs)
│
├── *.html                                 # Frontend pages:
│   ├── index.html                         # Homepage / product catalog
│   ├── login.html                         # Login / register / password reset
│   ├── admin.html                         # Admin panel (multi-tab dashboard)
│   ├── dashboard.html                     # User/patient dashboard
│   ├── pos.html                           # Standalone POS (DEPRECATED - use admin POS tab)
│   ├── products.html                      # Product listing
│   ├── product.html                       # Single product view
│   ├── cart.html                          # Shopping cart
│   ├── comingsoon.html                    # Coming soon page
│   ├── uat-testing.html                   # UAT credentials & checklist
│   ├── bug-dashboard.html                 # Bug tracking dashboard
│   └── bug-kanban.html                    # Bug kanban board
│
├── package.json                           # Dependencies & scripts
├── playwright.config.js                   # Playwright E2E test config
├── .env                                   # Environment variables
├── .env.example                           # Environment template
│
├── create-uat-users.js                    # Script: Create UAT test users
├── seed-stock.js                          # Script: Seed inventory with 50 units
├── reset-admin-password.js                # Script: Reset admin password
│
├── CLAUDE.md                              # Project instructions for AI
├── README.md                              # General project readme
├── DEPLOYMENT-READY.md                    # Production deployment guide
├── UAT-DEPLOYMENT-CHECKLIST.md            # UAT testing checklist
├── UAT-TEST-RESULTS.md                    # Test results template
├── USER-STORIES-ANALYSIS.md               # User stories for all roles
├── REVISED-BUSINESS-MODEL.md              # Business model & requirements
└── COMPLETE-SYSTEM-DOCUMENTATION.md       # This file
```

---

## 🗄️ DATABASE SCHEMA (MongoDB: `bmh`)

### User Model
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique, lowercase),
  password: String (bcrypt hashed, select: false),
  role: String,                          // 'admin', 'staff_manager', 'staff_assistant', 'user'

  // Authentication
  emailVerified: Boolean (default: false),
  status: String,                        // 'active', 'suspended', 'banned'
  lastLogin: Date,
  loginAttempts: Number,
  lockUntil: Date,

  // Loyalty & Gamification
  wellnessPoints: Number (default: 0),   // NOT ldCoins!
  totalSpent: Number (default: 0),
  totalOrders: Number (default: 0),
  membershipTier: String,                // 'bronze', 'silver', 'gold'

  // Profile
  phone: String,
  avatar: String,
  isLifestyle: Boolean,                  // Lifestyle member flag

  // Section 21
  section21Approved: Boolean,
  section21Number: String,
  section21Expiry: Date,

  createdAt: Date,
  updatedAt: Date
}
```

### Product Model
```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,
  sku: String,                           // For barcode scanning
  category: String,                      // 'accessories', 'cbd-wellness', 'coffee', 'medical'

  // Pricing
  price: Number,
  costPrice: Number,                     // For profit calculations
  wholesalePrice: Number,                // B2B pricing

  // Inventory (CRITICAL STRUCTURE)
  inventory: {
    quantity: Number,                    // Use inventory.quantity, NOT product.quantity!
    lowStockThreshold: Number,
    trackQuantity: Boolean,
    allowBackorder: Boolean
  },

  // Details
  description: String,
  images: [String],                      // Array of image URLs

  // Medical Cannabis
  requiresSection21: Boolean,            // Medical products
  thcContent: Number,                    // THC percentage
  cbdContent: Number,                    // CBD percentage
  strain: String,                        // 'indica', 'sativa', 'hybrid'

  // Metadata
  status: String,                        // 'active', 'inactive', 'out_of_stock'
  featured: Boolean,
  tags: [String],

  createdAt: Date,
  updatedAt: Date
}
```

### Order Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  orderNumber: String,                   // Auto-generated (e.g., ORD-2024-001234)

  // Items
  items: [{
    productId: ObjectId,
    name: String,
    sku: String,
    quantity: Number,
    price: Number,
    subtotal: Number
  }],

  // Totals
  subtotal: Number,
  tax: Number,
  discount: Number,
  deliveryFee: Number,
  total: Number,

  // Payment
  paymentMethod: String,                 // 'cash', 'card', 'eft', 'credit'
  paymentStatus: String,                 // 'pending', 'paid', 'failed', 'refunded'
  paymentReference: String,

  // Delivery
  deliveryAddress: {
    street: String,
    suburb: String,
    city: String,
    province: String,
    postalCode: String,
    country: String
  },
  deliveryMethod: String,                // 'collection', 'delivery', 'courier'
  deliveryStatus: String,                // 'pending', 'processing', 'shipped', 'delivered'
  trackingNumber: String,

  // Status
  status: String,                        // 'pending', 'confirmed', 'completed', 'cancelled'
  notes: String,

  // Timestamps
  orderDate: Date,
  deliveredDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Section21Document Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId,

  // Documents
  prescriptionUrl: String,
  idDocumentUrl: String,
  proofOfAddressUrl: String,

  // Application
  status: String,                        // 'pending', 'under_review', 'approved', 'rejected', 'expired'
  submittedAt: Date,
  reviewedAt: Date,
  reviewedBy: ObjectId,

  // Approval
  section21Number: String,
  approvalDate: Date,
  expiryDate: Date,

  // Doctor
  doctorName: String,
  doctorPracticeNumber: String,
  doctorContact: String,

  // Rejection
  rejectionReason: String,

  // Appointment & Referral
  appointmentBooked: Boolean,
  appointmentDate: Date,
  referredTo: String,                    // External cannabis store URL
  referralCommission: Number,

  createdAt: Date,
  updatedAt: Date
}
```

### TillSession Model (NEW - NEEDED)
```javascript
{
  _id: ObjectId,
  staffId: ObjectId,
  branchId: ObjectId,

  // Shift times
  openTime: Date,
  closeTime: Date,

  // Cash
  openingFloat: Number,                  // Starting cash (e.g., R500)
  expectedCash: Number,                  // Opening + cash sales - refunds
  actualCash: Number,                    // What staff counted
  cashVariance: Number,                  // Difference

  // Sales summary
  totalCashSales: Number,
  totalCardSales: Number,
  totalSales: Number,
  transactionCount: Number,
  averageTransaction: Number,
  discountsGiven: Number,
  refundsGiven: Number,

  // Status
  status: String,                        // 'open', 'closed', 'pending_approval', 'approved'
  approvedBy: ObjectId,
  notes: String,

  createdAt: Date
}
```

---

## 🔐 AUTHENTICATION SYSTEM

### Login Flow
1. User submits email + password to `/api/v1/auth/login`
2. Backend checks user exists, password correct
3. Generates JWT token (7 day expiry)
4. Returns: `{ success: true, token, user: {...} }`
5. Frontend stores token:
   - **Admin panel**: `sessionStorage.setItem('adminToken', token)`
   - **User dashboard**: `localStorage.setItem('token', token)`
6. Redirects based on role:
   - `admin`, `staff_manager`, `staff_assistant` → `admin.html`
   - `user` → `dashboard.html`

### Protected Routes (Backend)
Use `authenticateToken` middleware from `backend/middleware/auth.js`:
```javascript
router.get('/protected', authenticateToken, async (req, res) => {
  // req.user contains decoded JWT (id, email, role)
  const userId = req.user.id;
  // ... your logic
});
```

### Role-Based Access
```javascript
// Admin only
router.post('/admin-only', authenticateToken, requireAdmin, async (req, res) => { ... });

// Specific role
router.get('/manager-only', authenticateToken, requireRole('staff_manager'), async (req, res) => { ... });

// Section 21 required
router.get('/medical-products', authenticateToken, requireSection21Verification, async (req, res) => { ... });
```

---

## 🎨 FRONTEND ARCHITECTURE

### admin.html Structure
**Multi-tab dashboard with sidebar navigation**:

**Tabs** (lines 763-771):
1. Inventory - Manage products & stock
2. POS - Point of Sale system (embedded)
3. Payments - Transaction history
4. Affiliates - Wellness advocates program
5. Vouchers - Discount codes
6. Orders - E-commerce orders
7. Users - Customer management
8. Staff - Employee management
9. Leads - Lead tracking

**Sidebar** (lines 668-715):
- Hamburger menu button (top-left)
- Slides in from left (-280px → 0px)
- Same 9 menu items as tabs
- Active tab highlighting
- Auto-closes on selection

**Role-Based Access** (CURRENTLY BROKEN):
- Lines 1405-1411: BUG - All users get elevated to admin
- NO role-based tab hiding implemented
- All 3 admin roles see everything (needs fixing)

**API URL Pattern** (lines 770-772):
```javascript
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api/v1'
    : `${window.location.protocol}//${window.location.host}/api/v1`;
```

### dashboard.html Structure
**User/Patient dashboard**:

**Key Sections**:
- Welcome banner with user name
- Stats cards (orders, spending, points)
- Order history table
- Wellness points display
- Section 21 status (if patient)

**JavaScript Functions**:
- `loadUserData()` - Fetch user profile (line ~1650)
- `updateStatsDisplay(stats)` - Update dashboard stats (line 1701)
- `updateUserInterface()` - Populate UI elements (line 1716)

**FIXED**: Line 1704 - Template literal syntax error fixed
**FIXED**: Lines 1703-1713 - Null safety checks added

### login.html Structure
**3 forms in one page**:
1. **Login form** (`#loginForm`) - Lines 695-711
2. **Register form** (`#registerForm`) - Lines 714-756
3. **Password reset form** - Lines 758-764

**Tab switching**: `switchTab('login' | 'register' | 'reset')`

**Login endpoint**: `/api/v1/auth/login` (line 803)

---

## 🛒 POS SYSTEM (Current State)

### Location
**Primary**: `admin.html` → POS tab (lines 829-931)
**Deprecated**: `pos.html` (standalone, use admin tab instead)

### Features Currently Working
✅ Product search by name
✅ Category filtering
✅ Add to cart
✅ Quantity adjustment
✅ Remove from cart
✅ Calculate total with tax
✅ Payment method selection (cash/card)
✅ Complete sale
✅ Generate invoice

### Features MISSING (Critical)
❌ Till open/close
❌ Cash reconciliation
❌ Barcode scanning
❌ Staff PIN login
❌ Shift reports
❌ Returns & refunds
❌ Customer loyalty lookup
❌ Split payments
❌ Manager approvals
❌ Stock receiving

### Inventory Data Structure (IMPORTANT)
```javascript
// WRONG (old code, causes errors):
const stock = product.quantity;

// CORRECT (current structure):
const stock = product.inventory?.quantity || 0;
```

**Key Files**:
- `admin.html` lines 829-931: POS UI
- `pos.html` lines 932-957: Inventory check logic
- `backend/routes/pos.js`: POS API endpoints
- `backend/modules/pos/service.js`: POS integration service

---

## 🧪 TESTING SETUP

### Playwright E2E Tests

**Config**: `playwright.config.js`
- Runs on `http://localhost:3001`
- Headed mode (see browser)
- Screenshots on failure
- Videos on failure
- 1 worker (serial execution)

**Test Files**:
1. `tests/e2e/auth.spec.js` - Basic authentication tests
2. `tests/e2e/uat-complete.spec.js` - Full UAT test suite (11 tests)

**UAT Test Users** (from `create-uat-users.js`):
```javascript
{
  admin: 'admin@basothomedicalherbs.ls' / 'Admin123!',
  manager: 'manager@basothomedicalherbs.ls' / 'Manager123!',
  assistant: 'assistant@basothomedicalherbs.ls' / 'Assistant123!',
  user: 'user@basothomedicalherbs.ls' / 'User123!',
  patient: 'patient@basothomedicalherbs.ls' / 'Patient123!'
}
```

**Run Tests**:
```bash
npm test                    # Run Jest backend tests
npm run test:e2e           # Run all Playwright tests
npm run test:e2e:headed    # Run with visible browser
npm run test:e2e:debug     # Run in debug mode
```

**Test Results** (as of 2025-11-05):
- ✅ 8/11 passing
- ❌ 3/11 failing (wrong element IDs in tests, not app bugs)

---

## 📡 API ENDPOINTS

### Authentication (`/api/v1/auth/`)
```
POST /auth/register       - Create new user
POST /auth/login          - Login (returns JWT token)
POST /auth/forgot-password - Request password reset
POST /auth/reset-password - Reset password with token
```

### Users (`/api/v1/users/`)
```
GET  /users/profile       - Get current user (auth required)
```

### Products (`/api/v1/products/`)
```
GET  /products            - List all public products (no Section 21)
GET  /products/medical    - List medical products (Section 21 required)
GET  /products/:id        - Get single product
POST /products            - Create product (admin only)
PUT  /products/:id        - Update product (admin only)
DELETE /products/:id      - Delete product (admin only)
```

### Orders (`/api/v1/orders/`)
```
GET  /orders              - List user's orders (auth required)
GET  /orders/:id          - Get single order
POST /orders              - Create order
PUT  /orders/:id/status   - Update order status (admin)
```

### POS (`/api/v1/pos/`)
```
POST /pos/sale            - Complete sale transaction
GET  /pos/sales           - List sales for current till
GET  /pos/inventory       - Check stock levels
```

### Section 21 (`/api/v1/section21/`)
```
POST /section21/apply     - Submit Section 21 application
GET  /section21/status    - Check application status
GET  /section21/documents - List user's documents (admin)
PUT  /section21/:id/approve - Approve application (admin)
PUT  /section21/:id/reject  - Reject application (admin)
```

### Staff (`/api/v1/staff/`)
```
GET  /staff               - List all staff (admin)
POST /staff               - Create staff member (admin)
PUT  /staff/:id           - Update staff
PUT  /staff/:id/deactivate - Deactivate staff ("FIRED!!" button)
```

### Affiliates (`/api/v1/affiliate/`)
```
GET  /affiliate           - List affiliates
POST /affiliate/apply     - Submit affiliate application
GET  /affiliate/stats     - Get affiliate performance
```

---

## 🎯 ENVIRONMENT VARIABLES (.env)

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/bmh

# JWT
JWT_SECRET=bmh_secret_key_change_in_production

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=hello@basothomedicalherbs.ls

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+27123456789

# Payment (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# File Upload
MAX_FILE_SIZE=10485760    # 10MB in bytes
UPLOAD_PATH=./uploads
```

---

## 🚀 DEPLOYMENT COMMANDS

### Local Development
```bash
npm install              # Install dependencies
npm run dev             # Start with nodemon (auto-restart)
npm start               # Start production mode
```

### Database Setup
```bash
node create-uat-users.js      # Create UAT test users
node seed-stock.js            # Seed products with 50 units inventory
node reset-admin-password.js  # Reset admin password to Admin123!
```

### Production Deployment
```bash
# 1. Create deployment package
tar -czf cbd-deploy-$(date +%Y%m%d-%H%M).tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    backend/ frontend/ css/ images/ *.html package.json

# 2. Upload to server
scp cbd-deploy-*.tar.gz user@portal.basothomedicalherbs.ls:/var/www/bmh/

# 3. On server
cd /var/www/bmh
tar -xzf cbd-deploy-*.tar.gz
npm install --production
node create-uat-users.js
pm2 restart bmh

# 4. Verify
curl http://localhost:3001/api/v1/health
pm2 logs bmh --lines 50
```

---

## 🐛 COMMON ISSUES & FIXES

### Issue 1: Assistant Login Stays on login.html
**Cause**: Login succeeded but page didn't redirect
**Fix**: Check browser console, usually timing issue
**Workaround**: Wait 3 seconds, if no redirect check network tab

### Issue 2: Dashboard JavaScript Error
**Error**: `Cannot set properties of null (setting 'textContent')`
**Cause**: Elements don't exist in HTML
**Fix**: Lines 1703-1713 added null checks (FIXED)

### Issue 3: Inventory Shows 0 Stock
**Cause**: Using `product.quantity` instead of `product.inventory.quantity`
**Fix**: Always use `product.inventory?.quantity || 0`

### Issue 4: Orders Not Loading in Admin Panel
**Cause**: Using wrong token from localStorage
**Fix**: Use `sessionStorage.getItem('adminToken')` not `localStorage.getItem('token')`

### Issue 5: Missing Icons
**Error**: Lucide icons 'camouflage', 'pills' not found
**Cause**: Icon names don't exist in Lucide library
**Fix**: Use valid icon names or remove

---

## 📋 PRIORITY FEATURE ROADMAP

### PHASE 1: POS System (CURRENT - Week 1)
1. Till open/close with PIN
2. Cash reconciliation
3. Barcode scanning support
4. Returns & refunds
5. Shift reports

### PHASE 2: Section 21 Workflow (Week 2)
1. Admin review queue
2. Approve/reject with reasons
3. Appointment booking
4. External store redirect
5. Referral commission tracking

### PHASE 3: B2B Wholesale (Week 3)
1. B2B customer portal
2. Wholesale pricing
3. Credit terms (30/60 days)
4. Bulk ordering
5. B2B invoicing

### PHASE 4: Reporting (Week 4)
1. Sales reports (daily, weekly, monthly)
2. Inventory reports
3. Staff performance metrics
4. Customer analytics
5. Profit & loss

---

## 🔗 KEY REFERENCES

**Production URLs**:
- Main Site: https://portal.basothomedicalherbs.ls
- Admin: https://portal.basothomedicalherbs.ls/admin
- UAT Guide: https://portal.basothomedicalherbs.ls/uat-testing.html
- API Health: https://portal.basothomedicalherbs.ls/api/v1/health

**Documentation**:
- User Stories: `USER-STORIES-ANALYSIS.md`
- Business Model: `REVISED-BUSINESS-MODEL.md`
- Deployment: `DEPLOYMENT-READY.md`
- UAT Checklist: `UAT-DEPLOYMENT-CHECKLIST.md`

**MongoDB**:
- Database: `bmh`
- Connection: `mongodb://localhost:27017/bmh`

**GitHub** (if applicable):
- Repository: [Add URL]
- Branch: main
- CI/CD: [Add if configured]

---

## 💡 FOR NEXT DEVELOPER

**Things to Know**:
1. **Brand Colors**: Forest green theme (`#2D5016`, `#4A7C59`, `#6B9080`)
2. **NO EMOJIS** in code unless explicitly requested
3. **Port 3001** (NOT 3000 - that's Loose Draw project)
4. **Database**: `bmh` (separate from `loosedraw`)
5. **Auth Storage**:
   - Admin: sessionStorage
   - Users: localStorage
6. **Inventory Field**: ALWAYS use `product.inventory.quantity`
7. **Staff Role**: "Assistant" NOT "Cashier"
8. **Button Text**: Staff deactivate button says "FIRED!!"

**Quick Start**:
```bash
git clone [repo]
cd BMH
npm install
cp .env.example .env    # Edit with your values
node create-uat-users.js
npm run dev
# Open http://localhost:3001/login.html
# Login: admin@basothomedicalherbs.ls / Admin123!
```

**Test Everything**:
```bash
npm run test:e2e:headed
# Watch tests run in browser
# 8/11 should pass
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Maintained By**: AI Assistant (Claude)
**Contact**: hello@basothomedicalherbs.ls
