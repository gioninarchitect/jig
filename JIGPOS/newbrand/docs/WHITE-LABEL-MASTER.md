# DBC White-Label System - Master Document

## Overview

This document contains everything needed to deploy the DBC Cannabis Retail Management System for new white-label clients. Includes rebranding instructions, Claude Code prompts, pricing proposals, and technical setup guides.

---

# PART 1: REBRANDING CLAUDE PROMPT

Copy this entire section into a new Claude Code instance to rebrand the system:

```
## WHITE-LABEL REBRANDING TASK

You are rebranding the De Bud Chef (DBC) Cannabis Retail Management System for a new client. This is a complete white-label deployment.

### CLIENT INFORMATION (FILL IN)
- **Business Name**: [CLIENT_NAME]
- **Short Name/Code**: [CLIENT_CODE] (3-4 letters, e.g., "GRN" for Green Leaf)
- **Domain**: [CLIENT_DOMAIN]
- **Tagline**: [CLIENT_TAGLINE]
- **Primary Color**: [HEX_COLOR] (e.g., #2D5A3D)
- **Secondary Color**: [HEX_COLOR]
- **Accent/Gold Color**: [HEX_COLOR]
- **Logo File**: [LOGO_PATH]
- **Number of Branches**: [NUMBER]
- **Branch Names**: [LIST_BRANCHES]

### REBRANDING CHECKLIST

#### 1. Brand Assets (Do First)
- [ ] Replace logo files in `/images/` folder
- [ ] Update favicon.png
- [ ] Update apple-touch-icon

#### 2. CSS Variables (Global Rebrand)
Find and replace in ALL HTML files:
```css
/* FROM (DBC defaults) */
--cream: #F4F0E6;
--green: #3A5F48;
--green-dark: #2A4635;
--green-deep: #1E3328;
--gold: #D4AF37;
--red: #A63429;

/* TO (Client colors) */
--cream: [CLIENT_CREAM];
--green: [CLIENT_PRIMARY];
--green-dark: [CLIENT_PRIMARY_DARK];
--green-deep: [CLIENT_PRIMARY_DEEP];
--gold: [CLIENT_ACCENT];
--red: [CLIENT_DANGER];
```

#### 3. Text Replacements (All Files)
Search and replace globally:
| Find | Replace With |
|------|--------------|
| De Bud Chef | [CLIENT_NAME] |
| DBC | [CLIENT_CODE] |
| debudchef.co.za | [CLIENT_DOMAIN] |
| Quality Counts | [CLIENT_TAGLINE] |
| Cultivating Excellence | [CLIENT_TAGLINE] |

#### 4. Database Configuration
Update `/backend/.env`:
```
MONGODB_URI=mongodb://localhost:27017/[client_code_lowercase]
JWT_SECRET=[generate_new_secret]
```

#### 5. Email Templates
Update all email templates in `/backend/services/emailService.js`:
- Company name
- Logo URL
- Support email
- Footer text

#### 6. Branch Setup
Create branches in database for each store location:
```javascript
// Run via seed script
const branches = [
  {
    branchCode: '[CODE1]',
    name: '[Branch 1 Name]',
    type: 'retail',
    address: { /* ... */ },
    // ...
  },
  // Repeat for each branch
];
```

#### 7. Staff Accounts
Create staff accounts following pattern:
- `[branchcode].manager@[domain]` - Staff Manager
- `[branchcode].assistant@[domain]` - Staff Assistant

#### 8. Products
- Import client's product catalog
- Set up categories matching their inventory
- Configure pricing

#### 9. Files to Rebrand
Priority order:
1. `index.html` - Public homepage
2. `login.html` - Login page
3. `admin.html` - Admin dashboard
4. `pos.html` - Point of Sale
5. `stocktake-app.html` - Stock take app
6. `ormonde.html` → `[branch].html` - Branch login pages
7. `dashboard.html` - Customer dashboard
8. `training-hub.html` - Training materials
9. All other HTML files

#### 10. Deployment
- Create deployment tarball
- Upload to client server
- Configure nginx
- Set up SSL certificate
- Run database seeds
- Test all flows

### IMPORTANT RULES
- NO browser alert(), prompt(), or confirm() - use branded modals
- NO emojis unless client requests
- ALL prices in Rands (R)
- Mobile-first responsive design
- OTP authentication for staff (no passwords)
- Photo verification required for stock takes (SA GMP compliance)

### TEST CHECKLIST
- [ ] OTP login works for all roles
- [ ] POS processes Cash, Card, EFT payments
- [ ] Stock take creates sessions and counts items
- [ ] Admin can approve orders and cashups
- [ ] All branding is correct (no DBC references)
- [ ] Emails send with correct branding
- [ ] Mobile responsive on all pages
```

---

# PART 2: CLIENT PROPOSAL TEMPLATE

## Cannabis Retail Management System Proposal

### For: [CLIENT_NAME]
### Date: [DATE]
### Prepared by: De Bud Chef Systems

---

### Executive Summary

We propose implementing our comprehensive Cannabis Retail Management System for your [NUMBER] retail locations. This enterprise-grade solution covers:

- **Point of Sale (POS)** - Fast, intuitive sales processing
- **Inventory Management** - Real-time stock tracking across all branches
- **Stock Take System** - SA GMP compliant with photo verification
- **Staff Management** - OTP-based secure authentication
- **Daily Cashup & Reconciliation** - Manager and owner approval workflows
- **Customer Loyalty** - Points, tiers, and rewards program
- **Section 21 Medical Track** - Prescription verification (if applicable)
- **Multi-Branch Dashboard** - Centralized oversight for owners

---

### System Features

