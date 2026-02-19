# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CBD Wellness 24** - Cannabis Wellness & Accessories E-commerce Platform

### Brand Identity
- **Name**: CBD Wellness 24
- **Tagline**: "Natural Relief, Available Anytime"
- **Sub-brands**: La Brewha café | Bean & Bud
- **Focus**: Cannabis accessories, CBD wellness products, and Section 21 medical cannabis

### Brand Colors
```css
--cbd-forest-green: #2D5016;      /* Primary */
--cbd-sage-green: #4A7C59;        /* Accent */
--cbd-mint: #6B9080;              /* Light accent */
--cbd-cream: #F4F1DE;             /* Backgrounds */
--cbd-earth: #8B7355;             /* Secondary text */
--cbd-charcoal: #2F2F2F;          /* Body text */
--cbd-gold: #C9A961;              /* Premium accents */
```

## Commands

### Development
- `npm run dev` - Start development server with nodemon (auto-restart on changes)
- `npm start` - Start production server (Port 3001)

### Testing
- `npm test` - Run all tests with Jest (uses --runInBand to run serially)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:integration` - Run integration tests only

### Code Quality
- `npm run lint` - Run ESLint on backend/ directory

### Database
- `npm run setup` - Set up database (cbdwellness24)
- `npm run seed` - Seed database with cannabis/wellness products

## Architecture

### Tech Stack
- **Backend**: Node.js with Express.js
- **Database**: MongoDB (`cbdwellness24`) with Mongoose ODM
- **Authentication**: JWT with bcryptjs
- **Testing**: Jest with Supertest
- **Payment**: Stripe integration
- **Caching**: Redis
- **Queue**: Bull with Redis backend
- **Security**: Helmet, CORS, express-mongo-sanitize, express-rate-limit

### Project Structure
```
CBD_Wellness_24/
├── backend/
│   ├── server.js                 - Main entry point (Port 3001)
│   ├── modules/
│   │   ├── auth/                 - JWT authentication & middleware
│   │   ├── database/
│   │   │   ├── index.js          - MongoDB connection handler
│   │   │   └── models/           - Mongoose models
│   │   │       ├── User.js       - User accounts, wellness points, tiers
│   │   │       ├── Product.js    - Cannabis accessories & CBD products
│   │   │       ├── MenuItem.js   - Coffee shop menu (La Brewha/Bean & Bud)
│   │   │       ├── Order.js      - E-commerce transactions
│   │   │       ├── Affiliate.js  - Wellness advocate program
│   │   │       ├── ViralScore.js - Product viral metrics
│   │   │       ├── ViralCampaign.js - Marketing campaigns
│   │   │       └── Section21Document.js - Medical cannabis prescriptions
│   │   ├── payment/              - Stripe integration
│   │   ├── cache/                - Redis caching layer
│   │   ├── notification/         - Email (nodemailer) & SMS (Twilio)
│   │   ├── queue/                - Bull job queue with Redis
│   │   ├── pos/
│   │   │   └── service.js        - POS integration & menu sync
│   │   ├── logger/               - Winston logging
│   │   └── firecrawl-client.js   - Web scraping for influencer verification
│   ├── routes/
│   │   ├── affiliate.js          - Affiliate system API
│   │   ├── viral.js              - Viral scoring & campaigns
│   │   ├── menu.js               - Coffee shop menu API
│   │   ├── section21.js          - Medical cannabis (auth-gated)
│   │   ├── order.js              - Order processing
│   │   └── dashboard.js          - User dashboard data
│   └── tests/
│       └── auth.test.js          - Jest tests (run with --runInBand)
├── frontend/                     - Client-side JavaScript modules
├── css/                          - Stylesheets (forest green theme)
├── images/                       - Product & menu images
├── uploads/                      - User-uploaded files (prescriptions, etc.)
├── *.html                        - Frontend pages (index, login, dashboard, etc.)
└── .env                          - Environment config (see .env.example)
```

### Key Features
- Cannabis accessories catalog
- CBD wellness products
- Section 21 medical cannabis (auth-gated)
- Affiliate system (15% commission for wellness advocates)
- Gamification (Wellness Points instead of LD Coins)
- Viral scoring engine
- Bean & Bud coffee integration
- La Brewha café products

### Product Categories
1. **Cannabis Accessories**
   - Grinders, papers, vaporizers, storage, pipes
2. **CBD Wellness**
   - Oils, edibles, topicals, beverages
3. **Bean & Bud**
   - CBD coffee, specialty blends, brewing accessories
4. **Section 21** (Medical Cannabis - Login Required)
   - Prescription products, medical-grade cannabis

### API Structure
The backend uses modular routing:
- All routes mounted at `/api/v1/` prefix
- Authentication middleware (`authenticateToken`) protects sensitive endpoints
- Routes are organized by feature domain (affiliate, viral, menu, section21, etc.)
- Health check available at `/api/v1/health`

### Database Models
- **User**: Authentication (bcrypt), JWT tokens, wellness points, membership tiers
- **Product**: Cannabis accessories & CBD products with categories
- **MenuItem**: Coffee shop menu with POS integration (posId, venue, cbdInfused flags)
- **Order**: E-commerce transactions with payment tracking
- **Affiliate**: Wellness advocate program with commission tracking
- **ViralScore**: Product viral metrics and engagement tracking
- **ViralCampaign**: Marketing campaigns with influencer verification
- **Section21Document**: Medical cannabis prescriptions and compliance docs

### POS Integration
- `POSService` class in `backend/modules/pos/service.js` handles menu synchronization
- Syncs menu items from external POS systems every 5 minutes
- Maps POS categories to internal categories
- Updates inventory and availability in real-time
- Supports both La Brewha café and Bean & Bud venues

### Environment Configuration
Key variables (see `.env` file):
- `MONGODB_URI` - MongoDB connection string (default: `mongodb://localhost:27017/cbdwellness24`)
- `PORT` - Server port (default: 3001)
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment mode (development/production)
- SMTP and payment gateway credentials as needed

