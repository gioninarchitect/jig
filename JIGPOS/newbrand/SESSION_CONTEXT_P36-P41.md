# DBC React App — Complete Build Context (All Prompts)

**Repo**: /Users/florisolivier/DBC/newbrand
**Branch**: dbc_v1.1
**Backend**: Node.js/Express, CommonJS, Port 3001, MongoDB/Mongoose
**React App**: react-app/src/
**Dev Server**: `cd react-app && npm run dev` → http://localhost:5174/app/
**Build**: `cd react-app && npm run build` → 0 errors, 44 chunks
**Total Files**: 118 in react-app/src/

---

## Master Prompt V3 — 35 Prompts, 11 Phases + P36-P41 Storefront

**Architecture Rule:** The World Model's inference engine, risk scoring, stock intelligence, and all "smart" features are configurable per-branch by the Super Admin. Nothing is hard-coded. Every threshold, every rule, every alert can be toggled, tuned, or disabled from the Super Admin panel.

---

## PHASE 1: BACKEND CONTROLLER EXTRACTION (P1-P4)

### P1 — Route Aggregator + Tier 1 Controller Extraction (1,500+ lines)
- Created `routes/index.js` aggregator — single file mounting all routes
- `server.js` reduced to ONE line: `require('./routes')(app)`
- Extracted controllers from Tier 1 files:
  - `routes/pos.js` (1,961 lines) → `controllers/pos.controller.js`
  - `routes/order.js` (1,571 lines) → `controllers/order.controller.js`
- Pattern: handler logic to controller, route file becomes thin router
- CommonJS only, preserved all middleware/auth in route files
- **Commit**: `be27bd2` Route aggregator, `739a34d` POS controller, `bce00d7` Order controller

### P2 — Tier 2 Controller Extraction (800-1,023 lines)
- Extracted controllers from:
  - `routes/dashboard.js` → `controllers/dashboard.controller.js`
  - `routes/inventory.js` → `controllers/inventory.controller.js`
  - `routes/product.js` → `controllers/product.controller.js`
  - `routes/stocktake.js` → `controllers/stocktake.controller.js`
  - `routes/payment.js` → `controllers/payment.controller.js`
- **Commit**: `8eadaa2` Tier 2 controller extraction

### P3 — Tier 3 Controller Extraction (400-659 lines)
- Extracted controllers from:
  - `routes/supplier.js` → `controllers/supplier.controller.js`
  - `routes/purchase-order.js` → `controllers/purchase-order.controller.js`
  - `routes/batch.js` → `controllers/batch.controller.js`
  - `routes/cashup.js` → `controllers/cashup.controller.js`
  - `routes/staff.js` → `controllers/staff.controller.js`
  - `routes/voucher.js` → `controllers/voucher.controller.js`
  - `routes/report.js` → `controllers/report.controller.js`
  - `routes/customer.js` → `controllers/customer.controller.js`
- **Commit**: `d97ecf9` Tier 3 controller extraction

### P4 — Tier 4 Controller Extraction (200-386 lines)
- Extracted controllers from all remaining route files:
  - `routes/affiliate.js`, `routes/lead.js`, `routes/module.js`, `routes/menu-board.js`
  - `routes/dispatch.js`, `routes/branch.js`, `routes/wellness.js`
  - `routes/drive-through.js`, `routes/wholesale.js`, + all remaining over 200 lines
- Final verification: `ls controllers/` matches route file count
- Server starts without errors, 3 random API endpoints tested
- **Result**: 30 controller files in `backend/controllers/`, all route files thin routers
- **Commit**: `bd26593` Tier 4 controller extraction

---

## PHASE 2: FRONTEND SHARED LIBRARY (P5-P7)

### P5 — Quick Wins (Config + Shared Utils)
- Created `frontend/config.js` — single source for API_URL, brand colors, currency
  - Replaced 28 occurrences of duplicated API_URL
- Created `frontend/dbc-utils.js` — shared utilities:
  - `showToast()` — unified with backward-compatible wrapper for 3 different signatures
  - `formatCurrency()` — using `Intl.NumberFormat('en-ZA')`
  - `getToken()`, `logout()`, `apiCall()` with auth headers + error handling
- Created `frontend/dbc-auth.js` — OTP request/verify, token storage, auth state
- Updated 5 highest-traffic HTML files to use shared libs
- **Commit**: `4a00cc7` P5+P6

### P6 — showToast Normalization Across All Files
- Found and replaced all local `showToast` definitions across HTML files
- Ensured `<script src="/js/dbc-utils.js">` loaded BEFORE any calling scripts
- Same deduplication for `formatCurrency`, `getToken`, `logout`
- Verified zero local function definitions remain (only in shared libs)
- **Commit**: `4a00cc7` P5+P6 (combined)

### P7 — DBC Core Library
- Created `frontend/dbc-core.js` — unified DBC namespace:
  - `DBC.api` — get/post/put/delete wrappers
  - `DBC.auth` — getToken, login, logout, isAuthenticated, getUser, hasRole
  - `DBC.ui` — showToast, showModal, hideModal, showConfirm, showLoading, hideLoading
  - `DBC.format` — currency, date, weight, percentage
  - `DBC.brand` — brand color constants
- This namespace becomes the bridge for React components later
- **Result**: Shared config, utils, core modules across 28 HTML files

---

## PHASE 3: HTML MONOLITH SPLITTING (P8-P10)

### P8 — Split admin.html (9,677 lines)
- Mapped 200+ functions across 16 tabs
- Created `frontend/admin/` module structure:
  - `admin-core.js` (tab switching, shared state, init)
  - `admin-products.js`, `admin-pos.js`, `admin-payments.js`, `admin-orders.js`
  - `admin-users.js`, `admin-staff.js`, `admin-vouchers.js`, `admin-modules.js`
  - `admin-affiliates.js`, `admin-leads.js`, `admin-payroll.js`
  - `admin-cashup.js`, `admin-reports.js`, `admin-menu.js`, `admin-invoices.js`