#### POS System
- Odyssey-style layout (cart left, products right)
- Multiple payment methods: Cash, Card (Speedpoint), EFT
- Split payment support
- Till session management
- Offline capability with sync

#### Inventory & Stock Take
- Photo verification (mandatory for SA GMP)
- Variance tracking with thresholds
- Manager approval workflow
- SAHPRA-compliant reporting
- Batch and expiry tracking

#### Staff & Security
- OTP login (no passwords to remember or share)
- Role-based access control (Owner, Manager, Assistant)
- Audit trail for all transactions
- Geolocation verification

#### Reporting & Analytics
- Daily sales reports
- Branch comparison
- Product performance
- Staff performance metrics

---

### Pricing Structure

#### Option A: Standard Deployment (1-9 Stores)

| Item | Cost |
|------|------|
| Setup per store | R 10,000 |
| **Total Setup ([X] stores)** | **R [X * 10,000]** |
| Monthly SaaS | R 1,500/month |

#### Option B: Enterprise Deployment (10+ Stores)

| Item | Cost |
|------|------|
| Setup per store | R 5,000 |
| **Total Setup ([X] stores)** | **R [X * 5,000]** |
| Monthly SaaS | R 1,500/month |

---

### What's Included

#### Setup Fee Covers:
- Full system white-labeling with your brand
- Custom domain configuration
- Branch setup and configuration
- Staff account creation
- Product catalog import
- Initial training session (2 hours per branch)
- 30-day post-launch support

#### Monthly SaaS Includes:
- Cloud hosting and maintenance
- System updates and security patches
- Data backups (daily)
- Email support (business hours)
- Uptime guarantee (99.5%)

---

### Implementation Timeline

| Phase | Duration | Activities |
|-------|----------|------------|
| Week 1 | 5 days | Branding, configuration, branch setup |
| Week 2 | 5 days | Product import, staff training |
| Week 3 | 3 days | Testing, refinement |
| Week 4 | 2 days | Go-live, support |

**Total: 3-4 weeks from contract signing**

---

### Requirements from Client

1. Brand assets (logo, colors, fonts)
2. Branch details (names, addresses, contact info)
3. Staff list with email addresses
4. Product catalog (Excel/CSV)
5. Banking details for EFT display
6. Domain for system access

---

### Terms

- 50% deposit to commence
- 50% on go-live
- Monthly SaaS billed in advance
- 30-day cancellation notice for SaaS

---

### Contact

**De Bud Chef Systems**
Email: systems@debudchef.co.za
Phone: [PHONE]

---

# PART 3: PRICING CALCULATOR

```
=== PRICING CALCULATOR ===

Standard (1-9 shops):
- Setup: R10,000 per shop
- Monthly: R1,500 total

Enterprise (10+ shops):
- Setup: R5,000 per shop
- Monthly: R1,500 total

Examples:
- 3 shops:  R30,000 setup + R1,500/month = R48,000/year
- 5 shops:  R50,000 setup + R1,500/month = R68,000/year
- 10 shops: R50,000 setup + R1,500/month = R68,000/year
- 15 shops: R75,000 setup + R1,500/month = R93,000/year
- 20 shops: R100,000 setup + R1,500/month = R118,000/year

Break-even vs standard at 10 shops:
- Standard: 10 x R10,000 = R100,000
- Enterprise: 10 x R5,000 = R50,000
- Savings: R50,000
```

---

# PART 4: TECHNICAL DEPLOYMENT CHECKLIST

## Pre-Deployment

- [ ] Receive client brand assets
- [ ] Confirm branch count and names
- [ ] Receive product catalog
- [ ] Confirm domain/subdomain
- [ ] Server provisioned (Ubuntu 22.04 LTS recommended)

## Server Setup

```bash
# 1. Install dependencies
sudo apt update && sudo apt install -y nodejs npm nginx certbot mongodb

# 2. Clone/upload codebase
# 3. Configure environment
cp .env.example .env
nano .env  # Update all values

# 4. Install packages
npm install --production

# 5. Configure nginx
# 6. Setup SSL with certbot
# 7. Configure PM2 for process management
pm2 start backend/server.js --name [client-code]
pm2 save
```

## Database Seeds

```bash
# Run in order:
node backend/scripts/seed-branches.js
node backend/scripts/seed-staff.js
node backend/scripts/seed-products.js
node seed-stock.js
```

## Post-Deployment Verification

- [ ] All pages load with correct branding
- [ ] OTP login works
- [ ] POS can process sales
- [ ] Stock take app functions
- [ ] Admin approvals work
- [ ] Emails send correctly
- [ ] Mobile responsive

---

# PART 5: FILES TO COPY FOR NEW INSTANCE

```
/DBC/newbrand/
├── backend/           # Complete backend
├── css/               # Stylesheets
├── frontend/          # Frontend JS modules
├── images/            # Replace with client assets
├── *.html             # All HTML pages (rebrand these)
├── package.json
├── package-lock.json
└── .env.example       # Template for environment
```

**Do NOT copy:**
- `node_modules/`
- `.env` (create fresh)
- `.git/`
- `uploads/` (client data)
- Any `.md` documentation files

---

# PART 6: SUPPORT DOCUMENTATION

## Common Issues

### OTP Not Sending
- Check SMTP configuration in `.env`
- Verify email service credentials
- Check spam folder

### POS Not Loading Products
- Verify MongoDB connection
- Check product seeding completed
- Verify branch assignment

### Stock Take Session Errors
- Ensure branch exists in database
- Check user has branchId assigned
- Verify API endpoints accessible

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial white-label system |

---

**END OF MASTER DOCUMENT**