## Important Notes
- **Port**: Runs on 3001 (standalone, independent from Loose Draw on 3000)
- **Database**: `cbdwellness24` (separate from loosedraw)
- **Branding**: Black and white theme for dashboards, forest green theme for public pages - NO EMOJIS in code/UI unless explicitly requested
- **Legal**: Section 21 compliance for medical cannabis (auth-gated, prescription verification)
- **Mobile**: 100% responsive design
- **Static Files**: Frontend served from root directory, backend serves via Express static middleware
- **Authentication**: Admin panel uses `sessionStorage.getItem('adminToken')`, NOT localStorage
- **UI/UX**: Toast notifications for all user feedback, NO browser alerts/prompts
- **Inventory**: Product model uses `product.inventory.quantity`, NOT `product.quantity`
- **POS System**: Embedded in admin dashboard (admin.html), NOT separate page
- **Staff Roles**: "Assistant" terminology, NOT "Cashier"

## Recent Features Added

### Admin Panel Enhancements (November 2024)

1. **Collapsible Sidebar Navigation**
   - Hamburger menu button in top-left of admin nav (admin.html:720)
   - Left sidebar drawer slides in from left (-280px to 0px)
   - Smooth cubic-bezier animation matching cart drawer
   - Overlay backdrop when sidebar is open
   - Menu items: Inventory, POS, Payments, Affiliates, Vouchers, Orders, Users, Staff, Leads
   - Active tab highlighting in sidebar
   - Auto-closes sidebar when navigating to tab
   - Font Awesome icons for menu items (admin.html:7)

2. **Cart Drawer on Dashboard**
   - Right-sliding drawer (450px width) for shopping cart
   - Implemented on dashboard.html matching index.html cart pattern
   - Black and white color scheme (NOT CBD green)
   - localStorage integration for cart persistence
   - Cart badge showing item count
   - Smooth animations and toast-style notifications

