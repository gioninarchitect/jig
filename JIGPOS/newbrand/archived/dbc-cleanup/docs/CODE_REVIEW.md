# DBC System - Code Review Report

**Generated**: 5 February 2026
**Project**: De Bud Chef Cannabis Retail Management System

---

## Summary

| Metric | Value |
|--------|-------|
| Total Lines of Code | 150,841 |
| HTML Files | 76 |
| JavaScript Files | 205 |
| CSS Files | 4 |
| Backend Routes | 35 |
| Database Models | 41 |

---

## Top 20 Largest Files (by line count)

| File | Lines |
|------|-------|
| admin.html | 9,677 |
| pos.html | 4,241 |
| dashboard.html | 4,079 |
| owner-dashboard.html | 3,872 |
| inventory-manager-dashboard.html | 3,626 |
| architecture.html | 2,730 |
| stocktake-app.html | 2,610 |
| dashboard-old.html | 2,539 |
| index.html | 2,535 |
| backend/routes/pos.js | 1,961 |
| debudchef-design-system.html | 1,849 |
| training-hub.html | 1,704 |
| supplier-portal.html | 1,656 |
| drive-through-staff.html | 1,585 |
| backend/routes/order.js | 1,571 |
| affiliate.html | 1,547 |
| branch-receiving.html | 1,485 |
| uat-testing.html | 1,432 |
| pos-training.html | 1,406 |
| stock-receiving-app.html | 1,312 |

---

## Backend Routes (35 files)

| Route File | Description |
|------------|-------------|
| affiliate.js | Affiliate/referral system |
| auth-otp.js | OTP-based authentication |
| batch.js | Batch/lot tracking |
| branches.js | Branch management |
| budgets.js | Budget tracking |
| bug-reports.js | Bug reporting system |
| cart.js | Shopping cart API |
| dashboard.js | Dashboard data endpoints |
| drive-through.js | Drive-through orders |
| influencer-verification.js | Influencer verification |
| leads.js | Lead management |
| marketing.js | Marketing campaigns |
| medical-providers.js | Medical service providers |
| menu-boards.js | Digital menu boards |
| menu.js | Menu management |
| modules.js | Module subscriptions |
| order.js | Order processing |
| pos.js | Point of Sale (largest: 1961 lines) |
| products.js | Product catalog |
| purchase-limits.js | Purchase limits compliance |
| purchase-order.js | Purchase orders |
| recipes.js | Recipe management |
| reorder-rules.js | Auto-reorder rules |
| reports.js | Reporting endpoints |
| section21.js | Section 21 medical cannabis |
| staff-shifts.js | Staff shift management |
| staff.js | Staff CRUD |
| stock-transfers.js | Inter-branch transfers |
| stocktake.js | Stock taking/counting |
| subscriptions.js | Subscription services |
| supplier.js | Supplier management |
| users.js | User management |
| viral.js | Viral/social features |
| vouchers.js | Voucher/discount codes |
| wholesale.js | Wholesale operations |

---

## Database Models (41 files)

| Model | Description |
|-------|-------------|
| Affiliate.js | Affiliate program members |
| Batch.js | Product batches/lots |
| Branch.js | Branch locations |
| BranchInventory.js | Per-branch stock levels |
| Budget.js | Branch budgets |
| Bug.js | Bug reports |
| Campaign.js | Marketing campaigns |
| Cart.js | Shopping carts |
| DailyCashup.js | End-of-day cash reconciliation |
| DriveThrough.js | Drive-through queue |
| InterBranchTransfer.js | Stock transfers between branches |
| Lead.js | Customer leads |
| LoginSession.js | Login sessions/tokens |
| LoyaltyConfig.js | Loyalty program settings |
| MarketingPreference.js | Customer marketing prefs |
| MedicalServiceProvider.js | Medical providers |
| MenuBoard.js | Digital menu boards |
| MenuItem.js | Menu items |
| Module.js | System modules |
| ModuleSubscription.js | Module subscriptions |
| Notification.js | Push notifications |
| OTPCode.js | One-time passwords |
| Order.js | Customer orders |
| Payment.js | Payment records |
| Product.js | Product catalog |
| PurchaseOrder.js | Supplier purchase orders |
| PurchaseRecord.js | Customer purchase history |
| Recipe.js | Product recipes |
| ReorderRule.js | Auto-reorder rules |
| Sale.js | POS sales transactions |
| Section21Document.js | Medical cannabis docs |
| StaffShift.js | Staff shifts/clock in-out |
| StockTake.js | Stock counts |
| Supplier.js | Suppliers |
| TillSession.js | Cash register sessions |
| User.js | User accounts |
| ViralCampaign.js | Viral campaigns |
| ViralScore.js | Viral scoring |
| Voucher.js | Discount vouchers |
| WholesaleCustomer.js | Wholesale customers |
| WholesaleOrder.js | Wholesale orders |

