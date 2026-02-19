# Da Bud Chef - Session Handoff

## Session Date: 12 February 2026

---

## What We Did This Session (12 Feb)

### 1. Removed "Manage Inventory" from POS
- Removed the gold "fa-boxes" button from POS header (was Quick Stock Update + Add New Product)
- Stock is now managed ONLY via the Stocktake App
- Removed the entire `inventoryModal` HTML from pos.html
- Removed `pos-inventory.js` script tag from pos.html
- Note: `frontend/pos-inventory.js` file still exists (dead code) but is not loaded

### 2. Kept Receive Stock Tab in Stocktake App
- Initially removed by mistake, then fully reverted
- `switchMode()` function in st-items.js is intact
- `st-receiving.js` script tag is intact
- Stocktake app has both "Stock Take" and "Receive Stock" tabs

### 3. Fixed offline-manager.js IndexedDB Crash
- `IDBKeyRange.only(false)` was invalid — boolean not a valid IndexedDB key
- Changed to `store.getAll()` + `.filter(s => !s.synced)` instead

### 4. Deployed Frontend to Production
- Created tarball: 27 frontend files (stocktake + POS + inventory dashboard)
- Deployed to app.debudchef.co.za via `/tmp/dbc-frontend-deploy.tar.gz`
- Script was at `/tmp/deploy-dbc-frontend.sh`

### 5. Created Hotfix Script for PINs
- Script: `/tmp/dbc-hotfix.sh`
- Sets permanent PINs for all 30 staff users on production DB
- Also deployed fixed offline-manager.js
- **STATUS UNKNOWN**: May or may not have been run — need to verify on production

### 6. Started Stocktake Reviews in Inventory Dashboard (INCOMPLETE)
- Added "Stocktake Reviews" nav item with pending badge to inventory-manager-dashboard.html
- Added `stocktake-reviews-section` HTML (table + detail modal with approve/reject)
- Added `case 'stocktake-reviews'` to inv-core.js
- Added `<script src="/frontend/inv-stocktake.js">` tag to HTML
- **inv-stocktake.js WAS NOT CREATED** — the JS logic file is missing, section will crash

---

## What Was NOT Finished (RESUME HERE)

### Priority 1: Create inv-stocktake.js
The HTML section and script tag exist but the actual JavaScript file doesn't. Needs:
- `loadPendingStocktakes()` — fetch from GET /api/v1/stocktake/pending and /stocktake/history
- `openStocktakeDetail(sessionId)` — show line items in modal
- `approveStocktake()` — POST /api/v1/stocktake/:id/approve
- `rejectStocktake()` — POST /api/v1/stocktake/:id/reject (if endpoint exists)
- `filterStDetailItems(filter, btn)` — filter line items in detail modal
- `closeStocktakeDetail()` — close modal
- Badge update for pending count
- Branch filter population

### Priority 2: Verify Production PINs
Run on production to check if hotfix script was executed:
```bash
ssh root@154.66.197.199 "cd /var/www/dbc && node -e \"require('dotenv').config(); const m=require('mongoose'); m.connect(process.env.MONGODB_URI).then(async()=>{const u=await m.connection.db.collection('users').findOne({email:'ormonde.manager@debudchef.co.za'}); console.log('PIN:', u?.permanentPin || 'NOT SET'); m.disconnect();})\""
```
If PIN is NOT SET, run the hotfix script again.

### Priority 3: Branded De Bud Chef Invoices
User asked "what happened to our branded budchef invoices????" — this was never answered. Need to investigate what invoice system exists and what branding is missing.

### Priority 4: Deploy Updated Inventory Dashboard
Once inv-stocktake.js is created, redeploy:
- inventory-manager-dashboard.html (already has stocktake section)
- frontend/inv-stocktake.js (new file)
- frontend/inv-core.js (has stocktake-reviews case)

### Priority 5: Branch Tabs for Stocktake Reviews
User suggested adding tabs to accommodate all branches in the stocktake reviews UI. Not yet implemented.

### Priority 6: POS Testing Per Branch
- Test POS at each branch to verify only that branch's stock shows
- Was working via API (123 products for Ormonde confirmed)
- Needs browser testing

---

## Current State

### Database Stats
- **389 total products** (228 original + 161 new POS products)
- **892 BranchInventory records** across 8 branches
- **8 DBC- branches** with stock data

### All User PINs (Local DB)