3. **Toast Notification System**
   - Replaced ALL browser alerts with professional toast notifications
   - Implementation in pos.html (lines 610-662, 775-800)
   - Auto-dismiss after 5 seconds
   - Types: success (green), error (red), info (blue)
   - Slide-in animation from right
   - Used for: out of stock, payment status, cart actions, sale completion

4. **Fixed Authentication Issues**
   - Orders loading now uses `sessionStorage.getItem('adminToken')` (admin.html:1433)
   - Previously used `localStorage.getItem('token')` causing 401 errors
   - Consistent auth pattern across admin panel

5. **Inventory Management Fixes**
   - POS system now checks `product.inventory.quantity` (pos.html:932-957)
   - Previously checked wrong field `product.quantity`
   - Added stock validation before adding to cart
   - Toast notification for out-of-stock items

6. **Staff Role Terminology**
   - Changed "Cashier" to "Assistant" throughout admin panel (admin.html:763)
   - Reflects correct business terminology

### Utility Scripts

1. **seed-stock.js**
   - Seeds all products with 50 units inventory
   - Sets `inventory.lowStockThreshold` to 10
   - Sets `inventory.trackQuantity` to true
   - Sets `inventory.allowBackorder` to false
   - Activates all products (status: 'active')
   - Usage: `node seed-stock.js`

2. **reset-admin-password.js**
   - Resets admin password to `Admin123!`
   - Uses bcrypt with 10 rounds
   - Updates user with email `admin@cbdwellness24.co.za`
   - Usage: `node reset-admin-password.js`

### Key Technical Patterns

1. **Sidebar Toggle Pattern**
   ```javascript
   function toggleSidebar() {
       const sidebar = document.getElementById('sidebarDrawer');
       const overlay = document.getElementById('sidebarOverlay');
       sidebar.classList.toggle('active');
       overlay.classList.toggle('active');
   }
   ```

2. **Toast Notification Pattern**
   ```javascript
   function showToast(title, message, type = 'info') {
       // Creates toast element with auto-dismiss
       // Types: success, error, info
       // Auto-removes after 5 seconds
   }
   ```