- admin.html became thin shell: HTML structure + script tags only
- **Commit**: `c4e9b8a` Split admin.html

### P9 — Split pos.html (4,241 lines)
- Created `frontend/pos/` module structure:
  - `pos-core.js` (state management, init, SA denominations)
  - `pos-till.js`, `pos-shift.js`, `pos-products.js`, `pos-cart.js`
  - `pos-payment.js`, `pos-receipt.js`, `pos-customer.js`
  - `pos-inventory.js`, `pos-variance.js`
- Tested all flows: open till → add products → payment → receipt
- **Commit**: `bcebfda` Split pos.html

### P10 — Split Remaining Dashboards
- **owner-dashboard.html** (3,872 lines) → `frontend/owner/`:
  - `owner-core.js`, `owner-approvals.js`, `owner-reports.js`
  - `owner-branches.js`, `owner-budget.js`, `owner-staff.js`
  - **Commit**: `b2a4a35`
- **inventory-manager-dashboard.html** (3,626 lines) → `frontend/inv-manager/`:
  - `inv-core.js`, `inv-products.js`, `inv-batches.js`
  - `inv-purchase-orders.js`, `inv-suppliers.js`, `inv-stock.js`
  - `inv-reorder.js`, `inv-mdc.js`, `inv-section21.js`
  - **Commit**: `74713c3`
- **dashboard.html** (4,079 lines) → `frontend/customer/`:
  - `cust-core.js`, `cust-products.js`, `cust-medical.js`
  - `cust-wellness.js`, `cust-orders.js`, `cust-cart.js`, `cust-profile.js`
  - **Commit**: `b9b88a2`
- **stocktake-app.html** (2,610 lines) → `frontend/stocktake/`:
  - `stocktake-core.js`, `stocktake-counting.js`
  - `stocktake-photos.js`, `stocktake-variance.js`
  - **Commit**: `f620eec`
- **Result**: 5 HTML monoliths → thin shells + ~50 JS modules

---

## PHASE 4: VERIFICATION & CLEANUP (P11-P14)

### P11 — API Route Verification
- Generated route map of all endpoints
- Verified controller functions exist and are exported
- Verified route paths unchanged, auth middleware present
- Tested critical flows end-to-end: Login, POS sale, Owner dashboard, Customer order, Stocktake

### P12 — Frontend Deduplication Verification
- Verified zero local duplicates of `showToast`, `formatCurrency`, `getToken`, `logout`
- Verified all HTML files load shared libs (config.js, dbc-utils.js, dbc-core.js)
- Verified all split modules load correctly
- Line count comparison documented
- Removed dead code: `frontend/admin-loyalty-points.js`, `frontend/bug-reporter.js`, `frontend/utils.js`
- **Commit**: `14d8cac` P12 fix frontend deduplication

### P13 — Check Existing React Files
- Found and audited existing React/JSX files from legacy Loose Draw codebase
- All 4 legacy React files marked DISCARD — did not match DBC auth, API, or branding
- **Commit**: `8672591` Delete legacy Loose Draw React files

### P14 — Production Readiness Check
- Server startup test: clean with zero warnings
- All HTML pages tested in browser — zero console errors
- Auth flow tested: OTP → verify → JWT → protected routes
- Mobile responsiveness spot-checked on 375px and 768px
- **Result**: Clean codebase ready for React build

---

## PHASE 5: REACT FOUNDATION (P15-P17)

### P15 — React Project Scaffolding
- Created `react-app/` alongside existing codebase (parallel running)
- Stack: Vite + React + TailwindCSS + Axios
- Configured Vite proxy: `/api` → `http://localhost:3001`
- Configured Tailwind with DBC brand colors:
  - `dbc-cream: #F4F0E6`, `dbc-green: #3A5F48`, `dbc-gold: #D4AF37`, `dbc-red: #A63429`
- Created API service layer: `services/api.js` with JWT interceptors
- Created auth context: `contexts/AuthContext.jsx` with OTP flow, token management, ProtectedRoute
- Same backend, same database, same tokens — zero migration risk
- **Commit**: `53b6df6` Scaffold React app

### P16 — Shared Component Library
- Built 16 UI components in `components/ui/`:
  - `Button.jsx`, `Card.jsx`, `Modal.jsx`, `Toast.jsx`, `Table.jsx`
  - `Badge.jsx`, `Input.jsx`, `Select.jsx`, `Tabs.jsx`, `Sidebar.jsx`
  - `Header.jsx`, `LoadingSpinner.jsx`, `EmptyState.jsx`, `StatCard.jsx`
  - `ApprovalCard.jsx`, `BranchSelector.jsx`
- Built 3 layout components:
  - `DashboardLayout.jsx` (sidebar + header + content)
  - `POSLayout.jsx` (full-screen, no sidebar)
  - `PublicLayout.jsx` (login/unauthorized)
- Created `ComponentDemo.jsx` test page at `/app/components`
- Tailwind only, mobile-first, DBC brand colors only
- **Commit**: `f13b3a2` Shared component library

### P17 — Auth + Routing + Role-Based Access
- Defined role hierarchy (12 roles):
  - OWNER (100), SUPER_ADMIN (90), ADMIN (80), BRANCH_MANAGER (60)
  - INVENTORY_MANAGER (50), STAFF_ASSISTANT (20), PACKER (15), DISPATCH (15)
  - CUSTOMER (10), SUPPLIER (10), WHOLESALE_CUSTOMER, DRIVER
- Created ProtectedRoute: checks auth token + role permission
- Created route structure: `/app/pos`, `/app/admin`, `/app/owner`, `/app/owner/360`, etc.
- Branch scoping: X-Branch-Id header, staff sees their branch, owner sees all
- **Commit**: `9eb68c4` Auth + routing + role-based access

---

## PHASE 6: WORLD MODEL — DBC DOMAIN ARCHITECTURE (P18-P20)