| Role | Email | PIN |
|------|-------|-----|
| owner | owner@debudchef.co.za | 830101 |
| admin | admin@debudchef.co.za | 990001 |
| admin | admin@dabudchef.co.za | 728053 |
| admin | florisolivier7@gmail.com | 697388 |
| admin | hello@debudchef.co.za | 766415 |
| inventory_manager | inventory@debudchef.co.za | 770001 |
| dispatch_manager | dispatch@debudchef.co.za | 497840 |
| packer | packer@debudchef.co.za | 153380 |
| branch_manager | ormonde.manager@debudchef.co.za | 110001 |
| branch_assistant | ormonde.assistant@debudchef.co.za | 110002 |
| branch_manager | ficksburg.manager@debudchef.co.za | 847263 |
| branch_assistant | ficksburg.assistant@debudchef.co.za | 592418 |
| branch_manager | klerksdorp.manager@debudchef.co.za | 361749 |
| branch_assistant | klerksdorp.assistant@debudchef.co.za | 728536 |
| branch_manager | mayfair.manager@debudchef.co.za | 493871 |
| branch_assistant | mayfair.assistant@debudchef.co.za | 615294 |
| branch_manager | ladybrand.manager@debudchef.co.za | 274639 |
| branch_assistant | ladybrand.assistant@debudchef.co.za | 938172 |
| branch_manager | rustenburg.manager@debudchef.co.za | 582946 |
| branch_assistant | rustenburg.assistant@debudchef.co.za | 417583 |
| branch_manager | spruitview.manager@debudchef.co.za | 763128 |
| branch_assistant | spruitview.assistant@debudchef.co.za | 349671 |
| branch_manager | wonderboom.manager@debudchef.co.za | 826514 |
| branch_assistant | wonderboom.assistant@debudchef.co.za | 471839 |
| branch_manager | manager@debudchef.co.za | 605510 |
| branch_assistant | assistant@debudchef.co.za | 829604 |
| branch_manager | storemanager@debudchef.co.za | 663547 |
| branch_assistant | ormonde.staff1@debudchef.co.za | 222222 |
| branch_assistant | ormonde.staff2@debudchef.co.za | 333333 |

### Production PINs: UNKNOWN — need to verify (see Priority 2)

---

## Files Modified This Session (12 Feb)

| File | What |
|------|------|
| `newbrand/pos.html` | Removed inventory button + modal, removed pos-inventory.js script tag |
| `newbrand/frontend/offline-manager.js` | Fixed IDBKeyRange.only(false) crash |
| `newbrand/inventory-manager-dashboard.html` | Added stocktake reviews section + nav item + detail modal + inv-stocktake.js script tag |
| `newbrand/frontend/inv-core.js` | Added stocktake-reviews case to section switching |
| `newbrand/frontend/inv-stocktake.js` | **MISSING — NOT CREATED YET** |

---

## Server Details

| Item | Value |
|------|-------|
| Server | app.debudchef.co.za (154.66.197.199) |
| App Path | /var/www/dbc |
| PM2 Process | dbc |
| Local Dev Port | 3002 |
| Production Port | 3003 |
| Database | dbc (MongoDB) |

---

## Test URLs

| App | Local | Production |
|-----|-------|------------|
| POS | http://localhost:3002/pos.html | https://app.debudchef.co.za/pos.html |
| Inventory Dashboard | http://localhost:3002/inventory-manager-dashboard.html | https://app.debudchef.co.za/inventory-manager-dashboard.html |
| Stock Take App | http://localhost:3002/stocktake-app.html | https://app.debudchef.co.za/stocktake-app.html |
| Owner Dashboard | http://localhost:3002/owner-dashboard.html | https://app.debudchef.co.za/owner-dashboard.html |

---

## Golden Rules

1. **NEVER overwrite production backend routes with local/newbrand files** — crashes server
2. **Frontend files from newbrand ARE safe to deploy** (pos.html, frontend/*.js, dashboard HTMLs)
3. Use `sed` for string replacements on server's own backend files
4. Always `node -c <file>` syntax check before deploying JS
5. Always backup before extracting on server
6. Local dev = port 3002, Production = port 3003
7. Flower quantities = grams, everything else = units
8. User model roles: `branch_manager`, `branch_assistant` (NOT staff_manager/staff_assistant)
9. This stock is CLOSING STOCK — next stock take from Stock Take App
10. Dev OTP bypass = 123456, production uses real PINs (permanentPin field)
11. Auth endpoint: POST /api/v1/auth/otp/verify with field `otpCode` (not `otp`)
12. PIN login: POST /api/v1/auth/otp/verify-pin with fields `email` + `pin`

---

**END OF SESSION DOCUMENT**