3. **Environment-Aware API URL**
   ```javascript
   const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
       ? 'http://localhost:3001/api/v1'
       : `${window.location.protocol}//${window.location.host}/api/v1`;
   ```

4. **Inventory Check Pattern**
   ```javascript
   const stock = product.inventory?.quantity || product.quantity || 0;
   if (stock <= 0) {
       showToast('Out of Stock', `${product.name} is currently out of stock`, 'error');
       return;
   }
   ```

## Deployment Checklist

### CRITICAL: Before ANY Deployment
**ALWAYS run this checklist BEFORE deploying to production:**

1. **API URL Configuration**
   - Search ALL HTML files for hardcoded `localhost:3001` or `127.0.0.1:3001`
   - Replace with environment-aware detection pattern:
   ```javascript
   const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
       ? 'http://localhost:3001/api/v1'
       : `${window.location.protocol}//${window.location.host}/api/v1`;
   ```
   - Files that typically need this: `login.html`, `admin.html`, `dashboard.html`, `cart.html`, `products.html`, `product.html`, `pos.html`, `comingsoon.html`

2. **Responsive Design Verification**
   - Test ALL pages at breakpoints: 1920px, 1440px, 1100px, 768px, 480px, 360px
   - Check navigation menus don't overflow or wrap awkwardly
   - Verify buttons remain properly sized and spaced
   - Ensure forms are usable on mobile devices

3. **Environment Variables**
   - Verify `.env.production` has correct values for production
   - Never commit API keys or secrets to git
   - Confirm `NODE_ENV=production` is set

4. **Database Seeding**
   - Confirm all seed scripts have been run on production database
   - Verify test users exist with correct roles
   - Check menu items are populated

5. **CORS Configuration**
   - Ensure production domain is in CORS allowedOrigins
   - Verify both HTTP and HTTPS variants if needed

6. **Database Export Cleanup (macOS → Ubuntu/Linux)**
   - ALWAYS remove macOS metadata files before creating database exports
   - Run: `find db-exports -name "._*" -delete` before creating tarball
   - macOS creates ._ files that break mongorestore on Linux servers
   - NEVER include .DS_Store, ._* or other macOS artifacts in production packages

### Common Deployment Mistakes to AVOID
- ❌ Hardcoding localhost API URLs in HTML files
- ❌ Deploying without testing responsive breakpoints
- ❌ Forgetting to seed production database
- ❌ Not updating CORS origins for production domain
- ❌ Skipping verification of authentication flows on production
- ❌ **Including macOS metadata files (._*) in database exports for Linux servers**

## Development Workflow

### Adding New Features
1. Create model in `backend/modules/database/models/` if new data structure needed
2. Create route file in `backend/routes/` for API endpoints
3. Import and mount route in `backend/server.js` at `/api/v1/` prefix
4. Add frontend HTML page in root directory if needed
5. Add client-side logic in `frontend/` directory
6. **IMPORTANT**: Use environment-aware API_URL pattern from the start

### Authentication Pattern
```javascript
// Protect routes with authenticateToken middleware (defined in server.js)
router.get('/protected-endpoint', authenticateToken, async (req, res) => {
  // req.user contains decoded JWT payload
  const userId = req.user.id;
  // ... your logic
});
```

### Testing
- Tests located in `backend/tests/`
- Run with `npm test` (uses Jest with --runInBand for serial execution)
- Use Supertest for API endpoint testing
- MongoDB connection required for integration tests

## Deployment to Production Server

### Production Deployment Process Map (CANONICAL REFERENCE)

This is the DEFINITIVE deployment process for CBD Wellness 24. This workflow was battle-tested on November 7, 2025 and must be followed exactly for all future deployments.

---

## 🎯 GLOBAL DEPLOYMENT WORKFLOW

### Prerequisites
- SSH access to production server (root@154.66.197.104)
- SCP access to transfer files
- PM2 already installed and managing cbd-wellness-24 app
- Nginx already configured with SSL certificate
- MongoDB running on production server

### Server Environment
```
Server IP: 154.66.197.104
App Directory: /var/www/cbd-wellness-24
PM2 App Name: cbd-wellness-24
Port: 3001
CRITICAL: ALWAYS USE IP ADDRESS 154.66.197.104 FOR ALL DEPLOYMENTS
         NEVER use 154.66.197.104 or any other hostname
