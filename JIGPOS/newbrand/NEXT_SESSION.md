# DBC System - Next Session Document

**Session Date**: 15 February 2026
**Project**: De Bud Chef Cannabis Retail Management System
**Database**: `dbc` (MongoDB)
**Git Branch**: `vanillapush`
**Working Directory**: `/Users/florisolivier/DBC/newbrand` (ALL work happens here)

---

## CRITICAL RULES

1. **ALL work in `/Users/florisolivier/DBC/newbrand/`** — root DBC = old app, don't touch
2. **Local dev port**: 3002 | **Production port**: 3003
3. **Production**: app.debudchef.co.za (154.66.197.199), PM2: dbc, Path: /var/www/dbc
4. **Owner**: Power (owner@debudchef.co.za) — only ONE owner
5. **NO tagline, NO emojis**
6. **NEVER deploy newbrand backend routes to production** — crashes server

---

## SESSION 15 FEB — WHAT WE DID

### Inventory Manager Dashboard — 2026 UI/UX Upgrade

**Created `css/inv-dashboard.css` (999 lines)**
- Extracted all 560+ lines of inline `<style>` from inventory-manager-dashboard.html
- Added `:root` design tokens (brand colors, shadows, radii, transitions)
- Refactored with modern CSS:
  - Fluid typography — `clamp()` on headings
  - Glassmorphism — `backdrop-filter: blur(12px)` on content sections with `@supports` fallback
  - Slimmer sidebar — 260px (was 280px), collapsible state with toggle button
  - Improved bottom nav — 56px touch targets, pill-shaped gold active indicator
  - Section transitions — fade + slide-up animation (300ms) on tab switch
  - Better breakpoints — tablet landscape (768-1024px), desktop (>1200px)
  - Responsive tables — sticky headers, overflow-x auto scrolling
  - Stocktake branch tab styles and MDC product card styles included

**Updated `inventory-manager-dashboard.html` (~578 line reduction)**
- Removed all 3 inline `<style>` blocks (main, branch tabs, MDC cards)
- Added stylesheet link: `css/inv-dashboard.css`
- Kept: `css/tablet-optimizations.css`
- **REMOVED `css/dbc-brand.css`** — it's a marketing CSS that conflicts with Bootstrap (breaks buttons, cards, tables, sidebar, modals)
- Added DBC logo image to sidebar header
- Added desktop sidebar collapse toggle button
- Added `<span class="nav-indicator">` to all 5 bottom nav buttons
- Added `toggleSidebarCollapse()` function

**Updated `frontend/inv-core.js` (+2 lines)**
- Section transitions: adds `.section-enter` class on tab switch, removes after 300ms

### Bug Fix: CSS Scoping
- Scoped `.nav-link` styles to `.sidebar .nav-link` to prevent conflicts with Bootstrap nav components elsewhere on the page

### Deployed to Production
- Frontend-only deploy (3 files: css/inv-dashboard.css, inventory-manager-dashboard.html, frontend/inv-core.js)
- Deploy script: `deploy-inv-dashboard.sh` (in DBC root)
- All tested and confirmed working locally before deploy

---

## NOT DONE — RESUME HERE

### 1. Deploy Stocktake Fix (from 13 Feb session)
- Tarball was at `/tmp/dbc-stocktake-fix.tar.gz` (may need to recreate)
- Deploy script: `newbrand/deploy-stocktake-fix.sh`
- Contains: stocktake app fixes, invoice rebranding, frontend files
- Also runs `add-missing-products.js` on server (7 new products)

### 2. Deploy Branded Invoices
- invoiceGenerator.js rebranded locally (green header, gold accents, DBC info)
- Needs careful merge on production (backend file)

### 3. Verify Production PINs
- Need to confirm PINs work on production before staff can log in

### 4. Load Stock Data into Inventory Dashboard
- Create bulk-update script using final CSV data
- Populate BranchInventory for Ormonde with 12 Feb counts

### 5. Resolve Outstanding Stock Questions
- **4 Unidentified Lifted products** — need product names from photos
- **10 Just Blaze flavors not photographed** — need counts or confirm sold out
- **~910g indoor flower missing** — 8 strains from 30 Jan not found on 12 Feb
- **Blue Pava vs Blu Rave** — same strain renamed?
- **Medibles Singles** — 35 or 70? (two photo batches)
- **Large drops to verify**: Gold Roll -249, Moon Stick I.D -72, Honey-comb -59

### 6. R0 Pricing
- 146 products still at R0 — need prices from user

### 7. Missing Script: `dbc-core.js`
- `_dbcShowConfirm` is defined in `frontend/dbc-core.js` but NOT loaded in inventory-manager-dashboard.html
- Used by: `submitPO()`, `inv-batches.js`, `inv-stocktake.js`, `inv-reorder.js`
- Add `<script src="/frontend/dbc-core.js"></script>` after `dbc-auth.js` in the HTML

---

## LOGIN CREDENTIALS

| Role | Email | PIN |
|------|-------|-----|
| Owner (Power) | owner@debudchef.co.za | 830101 |
| Admin | admin@debudchef.co.za | 990001 |
| Ormonde Manager | ormonde.manager@debudchef.co.za | 110001 |
| Ormonde Assistant | ormonde.assistant@debudchef.co.za | 110002 |
| Inventory Manager | inventory@debudchef.co.za | 770001 |

**Dev mode OTP bypass**: `123456`

---

## SERVER DETAILS

| Item | Value |
|------|-------|
| Working Directory | `/Users/florisolivier/DBC/newbrand` |
| Local Dev Port | 3002 |
| Production Server | app.debudchef.co.za (154.66.197.199) |
| Production Port | 3003 |
| PM2 Process | `dbc` |
| Production Path | `/var/www/dbc` |
| Database | `dbc` (MongoDB) |

---

## TEST URLs

| App | Local | Production |
|-----|-------|------------|
| POS | http://localhost:3002/pos.html | https://app.debudchef.co.za/pos.html |
| Stocktake App | http://localhost:3002/stocktake-app.html | https://app.debudchef.co.za/stocktake-app.html |
| Inventory Dashboard | http://localhost:3002/inventory-manager-dashboard.html | https://app.debudchef.co.za/inventory-manager-dashboard.html |
| Owner Dashboard | http://localhost:3002/owner-dashboard.html | https://app.debudchef.co.za/owner-dashboard.html |
| Admin Dashboard | http://localhost:3002/admin.html | https://app.debudchef.co.za/admin.html |

---

## KEY FILES

| File | Purpose |
|------|---------|
| `css/inv-dashboard.css` | NEW — extracted/refactored dashboard styles |
| `css/tablet-optimizations.css` | Shared tablet touch optimizations |
| `deploy-inv-dashboard.sh` | Deploy script for UI upgrade (in DBC root) |
| `ormonde-full-stocktake-12feb2026.csv` | Final 12 Feb stock take (120 items) |
| `ormonde-stock-comparison-report.csv` | 30 Jan vs 12 Feb comparison (157 rows) |

---

## IMPORTANT LESSON LEARNED

**Do NOT link `css/dbc-brand.css` in dashboard pages.** It's a marketing/landing page stylesheet with aggressive component styles (`.btn`, `.card`, `.table th`, `.sidebar`, `.modal`, headings) that override Bootstrap and break dashboard functionality. Instead, add the `:root` CSS variables directly into the dashboard's own stylesheet.

---

**END OF SESSION DOCUMENT**