### P18 — World Model Types + Event Bus
- Created DBC-specific types in `world-model/types.js`:
  - `BranchWorldState` with 6 domain state slices:
    - Inventory, Financial, Compliance, Staff, Operational, Customer
  - `DBCWorldState` for multi-branch (Owner sees all, staff sees one)
  - `WorldModelConfig` for Super Admin-controlled feature toggles
- Defined 30 event types across 6 domains:
  - **POS**: SALE_COMPLETED, SALE_VOIDED, REFUND_PROCESSED, DISCOUNT_APPLIED, TILL_OPENED, TILL_CLOSED, CASH_IN_OUT
  - **Inventory**: STOCK_RECEIVED, STOCK_ADJUSTED, STOCK_TRANSFERRED, BATCH_CREATED, BATCH_QA_RESULT, STOCKTAKE_COMPLETED, REORDER_TRIGGERED
  - **Staff**: SHIFT_STARTED, SHIFT_ENDED, BREAK_TAKEN, VARIANCE_DETECTED
  - **Compliance**: PURCHASE_LIMIT_CHECK, SECTION21_VERIFICATION, DOCUMENT_EXPIRY_WARNING
  - **Operational**: ORDER_PLACED, ORDER_PACKED, ORDER_DISPATCHED, PO_SUBMITTED, PO_APPROVED, APPROVAL_REQUESTED
  - **Customer**: CUSTOMER_REGISTERED, WELLNESS_POINTS_EARNED, WELLNESS_TIER_CHANGED
- Created Event Bus: `world-model/events.js` — singleton with subscribe/emit/batch/getHistory
- **Commit**: `632c597` World Model types + event bus

### P19 — World Model State + Reducer
- Created initial state factory: `createInitialBranchState(branchId)` with all 6 domain slices
- Built `dbcWorldReducer`: handles ALL 30 DBC events, updates correct branch state
- Reducer checks `WorldModelConfig` before processing — disabled features are skipped
- Persistence: localStorage per user, syncs with backend every 30 seconds
- Config loading: GET `/api/v1/config/world-model`, cached 5 minutes, auto-refresh
- **Commit**: `53ad7bd` World Model state reducer