```

---

## 📋 DEPLOYMENT PROCESS TABLE

| Step | Location | Command | Purpose | Critical Notes |
|------|----------|---------|---------|----------------|
| **1. PRE-DEPLOYMENT AUDIT** |
| 1.1 | Local | `grep -r "localhost:3001" *.html` | Find hardcoded URLs | MUST return 0 results |
| 1.2 | Local | Check all HTML files use environment-aware API_URL pattern | Verify production compatibility | Pattern in line 247-251 |
| 1.3 | Local | `npm test` | Run all tests | MUST pass 100% |
| 1.4 | Local | Check .deployignore excludes dev files | Verify exclusions | No node_modules, .git, *.md |
| **2. CREATE DEPLOYMENT PACKAGE** |
| 2.1 | Local | Use `/tmp/create-deploy.sh` script | Create timestamped tarball | Script created Nov 7, 2025 |
| 2.2 | Local | `tar -tzf <tarball> \| wc -l` | Verify file count | Should be ~300+ files |
| 2.3 | Local | `tar -tzf <tarball> \| grep "backend/routes/"` | Verify all routes included | Must show all 16 routes |
| **3. SERVER STATE VERIFICATION** |
| 3.1 | Server | `pm2 list` | Check current PM2 apps | Verify cbd-wellness-24 running |
| 3.2 | Server | `ls -la /etc/nginx/sites-enabled/` | Check nginx configs | Verify 154.66.197.104 exists |
| 3.3 | Server | `cat /var/www/cbd-wellness-24/.env \| grep NODE_ENV` | Verify production env | Must show NODE_ENV=production |
| 3.4 | Server | `pm2 info cbd-wellness-24` | Get current app stats | Note restart count, uptime |
| 3.5 | Server | `ls -la /var/www/cbd-wellness-24/backups/` | Check backup directory | Create if missing |
| **4. UPLOAD DEPLOYMENT FILES** |
| 4.1 | Local | `scp <tarball> root@154.66.197.104:~/` | Upload deployment package | ~40MB file |
| 4.2 | Local | `scp /tmp/safe-update-cbd.sh root@154.66.197.104:~/` | Upload deployment script | Safety wrapper script |
| 4.3 | Server | `ls -lh ~/*.tar.gz` | Verify upload successful | Confirm file size matches |
| **5. EXECUTE DEPLOYMENT** |
| 5.1 | Server | `chmod +x ~/safe-update-cbd.sh` | Make script executable | One-time permission |
| 5.2 | Server | `~/safe-update-cbd.sh` | Run deployment | Automated 6-step process |
| **6. POST-DEPLOYMENT VERIFICATION** |
| 6.1 | Server | `pm2 status cbd-wellness-24` | Verify app online | Status must be "online" |
| 6.2 | Server | `pm2 logs cbd-wellness-24 --lines 50` | Check for errors | Look for "Server running" |
| 6.3 | Server | `curl http://localhost:3001/api/v1/health` | Test API locally | Must return HTTP 200 |
| 6.4 | Browser | Visit https://154.66.197.104 | Test homepage | Should load instantly |
| 6.5 | Browser | Test login with admin@cbdwellness24.co.za | Verify authentication | Must login successfully |
| 6.6 | Browser | Check admin panel tabs (Inventory, POS, etc.) | Verify RBAC working | Admin sees all tabs |
| 6.7 | Browser | Test POS functionality | Place test order | Verify cart, checkout work |
| **7. ROLLBACK (IF NEEDED)** |
| 7.1 | Server | `cd /var/www/cbd-wellness-24` | Navigate to app dir | Required for rollback |
| 7.2 | Server | `ls -lt backups/ \| head -2` | Find latest backup | Timestamped format |
| 7.3 | Server | `tar -xzf backups/backup-<timestamp>.tar.gz` | Extract backup | Overwrites current files |
| 7.4 | Server | `pm2 restart cbd-wellness-24` | Restart with old code | Reverts deployment |
| 7.5 | Server | `curl http://localhost:3001/api/v1/health` | Verify rollback | Must return HTTP 200 |

---

## 🔒 CRITICAL SAFETY RULES

1. **NEVER touch nginx during deployment** - It's already configured with SSL and reverse proxy
2. **NEVER restart other PM2 apps** - Use `pm2 restart cbd-wellness-24` ONLY
3. **ALWAYS create backup before extracting** - Automated in safe-update-cbd.sh
4. **ALWAYS verify .env file exists** - Deployment preserves existing .env
5. **ALWAYS test API health endpoint** - Before declaring deployment successful
6. **NEVER deploy .md files** - Excluded via .deployignore
7. **NEVER deploy node_modules** - Always run `npm install --production` on server

---

## 📂 DEPLOYMENT ARTIFACTS

### Scripts (in /tmp/ on local machine)
1. **create-deploy.sh** - Creates tarball with explicit file list
2. **safe-update-cbd.sh** - Deployment automation script (runs on server)

### Generated Files
1. **cbd-wellness-deploy-YYYYMMDD-HHMM.tar.gz** - Deployment package (~40MB)
2. **backups/backup-YYYYMMDD-HHMMSS.tar.gz** - Automatic backup on server

### Server Locations
```
/var/www/cbd-wellness-24/          # Application root
/var/www/cbd-wellness-24/backups/  # Timestamped backups
/var/www/cbd-wellness-24/logs/     # PM2 logs (error-8.log, out-8.log)
/etc/nginx/sites-available/154.66.197.104  # Nginx config
/etc/letsencrypt/live/154.66.197.104/      # SSL certificates
```

---

## 🚨 DEPLOYMENT FAILURE SCENARIOS

| Issue | Symptom | Solution | Prevention |
|-------|---------|----------|------------|
| API not responding | HTTP 500/404 on /api/v1/health | Check PM2 logs: `pm2 logs cbd-wellness-24` | Test locally first |
| PM2 won't restart | "Error: Process not found" | `pm2 delete cbd-wellness-24 && pm2 start backend/server.js --name cbd-wellness-24` | Verify app name |
| MongoDB connection failed | "MongooseServerSelectionError" | Check .env has correct MONGODB_URI | Never overwrite .env |
| 401 errors on admin panel | "Unauthorized" in browser console | Verify JWT_SECRET in .env matches | Document secret in secure location |
| Missing routes | 404 on /api/v1/products | Verify all routes in tarball: `tar -tzf <tarball> \| grep routes` | Check create-deploy.sh includes backend/ |
| Nginx errors | 502 Bad Gateway | Check nginx: `sudo nginx -t && sudo systemctl status nginx` | Never modify nginx during deploy |
| Other apps affected | Different PM2 app stopped | Restart affected app: `pm2 restart <app-name>` | Only restart cbd-wellness-24 |

---

## ✅ POST-DEPLOYMENT CHECKLIST

After deployment completes, verify:
- [ ] PM2 shows cbd-wellness-24 as "online" with 0 restarts
- [ ] API health endpoint returns `{"status":"ok"}`
- [ ] Homepage loads at https://154.66.197.104
- [ ] Login works with admin@cbdwellness24.co.za
- [ ] Admin panel shows all 9 tabs (for admin role)
- [ ] POS can load products and create orders
- [ ] Bug dashboard and UAT testing pages accessible
- [ ] No errors in PM2 logs: `pm2 logs cbd-wellness-24 --lines 100 --nostream`
- [ ] Other PM2 apps still online (openpharms, stoep-uat)
- [ ] Backup created in /var/www/cbd-wellness-24/backups/

---

### Smooth Deployment Workflow (Tested and Verified)

This deployment process was successfully executed and works smoothly. Follow these exact steps for zero-downtime deployments.

#### Step 1: Prepare Files for Deployment

1. **Create Deployment Package**
   ```bash
   # Navigate to project directory
   cd /Users/florisolivier/CBD_Wellness_24

   # Create tarball with timestamp
   tar -czf cbd-wellness-deploy-$(date +%Y%m%d-%H%M).tar.gz \
       --exclude='node_modules' \
       --exclude='.git' \
       --exclude='*.md' \
       --exclude='.env.local' \
       --exclude='uploads/*' \
       backend/ \
       css/ \
       frontend/ \
       images/ \
       *.html \
       package.json \
       package-lock.json
   ```

2. **Verify Package Contents**
   ```bash
   tar -tzf cbd-wellness-deploy-*.tar.gz | head -20
   ```

#### Step 2: Upload to Server

1. **Transfer Package via SCP**
   ```bash
   scp cbd-wellness-deploy-20241104-1530.tar.gz username@154.66.197.104:/var/www/cbd-wellness-24/
   ```

2. **SSH into Server**
   ```bash
   ssh username@154.66.197.104
   ```

#### Step 3: Deploy on Server

1. **Navigate to Application Directory**
   ```bash
   cd /var/www/cbd-wellness-24
   ```

2. **Backup Current Deployment**
   ```bash
   # Create backup directory with timestamp
   mkdir -p backups
   tar -czf backups/backup-$(date +%Y%m%d-%H%M).tar.gz \
       backend/ css/ frontend/ images/ *.html
   ```

3. **Extract New Files**
   ```bash
   # Extract tarball (overwrites existing files)
   tar -xzf cbd-wellness-deploy-20241104-1530.tar.gz
   ```

4. **Install/Update Dependencies**
   ```bash
   npm install --production
   ```

5. **Verify Environment Configuration**
   ```bash
   # Check .env file has production values
   cat .env | grep NODE_ENV
   # Should show: NODE_ENV=production
   ```

6. **Restart Application**
   ```bash
   # Using PM2 (recommended)
   pm2 restart cbd-wellness-24

   # OR using systemd
   sudo systemctl restart cbd-wellness-24

   # OR manual restart
   pkill -f "node backend/server" && npm start &
   ```

7. **Verify Deployment**
   ```bash
   # Check server is running
   pm2 status cbd-wellness-24

   # Check logs for errors
   pm2 logs cbd-wellness-24 --lines 50

   # Test API endpoint
   curl http://localhost:3001/api/v1/health
   ```

#### Step 4: Post-Deployment Verification

1. **Browser Tests**
   - Visit `https://154.66.197.104`
   - Test login flow with admin credentials
   - Verify admin panel loads correctly
   - Test POS system functionality
   - Check orders loading properly
   - Verify responsive design on mobile

2. **Database Verification**
   ```bash
   # Connect to MongoDB
   mongosh cbdwellness24

   # Check collections
   show collections

   # Verify product inventory
   db.products.count()

   # Verify users exist
   db.users.find({role: 'admin'}).count()
   ```

3. **Monitoring**
   ```bash
   # Watch server logs in real-time
   pm2 logs cbd-wellness-24

   # Check memory/CPU usage
   pm2 monit
   ```

#### Rollback Procedure (If Issues Occur)

```bash
# Stop current application
pm2 stop cbd-wellness-24

# Restore from backup
cd /var/www/cbd-wellness-24
tar -xzf backups/backup-20241104-1500.tar.gz

# Restart application
pm2 restart cbd-wellness-24

# Verify rollback
curl http://localhost:3001/api/v1/health
```

### Deployment Checklist

Before deploying, verify:
- [ ] All API URLs use environment-aware detection (not hardcoded localhost)
- [ ] Font Awesome CDN links added to all HTML files using icons
- [ ] sessionStorage used for admin authentication (not localStorage)
- [ ] Orders endpoint uses correct token from sessionStorage
- [ ] Toast notifications replace all browser alerts
- [ ] Inventory checks use `product.inventory.quantity` (not `product.quantity`)
- [ ] Staff roles show "Assistant" (not "Cashier")
- [ ] Collapsible sidebar added to admin panel
- [ ] All responsive breakpoints tested
- [ ] Production .env file has correct values
- [ ] MongoDB has seeded inventory (run seed-stock.js if needed)

### Key Files Modified in Recent Deployment

1. **admin.html** (lines 1433, 763, 1836-1857)
   - Fixed orders authentication (sessionStorage.getItem('adminToken'))
   - Changed "Cashier" to "Assistant"
   - Added collapsible sidebar navigation
   - Added hamburger menu button
   - Added Font Awesome CDN

2. **dashboard.html** (lines 16-47, 800-917, 2720-2810)
   - Added cart drawer (slides from right)
   - Black and white color scheme
   - Toast notifications

3. **pos.html** (lines 610-662, 775-800, 932-957)
   - Toast notification system
   - Fixed inventory check (inventory.quantity)
   - Replaced all browser alerts

4. **seed-stock.js** (new file)
   - Seeds all products with 50 units inventory
   - Sets lowStockThreshold to 10
   - Activates all products

5. **reset-admin-password.js** (new file)
   - Resets admin password to Admin123!
   - Uses bcrypt hashing with 10 rounds

### Production URLs

- **Main Site**: https://154.66.197.104
- **Admin Panel**: https://154.66.197.104/admin
- **Dashboard**: https://154.66.197.104/dashboard
- **API**: https://154.66.197.104/api/v1
- **Health Check**: https://154.66.197.104/api/v1/health

### Important Notes

- **DO NOT** deploy .md files to production (CLAUDE.md, README.md, etc.)
- **DO NOT** deploy node_modules (install fresh on server)
- **DO NOT** deploy .env.local or development config
- **DO NOT** deploy uploads/ directory (user data stays on server)
- **ALWAYS** backup before deploying
- **ALWAYS** verify deployment with browser tests
- **ALWAYS** check PM2 logs after deployment

## Contact
- **Email**: hello@cbdwellness24.co.za
- No assumptions will ever be made by you in this fucking project.
- NO .md files should EVER be deployed to production servers!