---

## Frontend Applications

| Application | File | Lines |
|-------------|------|-------|
| Admin Dashboard | admin.html | 9,677 |
| Point of Sale | pos.html | 4,241 |
| Customer Dashboard | dashboard.html | 4,079 |
| Owner Dashboard | owner-dashboard.html | 3,872 |
| Inventory Manager | inventory-manager-dashboard.html | 3,626 |
| Stock Take App | stocktake-app.html | 2,610 |
| Patient Store | products.html | 729 |
| Public Homepage | index.html | 2,535 |
| Design System | debudchef-design-system.html | 1,849 |
| Training Hub | training-hub.html | 1,704 |
| Supplier Portal | supplier-portal.html | 1,656 |
| Drive-Through | drive-through-staff.html | 1,585 |
| Branch Receiving | branch-receiving.html | 1,485 |
| Dispatch App | dispatch-app.html | 583 |
| Packer App | packer-app.html | 298 |

---

## Key Features Implemented

### Authentication
- OTP-based login (6-digit codes via email)
- 30-day token expiry
- Role-based access control (RBAC)
- Embedded OTP forms (no redirect)

### POS System
- Multi-payment support (Cash, Card/SpeedPoint, EFT, Split)
- Till session management (open/close with denominations)
- Variance detection (>R50 requires approval)
- Staff shift tracking
- Break management

### Inventory Management
- Multi-branch inventory
- Stock take app with mobile support
- Approval workflow for stock takes
- Inter-branch transfers
- Auto-reorder rules

### Product Management
- Category hierarchy: Supplier > Product Type > Variants
- Pre Rolls / Pre Packs / Loose subgroups
- Section 21 medical cannabis (compliance)
- Batch/lot tracking

### Reporting
- Daily cashup with Smart Ledger
- Sales reports by branch/period
- Variance reports
- Staff performance metrics

---

## Architecture Notes

### API Pattern
All routes mounted at `/api/v1/` prefix:
```javascript
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api/v1'
    : `${window.location.protocol}//${window.location.host}/api/v1`;
```

### Authentication Middleware
```javascript
const { authenticateToken, authenticateOTPToken } = require('./middleware/auth');
```

### Database
- MongoDB with Mongoose ODM
- Database name: `dbc`
- Port: 3001

### Brand Colors
```css
--cream: #F4F0E6;
--green: #3A5F48;
--green-dark: #2A4635;
--green-deep: #1E3328;
--gold: #D4AF37;
--red: #A63429;
```

---

## Recent Changes (Feb 2026)

1. **Till Session Management** - Added open/close with SA denominations
2. **Staff Shift Tracking** - Clock in/out with break management
3. **Daily Cashup Wizard** - 4-step end-of-day reconciliation
4. **Stock Take Approvals** - Owner/manager approval workflow
5. **Category Updates** - Pre Rolls/Pre Packs/Loose subgroups

---

## Deployment Ready

All systems tested and ready for Ormonde branch launch:
- Stock Take App
- POS System
- Owner Dashboard
- Admin Dashboard
- Inventory Dashboard

---

**END OF CODE REVIEW**