### P20 — Inference Engine + WorldModelProvider
- Created 7 risk patterns (replacing template's mood/emotion patterns):
  1. `till_variance_trend` — tracks average variance against thresholds
  2. `shrinkage_acceleration` — compares 7-day shrinkage rate periods
  3. `staff_pattern_correlation` — cross-references variance + voids + same cashier
  4. `supplier_concentration` — flags single-supplier dependency
  5. `potency_degradation` — batch potency drop detection
  6. `purchase_limit_pattern` — customer approaching daily limit + high frequency
  7. `cross_branch_anomaly` — outlier detection across branches
- Created Cross-Domain Correlation Engine: detects patterns spanning multiple domains
- Created `DBCWorldModelProvider` with 6 hooks:
  - `useDBCWorldModel()`, `useRiskAlerts()`, `useStockIntelligence()`
  - `useStaffScores()`, `useBranchState(branchId?)`, `useWorldModelConfig()`
- Wired into App.jsx: `AuthProvider → CartProvider → WorldModelProvider → Router`
- **Commit**: `deab742` Inference engine + WorldModelProvider

---

## PHASE 7: CORE PAGE MIGRATION (P21-P22)

### P21 — POS React Migration
- Built complete POS in `pages/POS/`:
  - `POSPage.jsx` — main page with POSLayout
  - `TillManager.jsx` — open/close with SA denominations (R200→10c)
  - `ShiftManager.jsx` — clock in/out, breaks
  - `ProductBrowser.jsx` — 3-tier filter, quick-add, barcode scanning
  - `Cart.jsx` — items, quantities, totals
  - `PaymentProcessor.jsx` — cash/card/EFT/split, change calculation
  - `ReceiptGenerator.jsx` — print/download/email
  - `CustomerSearch.jsx` — search, walk-in toggle
  - `CashInOut.jsx` — cash movements
  - `hooks/useCart.js`, `hooks/useTill.js`, `hooks/useBarcode.js`
- World Model wired: every sale dispatches SALE_COMPLETED event
- Compliance Cascade integration: pre-sale purchase limit checks, batch CoA validation, Section 21 certification
- Identical functionality to vanilla pos.html
- **Commit**: `c6d48d5` POS React migration

### P22 — Owner 360View Command Centre
- Built 360View in `pages/Owner360/`:
  - `Owner360Page.jsx` — command centre layout
  - `BranchGrid.jsx` — all branches as cards, color-coded health (green/amber/red)
  - `BranchDrillDown.jsx` — click branch card for full detail
  - `LiveEventStream.jsx` — real-time events from ALL branches (WebSocket)
  - `ApprovalQueue.jsx` — all pending approvals, all branches, one-click approve/reject
  - `InsightsBar.jsx` — cross-branch intelligence (e.g., "Ormonde outselling Soweto 52%...")
  - `NetworkStatusBar.jsx` — branch online/offline indicators
  - `RiskHeatmap.jsx` — visual risk across all branches
  - `StockHealthMap.jsx` — network-wide stock health
  - `hooks/useAllBranches.js`, `hooks/useLiveEvents.js`, `hooks/useApprovals.js`
- Backend endpoints: `/owner/360/branches`, `/owner/360/events`, `/owner/360/approvals`, etc.
- WebSocket: `/api/v1/owner/360/live` for real-time
- **Commit**: `dcefd8d` Owner 360View command centre

---

## PHASE 8: SMART STOCK + RISK "WORLD FIRSTS" (P23-P25)

### P23 — Potency Degradation Engine (World First #1)
- Only active if `config.features.potencyDegradation.enabled === true`
- Created degradation models in `world-model/engines/potency.js`:
  - 5 product types: flower, concentrate, edible, oil_tincture, topical
  - Each with THC/CBD loss rates per month, terpene half-life
  - Environmental factors: temperature, humidity, light exposure
- `estimateCurrentPotency(batch, config)` → returns estimated vs original THC/CBD + confidence level
- FIFO Enhancement: sell fastest-degrading first (not just oldest)
- Dynamic pricing: auto-flag, suggest markdown, auto-create clearance voucher
- `PotencyBadge.jsx` — shows lab tested vs estimated current potency
- Backend: `/inventory/potency/estimate`, `/potency/alerts`, `/potency/markdown`, `/inventory/fifo/:productId`
- **Commit**: `e88334e` Potency degradation engine

### P24 — Predictive Stock Intelligence (World First #3)
- Only active if `config.features.smartStock.enabled === true`
- Created demand prediction engine in `world-model/engines/stock-intelligence.js`:
  - Cannabis-specific demand variables:
    1. Cannabinoid preference shifts
    2. Grow method trending (hydro vs organic vs outdoor)
    3. Section 21 vs Lifestyle ratio changes
    4. SA payday cycle awareness (25th and last day of month)
    5. Seasonal patterns
    6. New vs returning customer demand
- Intelligent reordering: supplier comparison, quality weighting, optimal batch size
- Inter-branch transfer intelligence: compare stock levels, cost comparison (transfer vs reorder)
- UI: `StockIntelligenceDashboard.jsx`, `ReorderSuggestions.jsx`, `TransferSuggestions.jsx`, `DemandChart.jsx`, `SubstitutionFinder.jsx`, `WastePreventionPanel.jsx`
- Backend: `/stock/predict/:productId`, `/stock/reorder-suggestions`, `/stock/auto-reorder`, `/stock/transfer-suggestions`, `/stock/transfer`, `/stock/substitutes/:productId`, `/stock/waste-prevention`
- **Commit**: `1445256` Predictive stock intelligence

### P25 — Cross-Domain Risk Scoring Engine (World First #2)
- Only active if `config.features.riskScoring.enabled === true`
- Created risk scoring engine in `world-model/engines/risk-scoring.js`:
  - 6 domain scorers: regulatory, financial, inventory, staff, operational, customer
  - Per-branch overrides applied automatically
  - Overall = weighted average of enabled domains
- 5 Cross-Domain Correlation Rules:
  1. `internal_theft_pattern` — high variance + specific cashier + product shrinkage (CRITICAL)
  2. `receiving_fraud` — stocktake discrepancy + supplier delivery discrepancy + same batch (CRITICAL)
  3. `diversion_risk` — customer hitting purchase limits + high frequency (WARNING)
  4. `unrecorded_loss` — revenue drop + stock stable + traffic normal (CRITICAL)
  5. `pricing_anomaly` — excessive discounts correlated with specific customers (WARNING)
- Staff Accountability Engine (World First #5) in `world-model/engines/staff-accountability.js`:
  - Metrics: tillAccuracy, voidRefundRatio, discountCompliance, speedConsistency, stocktakeAccuracy, clockInCompliance
  - Composite score 0-100 + positive reinforcement achievements
- UI: `RiskHeatmap.jsx`, `CrossDomainAlerts.jsx`, `StaffScoreBoard.jsx`, `RiskTrendChart.jsx`
- Backend: `/risk/branch/:branchId`, `/risk/network`, `/risk/cross-domain`, `/risk/staff/:staffId`, `/risk/staff/leaderboard`, `/risk/investigate`
- **Commit**: `73937e9` Cross-domain risk scoring

---

## PHASE 9: COMPLIANCE + REMAINING PAGES (P26-P27)

### P26 — Pre-Sale Compliance Cascade (World First #4)
- Only active if `config.features.complianceCascade.enabled === true`
- Created compliance engine in `world-model/engines/compliance-cascade.js`:
  - 5 pre-sale validation checks:
    1. **Purchase limit check** — daily gram limit enforcement
    2. **Batch CoA validation** — expired certificates block sale
    3. **Section 21 staff certification** — uncertified staff can't sell medical
    4. **Section 21 patient verification** — expired/missing prescription blocks medical items
    5. **Product recall check** — recalled products removed from sale
- POS integration: runs BEFORE payment processing, shows `ComplianceBlockModal`
- Audit trail: every check (pass/block) logged to `/compliance/log`
- UI: `ComplianceDashboard.jsx`, `DocumentTracker.jsx`, `AuditPackageGenerator.jsx`, `ComplianceTimeline.jsx`
- Backend: `/compliance/validate-sale`, `/compliance/audit-score`, `/compliance/expiring-docs`, `/compliance/audit-package`, `/compliance/section21/status`
- **Commit**: `9f8b96f` Pre-sale compliance cascade

### P27 — Remaining Page Migrations
- Migrated ALL remaining pages using same pattern as POS + Owner360:
  1. **Admin Dashboard** (`pages/Admin/AdminPage.jsx`) — 16 tabs, RBAC, module marketplace
  2. **Inventory Manager** (`pages/InventoryManager/InventoryManagerPage.jsx`) — catalog, batches, POs, potency badges, reorder suggestions, MDC Control Panel
  3. **Customer Dashboard** (`pages/Customer/CustomerPage.jsx`) — lifestyle + medical browsing, purchase limit widget, wellness points, Section 21 portal
  4. **Operations** (`pages/Operations/`):
     - `PackerPage.jsx`, `DispatchPage.jsx`, `SupplierPortalPage.jsx`
     - `StocktakePage.jsx`, `DriveThroughPage.jsx`, `WholesalePage.jsx`
- All pages: World Model hooks wired, mobile responsive, role-based access
- **Commit**: `37138aa` Remaining page migrations

---

## PHASE 10: BACKEND APIs FOR WORLD MODEL (P28-P29)

### P28 — World Model Config API + Sync
- Created `WorldModelConfig` MongoDB model with:
  - Feature toggles for all 6 features
  - Configurable thresholds (8 values with defaults)
  - Per-branch overrides map
  - Version tracking, updatedBy audit
- Config API endpoints:
  - `GET /config/world-model` — get current config (any authenticated user)
  - `PUT /config/world-model` — update config (Super Admin + Owner only)
  - `GET /config/world-model/history` — config change audit trail
  - `PUT /config/world-model/branch/:branchId` — branch-specific overrides
- Config change audit: every change logged with previousValue, newValue, reason
- Default config seeds with all features DISABLED on first deployment
- World Model state sync: `POST /world-model/sync` (rate limited: 1 per 30s per user)
- WebSocket via Socket.io: `/owner/360/live` namespace, room per branch
- **Commit**: `f5e981d` World Model config API + sync

### P29 — Risk + Stock Intelligence + Potency Backend
- Risk scoring endpoints (`routes/risk.js` + `controllers/risk.controller.js`):
  - `GET /risk/branch/:branchId`, `GET /risk/network`, `GET /risk/cross-domain`
  - `GET /risk/staff/:staffId`, `GET /risk/staff/leaderboard/:branchId`
  - `POST /risk/investigate`
- Stock intelligence endpoints (`routes/stock-intelligence.js` + `controllers/stock-intelligence.controller.js`):
  - `GET /stock/predict/:productId`, `GET /stock/reorder-suggestions`
  - `POST /stock/auto-reorder`, `GET /stock/transfer-suggestions`
  - `POST /stock/transfer`, `GET /stock/substitutes/:productId`
  - `GET /stock/waste-prevention`
- Potency endpoints (`routes/potency.js` + `controllers/potency.controller.js`):
  - `POST /inventory/potency/estimate`, `GET /inventory/potency/alerts`
  - `POST /inventory/potency/markdown`, `GET /inventory/fifo/:productId`
- Disabled features return 403 with message
- **Result**: 17 endpoints, 3 controllers — backend support for all World Model features
- **Commit**: `89f2514` Risk + stock + potency backend

---

## PHASE 11: SUPER ADMIN CONFIGURATION PANEL (P30-P35)

### P30 — Super Admin Config UI — Feature Toggles
- Created `pages/SuperAdmin/ConfigPage.jsx` — main config layout
- `FeatureToggles.jsx` — visual toggle cards for each World Model feature:
  - Potency Degradation Engine: auto-markdown, threshold, customer transparency
  - Cross-Domain Risk Scoring: per-domain toggles, alert threshold
  - Smart Stock Control: auto-reorder, inter-branch transfers, substitution, waste prevention
  - Staff Accountability: variance threshold, positive reinforcement, void/refund alert, streak alert
  - Compliance Cascade: pre-sale blocking, audit readiness alerts, document expiry warnings, auto recall removal
  - Demand Prediction: payday cycle, seasonal, cannabinoid trend, grow method
- Each card shows status: "Active on X/Y branches", "Last 30 days: N events"
- Config Preview: shows what will change before saving
- Impact Assessment: which branches affected, estimated impact
- Real-time propagation: all sessions refresh within 5 minutes
- **Commit**: `f5e981d` Super Admin config UI

### P31 — Threshold Tuning + Branch Overrides
- `ThresholdSettings.jsx` — interactive threshold tuning:
  - Slider + input field for each of 8 thresholds
  - Impact indicator: "Changing from R50 to R100 would have reduced alerts by 34%"
  - Reset to default button
  - Thresholds: tillVarianceAmber (R50), tillVarianceRed (R200), lowStockDays (7), criticalStockDays (3), potencyDropPercent (15%), supplierConcentration (60%), voidRefundFrequency (5), shiftVarianceStreak (3)
- `BranchOverrides.jsx` — per-branch threshold customization:
  - Select branch → table: Network Default | Branch Override | Edit
  - Use case: Ormonde new branch, temporarily higher variance thresholds during training
- Historical impact analysis: "If this threshold had been in effect last 30 days..."
- **Commit**: `c09bb20` Threshold tuning + branch overrides

### P32 — Config History + Audit Trail
- `ConfigHistory.jsx` — scrollable timeline of every config change:
  - Changed by, reason, specific value changes (diff view)
  - Revert capability: click "Revert this change" → confirmation → applies previous values
- Export: CSV or PDF for compliance/audit, date range filter
- Backend: `GET /config/world-model/history?from=&to=&limit=`, `POST /config/world-model/revert/:historyId`
- **Commit**: `06b2b0c` Config history + audit trail

### P33 — World Model E2E Integration Tests
- Full event cascade simulation:
  - Super Admin enables ALL features
  - Owner opens 360View
  - Staff opens POS → till → shift → sales → compliance blocks → potency badges → variance alerts
  - Owner approves PO from 360View queue
  - Inventory Manager sees reorder suggestions
  - Stock transfer suggestions for imbalanced branches
- Config change propagation tests
- Feature disable tests
- Branch override tests (Ormonde vs Soweto different thresholds)
- **Commit**: `21316e7` World Model E2E integration tests

### P34 — Performance Optimization
- World Model: `useMemo` for computed values, debounce rapid events, batch within 100ms window
- 360View: virtualized lists (react-window), only re-render changed branches, throttle WebSocket to 1fps
- API: config cached 5min, risk scores cached 30s, stock predictions cached 5min
- Bundle: code splitting per page (lazy-loaded chunks), tree-shake disabled features
- Targets: initial load < 200KB gzipped, 360View TTI < 3s, memory < 100MB with 5 branches
- **Commit**: `0b66836` Performance optimization

### P35 — Deployment + Parallel Running
- Build: React app builds to `/dist/`
- Express serves both:
  - `/api/*` → API routes (same as before)
  - `/app/*` → React SPA (new)
  - `/*` → vanilla HTML (existing)
- Shared auth: same JWT tokens for vanilla and React
- Feature flags for gradual rollout: `REACT_POS_ENABLED`, `REACT_ADMIN_ENABLED`, etc.
- Per-branch React rollout possible
- Rollback: disable `REACT_*_ENABLED` flags → vanilla continues from `/*` routes
- **Commit**: `be7d913` Deployment + parallel running

---

## PHASE 12: CUSTOMER-FACING STOREFRONT (P36-P41) — Beyond Master Prompts

### P36-P41 — React Storefront (Customer-Facing E-Commerce)
- 33 new files added to react-app/src/
- **Commit**: `b049f0c` Customer-facing React storefront

#### Storefront Components (12)
- `StorefrontNav.jsx` — sticky nav, scroll transparent→cream, hamburger menu
- `StorefrontFooter.jsx` — 4-column footer
- `CartDrawer.jsx` — 450px right-slide panel
- `AgeGateModal.jsx` — DOB age verification
- `ProductCard.jsx` — product grid card + add to cart
- `ProductFilters.jsx` — category, price, stock (mobile collapsible)
- `Pagination.jsx` — windowed page numbers
- `OrderCard.jsx` — expandable order with status badges
- `FAQAccordion.jsx` — expand/collapse FAQ
- `SearchOverlay.jsx` — full-screen live search
- `BreadCrumbs.jsx` — breadcrumb navigation
- `index.js` — barrel export

#### Storefront Layout
- `StorefrontLayout.jsx` — Nav + Footer + AgeGate + CartDrawer

#### Storefront Pages (15)
| Page | File | Features |
|---|---|---|
| Landing | `LandingPage.jsx` | Hero, stats, how it works, featured products, locations, CTA |
| About | `AboutPage.jsx` | Story, mission, values grid |
| Contact | `ContactPage.jsx` | Form → POST /leads |
| Locations | `LocationsPage.jsx` | 8 stores, province filter, search |
| Section 21 Info | `Section21InfoPage.jsx` | 7-step process, conditions, FAQ |
| Terms | `TermsPage.jsx` | Terms & conditions |
| Privacy | `PrivacyPage.jsx` | Privacy policy |
| Products | `ProductsPage.jsx` | Filters, search, sort, grid, pagination |
| Product Detail | `ProductDetailPage.jsx` | Image, cannabinoids, qty, related products |
| Cart | `CartPage.jsx` | Items, voucher, order summary |
| Checkout | `CheckoutPage.jsx` | Shipping, EFT payment (Capitec 2320619824 branch 470010) |
| Order Confirmation | `OrderConfirmationPage.jsx` | Order number, bank details, instructions |
| Register | `RegisterPage.jsx` | Form with validation |
| My Account | `MyAccountPage.jsx` | 6 tabs: overview/orders/points/section21/profile/support |
| Affiliate | `AffiliatePage.jsx` | Hero, signup/login, dashboard, commissions, FAQ |

#### Storefront Contexts
- `CartContext.jsx` — cart state, localStorage for anon, API sync for authenticated

#### Storefront Hooks
- `useProducts.js` — useProducts (list+filters) + useProduct (single)
- `useOrders.js` — customer order history
- `useVoucher.js` — voucher validation

#### Vanilla Match Fixes
- **Commit**: `d7a100f` Fix LandingPage to match vanilla — 3D step cards, location cards, scrollbar-hide
- **Commit**: `5bc3694` Vanilla-match all React storefront pages — 15 files rewritten to pixel-match HTML designs

---

## Git History (All Commits)

| Hash | Description |
|---|---|
| `8c92d87` | Initial commit: De Bud Chef (DBC) Platform |
| `68ee259` | DBC UAT Release — Stock, POS, Inventory, Stock Take PWA |
| `7ac0dc7` | Complete UAT features — audits, reports, wholesale, alerts |
| `0be5fff` | Transform POS to Odyssey-style layout |
| `64860fa` | Ormonde branch launch — stock take, OTP auth, product organization |
| `d68ab91` | Ormonde Live — POS, Stock Take, OCR Integration |
| `dd98029` | Till Session & Daily Cashup — Ormonde Launch Ready |
| `be27bd2` | P1: Route aggregator — consolidate 33 route mounts into routes/index.js |
| `739a34d` | P1: Extract POS controller — 30 handlers from 1,961 line route file |
| `bce00d7` | P1: Extract order controller — 22 handlers from 1,571 line route file |
| `8eadaa2` | P2: Tier 2 controller extraction — 6 route files to thin routers |
| `d97ecf9` | P3: Tier 3 controller extraction — 10 route files to thin routers |
| `bd26593` | P4: Tier 4 controller extraction — 17 remaining route files to thin routers |
| `4a00cc7` | P5+P6: Create shared frontend library and normalize across all HTML files |
| `c4e9b8a` | P8: Split admin.html → thin shell + 16 JS modules |
| `bcebfda` | P8: Split pos.html → thin shell + 7 JS modules |
| `b2a4a35` | P8: Split owner-dashboard.html → thin shell + 7 JS modules |
| `74713c3` | P8: Split inventory-manager-dashboard.html → thin shell + 8 JS modules |
| `b9b88a2` | P8: Split dashboard.html → thin shell + 7 JS modules |
| `f620eec` | P10: Split stocktake-app.html → thin shell + 5 JS modules |
| `14d8cac` | P12: Fix frontend deduplication — shared libs, dead code removal |
| `8672591` | P13: Delete legacy Loose Draw React files — all 4 DISCARD |
| `53b6df6` | P15: Scaffold React app alongside vanilla codebase |
| `f13b3a2` | P16: Shared component library — 16 UI components, 3 layouts, demo page |
| `9eb68c4` | P17: Auth + routing + role-based access for all 14 app routes |
| `632c597` | P18: World Model types + event bus — 30 events across 6 domains |
| `53ad7bd` | P19: World Model state reducer — 30-event handler, risk scoring, persistence |
| `deab742` | P20: Inference engine + WorldModelProvider — 7 risk patterns, 6 hooks |
| `c6d48d5` | P21: POS React migration — 12 components, 3 hooks, World Model wired |
| `dcefd8d` | P22: Owner 360View command centre — 8 components, 3 hooks |
| `e88334e` | P23: Potency degradation engine — 5 product models, FIFO priority, badge |
| `1445256` | P24: Predictive stock intelligence — demand, reorder, transfers, substitutes, waste |
| `73937e9` | P25: Cross-domain risk scoring — 6 domain scorers, 5 correlation rules, staff accountability |
| `9f8b96f` | P26: Pre-sale compliance cascade — 5 checks, block modal, audit package |
| `37138aa` | P27: Remaining page migrations — 9 dashboards, 4 directories |
| `f5e981d` | P28: World Model config API + sync — model, controller, 5 endpoints, WebSocket |
| `89f2514` | P29: Risk + stock + potency backend — 17 endpoints, 3 controllers |
| `c09bb20` | P31: Threshold tuning + branch overrides — impact preview, reset, inline editing |
| `06b2b0c` | P32: Config history + audit trail — revert, CSV export, date filter |
| `21316e7` | P33: World Model E2E integration tests |
| `0b66836` | P34: Performance optimization — event batching, code splitting, API caching |
| `be7d913` | P35: Deployment + parallel running — React SPA at /app/*, feature flags, rollback |
| `b049f0c` | P36-P41: Customer-facing React storefront — 33 new files |
| `d7a100f` | Fix LandingPage to match vanilla — 3D step cards, location cards |
| `5bc3694` | Vanilla-match all React storefront pages — 15 files rewritten |
| `bb800a7` | Full system commit — P1-P35 complete, MDC pipeline, stocktake vision, software spec |

---

## Complete File Inventory (118 files in react-app/src/)

### Root Files (3)
- `main.jsx` — App entry point
- `main.css` — Global CSS + animations (slideRight, fadeInUp, pulse, scrollbar-hide)
- `App.jsx` — Routes, providers (Auth, Cart, WorldModel), lazy loading

### Config (2)
- `config/index.js` — API_URL, formatCurrency, brand constants, DEV_MODE
- `config/roles.js` — 12 roles, hierarchy, permissions, redirects

### Services (1)
- `services/api.js` — Axios with JWT interceptors, token refresh

### Contexts (2)
- `contexts/AuthContext.jsx` — OTP auth, ProtectedRoute, useAuth, token management
- `contexts/CartContext.jsx` — Cart state, localStorage for anon, API sync for auth

### Layouts (4)
- `layouts/DashboardLayout.jsx` — Internal ops: sidebar + header + content
- `layouts/POSLayout.jsx` — Full-screen POS layout
- `layouts/PublicLayout.jsx` — Login/unauthorized pages
- `layouts/StorefrontLayout.jsx` — Nav + Footer + AgeGate + CartDrawer

### UI Components (16)
- `components/ui/ApprovalCard.jsx`, `Badge.jsx`, `BranchSelector.jsx`, `Button.jsx`
- `components/ui/Card.jsx`, `EmptyState.jsx`, `Header.jsx`, `Input.jsx`
- `components/ui/LoadingSpinner.jsx`, `Modal.jsx`, `Select.jsx`, `Sidebar.jsx`
- `components/ui/StatCard.jsx`, `Table.jsx`, `Tabs.jsx`, `Toast.jsx`

### Storefront Components (12)
- `components/storefront/StorefrontNav.jsx`, `StorefrontFooter.jsx`, `CartDrawer.jsx`
- `components/storefront/AgeGateModal.jsx`, `ProductCard.jsx`, `ProductFilters.jsx`
- `components/storefront/Pagination.jsx`, `OrderCard.jsx`, `FAQAccordion.jsx`
- `components/storefront/SearchOverlay.jsx`, `BreadCrumbs.jsx`, `index.js`

### Other Components (2)
- `components/ComplianceBlockModal.jsx` — Pre-sale compliance block
- `components/PotencyBadge.jsx` — THC/CBD potency indicator

### Hooks (5)
- `hooks/useAuth.js`, `hooks/useCart.js`
- `hooks/useProducts.js`, `hooks/useOrders.js`, `hooks/useVoucher.js`

### World Model (10)
- `world-model/WorldModelContext.jsx` — Provider + 6 hooks
- `world-model/types.js` — 30 event types across 6 domains
- `world-model/events.js` — Event bus (emit, subscribe, batch)
- `world-model/state.js` — State reducer, 30-event handler, persistence
- `world-model/inference.js` — 7 risk patterns, cross-domain correlation
- `world-model/engines/potency.js` — Potency degradation tracking
- `world-model/engines/stock-intelligence.js` — Demand prediction, reorder
- `world-model/engines/risk-scoring.js` — 6 domain scorers, 5 correlation rules
- `world-model/engines/compliance-cascade.js` — 5 pre-sale validation checks
- `world-model/engines/staff-accountability.js` — Staff performance scoring

### Pages — Internal Ops (52)
- **POS (12)**: POSPage, Cart, ProductBrowser, PaymentProcessor, CustomerSearch, ReceiptGenerator, ShiftManager, TillManager, CashInOut + 3 hooks
- **Owner 360 (15)**: Owner360Page, BranchGrid, BranchDrillDown, NetworkStatusBar, ApprovalQueue, CrossDomainAlerts, InsightsBar, LiveEventStream, RiskHeatmap, RiskTrendChart, StaffScoreBoard, StockHealthMap + 3 hooks
- **Smart Stock (7)**: StockIntelligenceDashboard, DemandChart, PotencyDashboard, ReorderSuggestions, SubstitutionFinder, TransferSuggestions, WastePreventionPanel
- **Compliance (4)**: ComplianceDashboard, ComplianceTimeline, DocumentTracker, AuditPackageGenerator
- **Super Admin (7)**: ConfigPage, FeatureToggles, ThresholdSettings, BranchOverrides, ConfigHistory, ConfigPreview + 1 hook
- **Operations (6)**: PackerPage, DispatchPage, SupplierPortalPage, StocktakePage, DriveThroughPage, WholesalePage
- **Other (4)**: AdminPage, InventoryManagerPage, CustomerPage, OwnerPage, LoginPage, UnauthorizedPage, ComponentDemo

### Pages — Storefront (15)
- LandingPage, AboutPage, ContactPage, LocationsPage, Section21InfoPage
- TermsPage, PrivacyPage, ProductsPage, ProductDetailPage
- CartPage, CheckoutPage, OrderConfirmationPage
- RegisterPage, MyAccountPage, AffiliatePage

---

## Route Map

### Storefront (public)
| Path | Component | Auth |
|---|---|---|
| / | → redirect /home | — |
| /home | LandingPage | — |
| /about | AboutPage | — |
| /contact | ContactPage | — |
| /locations | LocationsPage | — |
| /section21-info | Section21InfoPage | — |
| /terms | TermsPage | — |
| /privacy | PrivacyPage | — |
| /products | ProductsPage | — |
| /products/:id | ProductDetailPage | — |
| /cart | CartPage | — |
| /checkout | CheckoutPage | — |
| /order-confirmation | OrderConfirmationPage | — |
| /register | RegisterPage | — |
| /affiliate | AffiliatePage | — |
| /my-account | MyAccountPage | Login required |
| /customer | → redirect /my-account | — |

### Internal Ops (protected)
| Path | Component | Roles |
|---|---|---|
| /login | LoginPage | — |
| /pos | POSPage | Staff+ |
| /admin | AdminPage | Admin+ |
| /owner | OwnerPage | Owner+ |
| /owner/360 | Owner360Page | Owner+ |
| /inventory | InventoryManagerPage | Inventory roles |
| /packer | PackerPage | Admin+, Packer |
| /dispatch | DispatchPage | Admin+, Dispatch |
| /supplier | SupplierPortalPage | Admin+, Supplier |
| /stocktake | StocktakePage | Inventory roles |
| /drive-through | DriveThroughPage | Staff+ |
| /wholesale | WholesalePage | Admin+ |
| /config | ConfigPage | Owner+ |

---

## API Endpoints Summary

### Storefront
- `GET /products`, `GET /products/:id`, `GET /products/categories`
- `GET/POST/PUT/DELETE /cart/*`, `POST /cart/sync`
- `POST /vouchers/validate`
- `POST /orders/create`, `GET /orders/my-orders`, `GET /orders/:orderId`, `POST /orders/:orderId/upload-proof`
- `POST /auth/register`, `POST /leads`
- `GET /dashboard/stats`, `GET /dashboard/points`
- `GET /section21/status`, `POST /section21/upload`
- `POST /affiliate/register`, `POST /affiliate/login`, `GET /affiliate/dashboard`, `GET /affiliate/commissions`

### World Model Config
- `GET/PUT /config/world-model`
- `GET /config/world-model/history`
- `PUT /config/world-model/branch/:branchId`
- `POST /config/world-model/revert/:historyId`
- `POST /world-model/sync`

### Risk Scoring
- `GET /risk/branch/:branchId`, `GET /risk/network`, `GET /risk/cross-domain`
- `GET /risk/staff/:staffId`, `GET /risk/staff/leaderboard/:branchId`
- `POST /risk/investigate`

### Stock Intelligence
- `GET /stock/predict/:productId`, `GET /stock/reorder-suggestions`
- `POST /stock/auto-reorder`, `GET /stock/transfer-suggestions`
- `POST /stock/transfer`, `GET /stock/substitutes/:productId`
- `GET /stock/waste-prevention`

### Potency
- `POST /inventory/potency/estimate`, `GET /inventory/potency/alerts`
- `POST /inventory/potency/markdown`, `GET /inventory/fifo/:productId`

### Compliance
- `POST /compliance/validate-sale`, `GET /compliance/audit-score`
- `GET /compliance/expiring-docs`, `POST /compliance/audit-package`
- `GET /compliance/section21/status`

### Owner 360View
- `POST /owner/360/branches`, `GET /owner/360/events`
- `GET /owner/360/approvals`, `POST /owner/360/approve/:id`, `POST /owner/360/reject/:id`
- `GET /owner/360/insights`
- `WS /owner/360/live`

---

## Architecture Decisions
- **Auth**: OTP-based (email code), JWT tokens, 30-day expiry
- **Cart**: localStorage for anonymous, API sync for authenticated users
- **Routing**: All routes lazy-loaded via React.lazy + Suspense (Vite code splitting)
- **State**: World Model = custom event bus + reducer + inference (NOT Redux)
- **Styling**: TailwindCSS with DBC brand colors (cream, green, gold, red)
- **Providers**: BrowserRouter → AuthProvider → CartProvider → WorldModelProvider
- **Layout**: StorefrontLayout (public) vs DashboardLayout (internal ops)
- **Product visibility**: Anon = accessories/merchandise/apparel/gifts only; Auth = lifestyle; Section 21 = medical
- **Vanilla isolation**: Zero vanilla files modified — all React work in react-app/src/
- **Parallel running**: `/app/*` = React SPA, `/*` = vanilla HTML, same backend/database/tokens
- **Feature flags**: `REACT_*_ENABLED` env vars for gradual rollout per page per branch

## Brand Colors (Tailwind)
```
dbc-cream: #F4F0E6    dbc-green: #3A5F48      dbc-green-dark: #2A4635
dbc-green-deep: #1E3328   dbc-gold: #D4AF37   dbc-red: #A63429
```

## 5 World Firsts
1. **Potency Degradation Engine** — Cannabis-specific compound degradation tracking with FIFO priority and auto-markdown
2. **Cross-Domain Risk Scoring** — Correlate patterns across 6 operational domains to detect theft, fraud, diversion
3. **Predictive Stock Intelligence** — Cannabis-specific demand prediction with payday cycles, cannabinoid trends, inter-branch transfers
4. **Pre-Sale Compliance Cascade** — 5 pre-sale validation checks that block non-compliant sales in real-time
5. **Staff Accountability Intelligence** — Per-employee scoring across all metrics with positive reinforcement

---

**END OF CONTEXT DOCUMENT**
