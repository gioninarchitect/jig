# Origin Platform — System Context for Track & Trace

> **Purpose**: This document captures everything that exists in the Origin platform today, so a standalone Track & Trace system can be designed to integrate with it seamlessly.
>
> **Date**: 2026-03-22

---

## 1. Platform Overview

**Origin by ILCO Farming** is a multi-system cannabis retail and wholesale platform consisting of three applications on one server (`154.66.197.199` / `puregro.cleva-ai.co.za`):

| App | Stack | Port | Database | Purpose |
|-----|-------|------|----------|---------|
| **B2B Wholesale Portal** | Express/TypeScript + React 19 + Vite | 3002 | PostgreSQL | Business client ordering, intelligence, Telegram bot |
| **POS Multi-App** | Express/Node.js + Vanilla JS + React | 3008 | MongoDB | In-store retail, inventory, stocktake, staff |
| **Cultivation Dashboard** | Express/Node.js + Vanilla JS | 3005 | MongoDB | Farm management, zone/batch/harvest tracking |

nginx reverse-proxies all three behind a single domain with SSL.

---

## 2. Data Entities (What Exists Today)

### 2.1 Products (MongoDB — POS is source of truth)

| Field | Description |
|-------|-------------|
| name, sku | Product identity |
| category | `flower`, `pre_rolls`, `edibles`, `concentrates`, `vapes`, `accessories` |
| strainType | `sativa`, `indica`, `hybrid`, `na` |
| thcContent, cbdContent | Potency (percentage) |
| price, costPrice | Retail & cost pricing |
| wholesalePriceTiers | Bulk pricing brackets |
| mdcStage | Product lifecycle: `draft` → `review` → `live` → `discontinued` |
| growMethod | Indoor, outdoor, greenhouse |
| supplier | Reference to supplier |

**B2B reads products from POS** via an internal HTTP bridge (`POS_API_URL`).

### 2.2 Branches (MongoDB)

| Field | Description |
|-------|-------------|
| code | e.g. `PG-SUN`, `PG-OMD` |
| name | e.g. "Sunningdale", "Ormonde" |
| type | `retail`, `cafe`, `warehouse`, `hybrid`, `wholesale` |
| isHeadquarters | Boolean (Sunningdale = HQ) |
| suppliesBranches | Array of branch refs this location supplies |
| location | Full address + GPS coordinates |
| operatingHours | Per-day open/close |
| tills | Till config (speed point provider, device IDs) |
| salesTracks | `hasLifestyleTrack`, `hasMedicalTrack`, `hasCafeTrack` |

**Active branches**: Sunningdale (HQ), Ormonde, Ficksburg, Klerksdorp, Ladybrand, Mayfair, Rustenburg, Spruitview, Wonderboom.

### 2.3 Inventory (MongoDB)

- **BranchInventory**: Per-branch stock levels (product ref, quantity, reorderPoint, lastStockDate)
- **InterBranchTransfer**: From/to branch, items array, status (`requested` → `approved` → `in_transit` → `received` → `rejected`)
- **Batch**: Production batch tracking (batchNumber, product, quantity, expiryDate, testResults)

### 2.4 Cultivation (MongoDB)

| Model | Key Fields |
|-------|------------|
| **CultivationZone** | name, zoneType (veg/flower/mother/drying/processing), capacity, status |
| **CultivationBatch** | batchId, strain, zone, phase (`propagation` → `vegetative` → `flowering` → `harvest_ready` → `harvested` → `processing` → `complete`), plantCount, plantsDestroyed, phaseTransitions log, nutrientLog, pestLog, complianceChecklist |
| **HarvestRecord** | batch ref, harvestDate, wetWeight, dryWeight, trimWeight, wasteWeight, qualityGrade |
| **EnvironmentReading** | zone ref, temperature, humidity, co2Level, lightLevel, ph, timestamp |
| **ComplianceLog** | entity ref, action, details, timestamp, recordedBy |

### 2.5 Orders

**POS Orders (MongoDB)** — Retail walk-in sales:
- orderNumber, invoiceNumber, customer (name/email/phone)
- items array (product, SKU, price, qty, discount, tax, total)
- payment method, status, delivery tracking
- Status: `pending` → `confirmed` → `processing` → `shipped` → `delivered` → `cancelled`

**B2B Orders (PostgreSQL)** — Wholesale:
- Same status flow as POS
- Tiered pricing per client tier (standard/silver/gold/platinum)
- PO and Invoice numbering (auto-sequence, prefix "PureGro-")
- Proof of Payment (POP) upload workflow (pending → approved → rejected)
- VAT at 15%

### 2.6 Clients / B2B (PostgreSQL)

| Field | Description |
|-------|-------------|
| company_name, contact_person | Identity |
| email, phone | Contact |
| tier | `standard`, `silver`, `gold`, `platinum` |
| type | `dispensary`, `retailer`, `distributor`, `cafe`, `online_store` |
| status | `pending`, `active`, `suspended`, `churned` |
| payment_terms | `cod`, `net7`, `net14`, `net30` |
| credit_limit | ZAR amount |
| vat_number, registration_number | Compliance |

**Tier thresholds (LTV)**: Standard R0 → Silver R50k → Gold R150k → Platinum R500k+

### 2.7 Users / Staff (MongoDB)

- **Roles**: `user`, `supplier`, `packer`, `dispatch_manager`, `branch_assistant`, `inventory_manager`, `branch_manager`, `admin`, `owner`, `super_admin`
- Branch assignments (primary + multiple)
- Staff fields: employeeId, hireDate, department, supervisor
- PIN-based auth for POS, OTP-based for dashboards

### 2.8 Compliance & Verification

**Client Documents (PostgreSQL)**: CIPC registration, tax clearance, cannabis license, ID, proof of address, bank confirmation — admin review queue.

**Section 21 (MongoDB)**: Medical patient documents, prescription verification for medical-track products.

---

## 3. Existing Traceability Touchpoints

These are the places in the current system where product movement is already tracked (partially). A Track & Trace system would formalise and connect these:

### 3.1 Cultivation → Harvest
- `CultivationBatch` tracks plants from propagation through harvest
- `phaseTransitions` array logs every phase change with date + who recorded it
- `HarvestRecord` captures wet/dry/trim/waste weights + quality grade
- **Gap**: No formal "lot number" or regulatory tracking ID assigned at harvest

### 3.2 Harvest → Processing → Product
- Batches move to `processing` → `complete` phase
- **Gap**: No formal link between a CultivationBatch and the Product SKUs it becomes. This is the biggest missing link.

### 3.3 Product → Branch (Stock Allocation)
- `BranchInventory` tracks quantity per product per branch
- `InterBranchTransfer` tracks movement between branches (with approval flow)
- Stocktake system captures physical counts with photo evidence (GMP)
- **Gap**: No chain-of-custody or transport event log

### 3.4 Branch → Customer (Sale)
- POS `Sale` records capture: product, quantity, branch, staff member, timestamp, customer (if linked)
- B2B `Order` + `order_items` capture wholesale movement
- **Gap**: No lot/batch traceability on the receipt — you can't trace a sold item back to a specific cultivation batch

### 3.5 Destruction / Waste
- `CultivationBatch.plantsDestroyed` tracks destroyed plant count
- `HarvestRecord.wasteWeight` captures processing waste
- **Gap**: No formal destruction log with witness, reason, regulatory reference

---

## 4. API Surface (Integration Points for Track & Trace)

### 4.1 POS API (MongoDB, port 3008)

| Endpoint | Relevant Data |
|----------|---------------|
| `GET /api/v1/products` | Full product catalog with MDC stages |
| `GET /api/v1/branches` | All branches with inventory |
| `GET /api/v1/branches/:id/inventory` | Stock levels for a branch |
| `POST /api/v1/branches/transfer` | Inter-branch stock transfer |
| `GET /api/v1/stocktake/sessions` | Stocktake sessions + counts |
| `GET /api/v1/pos/sales` | POS transaction history |
| `GET /api/v1/cultivation/batches` | Cultivation batch data |
| `GET /api/v1/cultivation/harvests` | Harvest records |
| `GET /api/v1/cultivation/zones` | Growing zones |
| `GET /api/v1/batches` | Production batch data |

**Auth**: JWT token in `Authorization: Bearer` header. Internal calls use `X-Internal-Key`.

### 4.2 B2B API (PostgreSQL, port 3002)

| Endpoint | Relevant Data |
|----------|---------------|
| `GET /api/v1/products` | Wholesale catalog (proxied from POS) |
| `GET /api/v1/orders` | B2B order history |
| `GET /api/v1/clients` | Client list with tiers |
| `POST /api/v1/events/*` | Event emission (order placed, shipped, etc.) |
| `GET /api/v1/n8n/data/*` | Data feeds for automation |

### 4.3 WebSocket (POS, port 3008)

- Socket.io for real-time events (sales, stock changes, transfers)
- Namespace: default
- Events: `sale:completed`, `stock:updated`, `transfer:created`

### 4.4 n8n Webhook Integration

- 23 event types emitted to configurable n8n webhook URL
- Relevant for T&T: `order.created`, `order.confirmed`, `order.shipped`, `order.delivered`, `pop.uploaded`, `pop.approved`
- Fire-and-forget with `X-N8N-API-KEY` header

---

## 5. Authentication & Security

| Mechanism | System | Details |
|-----------|--------|---------|
| **OTP (email)** | Both | 6-digit code, 10-min expiry, 3 attempts, SMTP via mail.cleva-ai.co.za:465 |
| **JWT** | Both | 7-day expiry, stored in localStorage, revocable via token hash |
| **PIN** | POS | 6-digit staff PIN for quick POS login |
| **Admin detection** | B2B | Email in `ADMIN_EMAILS` env var |
| **Internal API key** | POS ↔ B2B | `X-Internal-Key` header for server-to-server calls |
| **Rate limiting** | Both | Per-endpoint (OTP: 3/60s, chat webhook: 100/hr) |

---

## 6. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Server** | Ubuntu on 154.66.197.199 |
| **Process Manager** | PM2 (3 processes) |
| **Reverse Proxy** | nginx with Certbot SSL |
| **B2B Backend** | Express 5 + TypeScript |
| **POS Backend** | Express + Node.js |
| **B2B Frontend** | React 19 + Vite + Tailwind |
| **POS Frontend** | Vanilla JS + React (dual) |
| **B2B Database** | PostgreSQL 16 |
| **POS Database** | MongoDB 7 (Mongoose 7.5) |
| **Job Queue** | Bull + Redis |
| **Real-time** | Socket.io |
| **Email** | Nodemailer (SMTP) |
| **Chat Bot** | Telegram API |
| **AI/Intelligence** | World Model (custom) + Anthropic Claude SDK |
| **Automation** | n8n (webhook integration) |
| **PDF Generation** | PDFKit |
| **Image Processing** | Sharp |
| **OCR** | Tesseract.js |
| **Payments** | Stripe |
| **SMS** | Twilio |

---

## 7. Deployment Structure

```
/var/www/origin/
├── b2b/                     # B2B Wholesale (TypeScript, PostgreSQL)
│   ├── dist/server/         # Compiled Express API
│   ├── dist/frontend/       # React SPA build
│   └── .env
├── pos/                     # POS Multi-App (Node.js, MongoDB)
│   ├── backend/
│   ├── frontend/
│   ├── react-app/dist/
│   └── .env
├── uploads/                 # POP PDFs, verification docs
└── nginx.conf
```

---

## 8. World Model & Intelligence (Relevant to T&T Analytics)

The system has a sophisticated event-sourced intelligence layer:

- **21 behavioral patterns** detected per client (bulk_buyer, seasonal, declining_orders, etc.)
- **11 intervention triggers** (reorder_reminder, churn_prevention, payment_chase, etc.)
- **Inference engine**: churn risk, restock prediction, payment risk, revenue forecast, product recommendations
- **Event bus**: All business events flow through a reducer that updates client world state

A Track & Trace system could feed into this world model — e.g., "batch quality declining" could trigger supply chain interventions.

---

## 9. User Roles & Who Would Use Track & Trace

| Role | Current Access | T&T Relevance |
|------|---------------|---------------|
| **super_admin** | Full system | Full T&T visibility, regulatory reporting |
| **owner** | Multi-branch oversight, B2B | Supply chain overview, compliance sign-off |
| **admin** | Branch operations | Branch-level trace queries |
| **inventory_manager** | Stock, batches, suppliers, compliance | Core T&T user — batch intake, stock movements |
| **branch_manager** | Single branch ops | Receiving verification, recall response |
| **branch_assistant** | POS terminal | Scan/verify at point of sale |
| **packer** | Order fulfillment | Lot assignment during packing |
| **dispatch_manager** | Delivery tracking | Chain-of-custody during transport |
| **supplier** | Product submission | Upstream batch/COA data entry |
| **user** (customer) | Browse, order | Scan QR to see product origin story |

---

## 10. Gaps That Track & Trace Must Fill

| # | Gap | Description |
|---|-----|-------------|
| 1 | **No lot/batch ID on products** | Products exist but aren't linked to specific cultivation batches or production lots |
| 2 | **No seed-to-sale chain** | Cultivation batches don't connect to finished product SKUs |
| 3 | **No transport/custody log** | Inter-branch transfers have approval but no GPS, timestamp, or handler trail |
| 4 | **No destruction register** | Plant destruction and waste disposal aren't formally logged with witnesses |
| 5 | **No recall mechanism** | No way to identify all locations/customers who received a specific batch |
| 6 | **No QR/barcode traceability** | No scannable identifier linking a physical product to its digital history |
| 7 | **No COA (Certificate of Analysis) storage** | Lab test results aren't formally stored per batch |
| 8 | **No regulatory reporting** | No SAHPRA/SAPS-format export for compliance |
| 9 | **No upstream supplier tracing** | Supplier batches/COAs aren't tracked inbound |
| 10 | **No customer-facing provenance** | End consumer can't verify product authenticity or origin |

---

## 11. What the Track & Trace System Should NOT Duplicate

The following already work well and should be consumed, not rebuilt:

- Product catalog (POS is source of truth)
- Branch management & locations
- User authentication (OTP + JWT)
- Order management (POS + B2B)
- Cultivation batch lifecycle (phases, zone tracking)
- Stock levels & inter-branch transfers
- Client intelligence & world model
- Notification infrastructure (email, Telegram, n8n)

---

## 12. Suggested Integration Pattern

```
                    ┌─────────────────────┐
                    │   TRACK & TRACE     │
                    │   (Standalone App)   │
                    │   Port: 300X        │
                    │   DB: PostgreSQL     │
                    └──────┬──────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ POS API  │ │ B2B API  │ │ Cult API │
        │ :3008    │ │ :3002    │ │ :3005    │
        │ MongoDB  │ │ Postgres │ │ MongoDB  │
        └──────────┘ └──────────┘ └──────────┘
```

**Communication**: Internal HTTP via `X-Internal-Key`, same pattern as existing POS ↔ B2B bridge.

**Shared auth**: Same JWT secret so T&T can validate existing tokens. Same `ADMIN_EMAILS` for admin access.

**Event flow**: T&T subscribes to existing n8n webhooks AND emits its own events (batch.created, lot.assigned, transfer.departed, transfer.arrived, recall.initiated, etc.)

---

## 13. Stocktake System (Deep Dive)

The stocktake system is a **GMP-compliant, PWA-enabled stock counting platform** with AI-powered photo verification. It's the closest existing system to Track & Trace and a key integration point.

### 13.1 Architecture

- **Frontend**: `stocktake-app.html` + `st-*.js` modules (vanilla JS PWA)
- **Backend**: `stocktake.controller.js` + `stocktake.js` routes
- **Service Worker**: `sw-stocktake.js` (offline counting support)
- **Manifest**: `manifest-stocktake.json` (standalone PWA)
- **Photo Storage**: `uploads/stocktake/st-{sessionId}-{timestamp}.{ext}`

### 13.2 Session Lifecycle

```
scheduled → in_progress → pending_review → approved / rejected
                                              ↓ (if approved + adjustInventory=true)
                                        BranchInventory updated
```

### 13.3 Session Schema

```
{
  sessionNumber: "ST-20260322-001",
  branchId, stockTakeType: "full" | "cycle" | "spot",
  categories: ["flower", "pre-rolls", ...],
  status: "scheduled" | "in_progress" | "pending_review" | "approved" | "rejected",
  lineItems: [LineItem],
  location: { latitude, longitude, accuracy },
  createdBy, startedAt, submittedBy, submittedAt,
  approvedBy, approvedAt,
  totalItems, itemsWithVariance, itemsRequiringReview
}
```

### 13.4 Line Item Schema

```
{
  productId, productName, sku, category,
  growMethod, productType, tags,
  expectedQty, actualQty, unit: "g" | "units",
  isCountable: boolean,
  variance, variancePercent, varianceAcceptable,
  validationStatus: "pending" | "valid" | "invalid",
  tareWeight, grossWeight,
  scalePhoto: { url, filename, uploadedAt },
  unitPhotos: [{ url, count, uploadedAt }],
  notes, countedBy: { firstName, lastName }, countedAt,
  ocrDetectedWeight, detectedCount
}
```

### 13.5 Quick Count Templates

| Template | Type | Categories |
|----------|------|------------|
| `daily-high-value` | Cycle count | flower, pre-rolls, concentrates |
| `weekly-medium` | Cycle count | edibles, oils, vapes |
| `full-count` | Full branch | All categories |
| `spot-check` | Spot verification | User-selected |

### 13.6 AI-Powered Photo Verification

| Photo Type | Method | Purpose |
|------------|--------|---------|
| **Scale photo** (weighable items) | Claude Vision OCR | Reads digital scale display, extracts weight + unit |
| **Unit photo** (countable items) | Claude Vision count | Counts individual items in photo, returns count + confidence |
| **Container photo** (optional) | Visual record | Documents jar/container for tare weight reference |

Upload endpoints:
- `POST /stocktake/session/:id/item/:idx/photo` — Scale/weight photo
- `POST /stocktake/session/:id/item/:idx/unit-photo` — Unit count photo

### 13.7 Compliance Monitoring

| Frequency | What's Counted | Trigger |
|-----------|---------------|---------|
| **Daily** | High-value (flower, pre-rolls, concentrates) | Every day |
| **Weekly** | Medium-value (edibles, oils, vapes) | Monday |
| **Monthly** | Full branch inventory | 1st of month |

Endpoints:
- `GET /stocktake/compliance/:branchId` — Per-branch compliance status
- `GET /stocktake/compliance/all-branches` — Network-wide compliance
- `GET /stocktake/shrinkage-trends/:branchId` — Variance trend analysis over N days

### 13.8 Validation Rules

- Weighable items: Scale photo **required**
- Countable items: Photo only required if variance >20%
- High variance (>5%): Notes **required**
- All items must have `actualQty` before submission
- Invalid items block submission

### 13.9 Receiving Module (Embedded)

The stocktake app has a "Receive Stock" tab for quick inbound logging:
- Search products, enter received quantities
- `POST /stock-transfers/quick-receive` — submits received items
- Updates BranchInventory on the backend

### 13.10 Offline Capabilities

- Service worker caches HTML, manifest, icons, fonts
- Background sync tag `'stocktake-sync'` for queued submissions
- Camera works offline (local capture)
- Falls back to cached user data if API unavailable
- Push notification support

### 13.11 T&T Integration Opportunities

The stocktake system is the natural point for Track & Trace to hook into:
- **Receiving**: When stock arrives at a branch, T&T could require scanning a lot/batch QR before accepting
- **Counting**: Variance data feeds directly into shrinkage/loss tracking
- **Photos**: Already GMP-compliant photo evidence — T&T could add lot-level photo linkage
- **Compliance**: Existing daily/weekly/monthly cadence could incorporate T&T verification checks

---

## 14. Role-Specific Dashboards (Every Screen in the System)

### 14.1 POS Terminal (`pos.html`)
**Roles**: branch_assistant, branch_manager

| Section | Features |
|---------|----------|
| **Login** | Email/PIN + OTP, branch selection modal |
| **Header** | Till status (open/closed), staff name, clock in/out button |
| **KPI Panel** (collapsible) | My Sales, Transactions, Items Sold, Avg Transaction |
| **Product Browser** | Category tabs (Flower, Edibles, Concentrates, Vapes, Oils, CBD, Accessories), grow method sub-filter (indoor/greendoor), product type sub-filter (pre-roll/pre-pack/loose), search bar, product grid |
| **Section 21 Verification** | Customer search, compliance status check, medical services verification |
| **Customer Selector** | Customer search/link, walk-in option, daily purchase limit warning (usage vs limit) |
| **Cart Panel** | Item list, subtotal/VAT/total, checkout button |
| **Payment Modal** | Tabs: Card (speedpoint ref), Cash (received + change calc), EFT (bank ref + proof upload), Split payment |
| **Open Shift Modal** | Opening float, till number, notes |
| **Close Shift Modal** | Cash summary, denomination counting (R200 down to 5c), variance calculation |
| **Day End Cashup** | Tabs: Status, Sales Summary, Cash Reconciliation, Cash Drops, Stock Reconciliation, History |
| **Quick Add Buttons** | Pre-roll, 1g, 3g rack, 5g bag |

**PWA**: manifest-pos.json, sw.js, offline-manager.js

---

### 14.2 Admin Dashboard (`admin.html`)
**Roles**: admin, super_admin

**Sidebar + Tab Navigation** (17 tabs):

| Tab | Features |
|-----|----------|
| **Inventory** | Category filters (Flower, Pre-Rolls, Vapes, Oils, Edibles, Accessories, Lifestyle, Morija Roastery, Thaba Cafe), stock table |
| **POS** | Transaction history, sales by category, till reconciliation |
| **Payments** | Sub-tabs: POS EFT, Membership, CSV Export; payment reconciliation |
| **Orders** | Order management, status tracking |
| **Wholesale** | B2B order management |
| **Users** | User CRUD, role assignment, access control |
| **Staff** | Staff directory, shift assignments, performance |
| **Payroll** | Salary processing, payment history |
| **Smart Ledger** | Financial reporting, journal entries |
| **Leads** | Lead pipeline, conversion tracking |
| **Marketing** | Campaign creation, content management |
| **Suppliers** | Supplier directory, performance metrics |
| **Purchase Orders** | PO creation and tracking |
| **Menu Boards** | Digital menu management, branch assignment |
| **Affiliates** | Affiliate program management (conditional) |
| **Vouchers** | Voucher CRUD, status filters (Active/Inactive/Expired) (conditional) |
| **Viral** | Sub-tabs: Campaigns, Influencers, Product Scores, Analytics (conditional) |

**External Links from Sidebar**: Inventory Manager Dashboard, P&D Dashboard, Branch Receiving, Wholesale POS

**Scripts**: admin-auth.js, admin-core.js, admin-payments.js, admin-pos.js, admin-pos-payments.js, admin-inventory.js, admin-users.js, admin-staff.js, admin-vouchers.js, admin-affiliates.js, admin-modules.js, admin-leads.js, admin-payroll.js, admin-ledger.js, admin-menu-boards.js, admin-advanced.js, admin-till-management.js, admin-viral-management.js

---

### 14.3 Owner Dashboard (`owner-dashboard.html`)
**Roles**: owner

| Section | Features |
|---------|----------|
| **Welcome** | Executive KPI summary |
| **Live Feed** | Real-time operational data, branch activity stream (WebSocket) |
| **Branches** | Multi-branch overview, drill-down, performance comparison |
| **Cameras** | CCTV feed integration, multi-camera view |
| **Approvals** | Pending order approvals, workflow status |
| **Wholesale Orders** | B2B order management |
| **Budget** | Budget allocation, financial limits |
| **Stock** | Network stock levels, transfer suggestions |
| **360 View** | Command centre: risk heatmap, staff scoreboard, stock health map |

**Sidebar Links**: POS Terminal, Inventory Manager, Stocktake App, P&D Dashboard, Branch Receiving, Admin Panel, Wholesale POS

**Scripts**: owner-auth.js, owner-core.js, owner-branches.js, owner-livefeed.js, owner-cameras.js, owner-reports.js, owner-approvals.js, owner-wholesale.js, owner-budget.js, owner-stock.js, owner-360view.js

---

### 14.4 Inventory Manager Dashboard (`inventory-manager-dashboard.html`)
**Roles**: inventory_manager

| Section | Features |
|---------|----------|
| **Inventory** | Real-time stock levels, product listing, adjustments, low stock alerts |
| **Stock Levels** | Detailed analysis, branch comparison, movement tracking |
| **Stocktake Compliance** | Compliance tracking, audit trails, variance reports |
| **Stocktake Reviews** | Historical stocktakes, approval workflow |
| **Purchase Orders** | Create/manage POs, delivery tracking, status (pending/ordered/received) |
| **Suppliers** | Supplier directory, performance metrics, payment terms |
| **Auto Reorder** | Reorder rules, threshold settings, automation status |
| **Reports** | Stock reports, movement analysis, variance reports, export |
| **Compliance** | Regulatory compliance, document tracking, audit logs |
| **MDC Control** | Master Digital Catalog management, product lifecycle, bulk ops |
| **Settings** | System configuration |

**Category Tabs**: All, Flower, Pre-Rolls, Concentrates, Edibles, Vapes, Lifestyle, Accessories
**Branch Tabs**: Branch selector with filtering for stocktake views

**Scripts**: inv-auth.js, inv-core.js, inv-inventory.js, inv-mdc.js, inv-purchase-orders.js, inv-suppliers.js, inv-reorder.js, inv-stocktake.js, inv-reports.js, inv-compliance.js

---

### 14.5 Cultivation Dashboard (`cultivation-dashboard.html`)
**Roles**: cultivation_manager / grow_master

| Section | Features |
|---------|----------|
| **Overview** | Active batches count, growth stage breakdown, health indicators |
| **Zones** | Growing zone management, assignment, environmental conditions per zone |
| **Environment** | Temperature, humidity, light cycles, real-time sensor data |
| **Batches** | Batch creation/tracking, growth stage management, yield projections |
| **Harvest** | Harvest scheduling, yield tracking, post-harvest/curing management |
| **Compliance** | Regulatory compliance, documentation, audit trails, licensing |
| **Reports** | Yield reports, environmental analysis, compliance reports |

**Data Models**: CultivationBatch, CultivationZone, EnvironmentReading, HarvestRecord, ComplianceLog

**Scripts**: cult-auth.js, cult-core.js, cult-overview.js, cult-zones.js, cult-environment.js, cult-batches.js, cult-harvest.js, cult-compliance.js, cult-reports.js

---

### 14.6 Customer Dashboard (`dashboard.html`)
**Roles**: user (customer/member)

| Tab | Features |
|-----|----------|
| **Overview** | Dashboard home, profile summary, KPIs |
| **Lifestyle** | Lifestyle products catalog |
| **Medical** | Medical products (locked unless Section 21 authorized), medical badge |
| **Health** | Health-related services/products |
| **Points** | Loyalty points balance, rewards catalog, history |
| **Orders** | Order history, tracking, reorder |
| **Account** | Profile settings, address management, logout |

**Cart Sidebar**: Active cart display, quick checkout
**Scripts**: dash-core.js, dash-user.js, dash-orders.js, dash-products.js, dash-section21.js, dash-cart.js, dash-points.js

---

### 14.7 Packer App (`packer-app.html`)
**Roles**: packer

| Section | Features |
|---------|----------|
| **Stats Bar** | Pending, In Progress, Completed Today |
| **Packing Queue** | Order cards with: order ID, status badge, item list |
| **Per-Order Actions** | Start Packing, Complete Packing |
| **Photo Capture** | Before/after photos of packed orders (back camera) |

**API**: Fetches `GET /orders/all?status=confirmed,processing`, calls start-packing / complete-packing endpoints
**PWA**: sw-packer.js, manifest-packer.json, auto-refresh every 30s

---

### 14.8 Dispatch App (`dispatch-app.html`)
**Roles**: dispatch_manager

| Section | Features |
|---------|----------|
| **Stats Bar** | Ready, Out for Delivery, Collection, Delivered |
| **Order Tabs** | Filter by: Ready, Out, Collection, Delivered |
| **Order Cards** | Customer info (name, address, phone), delivery type badge, items list |
| **Actions** | Call customer, Start Delivery, Mark Complete |
| **Branch Distribution** | Branch-specific stats (pending transfers, in transit, completed), low stock indicators, transfer management modal |

**PWA**: sw-dispatch.js, manifest-dispatch.json

---

### 14.9 Supplier Portal (`supplier-portal.html`)
**Roles**: supplier

| Tab | Features |
|-----|----------|
| **Orders** | Current/historical purchase orders |
| **Quotes** | Quote management and history |
| **Invoices** | Invoice history and PDF access |
| **Shipments** | Delivery tracking |
| **Documents** | Compliance/regulatory document upload |
| **Performance** | Supplier ratings and metrics |

**Order Statuses**: Pending, Approved, Submitted, Ordered, Received, Rejected, Expired

---

### 14.10 Wholesale POS (`wholesale-pos.html`)
**Roles**: admin, owner (B2B sales)

**Split-panel interface**:

| Panel | Features |
|-------|----------|
| **Left — Order** | Customer selector (dropdown + credit limit + usage), order items with qty controls, subtotal/tax/total, Quote / Order / Clear buttons |
| **Right — Products** | Search bar, category filter, product cards with retail price (strikethrough) + wholesale price (gold), stock indicator |

---

### 14.11 Drive-Through Staff (`drive-through-staff.html`)
**Roles**: branch_assistant (drive-through station)

| Section | Features |
|---------|----------|
| **Header Stats** | Queue status, wait time, processing rate |
| **Queue Grid** | Order cards with visual status: In Queue (yellow), Preparing (blue), Ready (green), Arrived (purple) |
| **Order Cards** | Customer name, items, qty, special instructions, Section 21 warning badge |
| **Actions** | Prep Order, Ready, Cancel, Call Customer, Add Notes |
| **Verification Modal** | Compliance checkboxes, item confirmation, special requirements |

**Real-time**: WebSocket (websocket-client.js) for live queue updates, status broadcasts, arrival notifications

---

### 14.12 Stocktake App (`stocktake-app.html`)
**Roles**: inventory_manager, branch_manager, branch_assistant (assigned)

| Section | Features |
|---------|----------|
| **Auth** | OTP login with PIN fallback |
| **Session Selection** | Active sessions, scheduled sessions, quick templates |
| **Stock Take Tab** | Card view (detailed) or Batch mode (rapid entry), category hierarchy filtering, fuzzy search with aliases, progress bar (completed/photos/variances) |
| **Receive Stock Tab** | Product search, quantity entry, batch submit |
| **Camera Modal** | Live video capture (1920x1080), scale OCR, unit counting, accept/retake buttons |
| **Item Cards** | Expected vs actual, variance %, scale photo, unit photos, notes, tare/gross weight, validation status |
| **Submit** | Confirmation modal, sends to pending_review |
| **Export** | CSV download of all items and variances |

**PWA**: sw-stocktake.js, manifest-stocktake.json, background sync, push notifications

---

### 14.13 Additional Operational Pages

| Page | Role | Purpose |
|------|------|---------|
| `pnd-dashboard.html` | admin | Payment notification dashboard |
| `branch-onboarding-checklist.html` | admin, owner | New branch setup wizard |
| `branch-receiving.html` | branch_manager | Inbound shipment receiving with discrepancy detection |
| `bug-dashboard.html` / `bug-kanban.html` | admin | Issue tracking |
| `training-hub.html` | all staff | Training modules portal |
| `pos-training.html` | branch_assistant | POS-specific training |
| `training-stocktake.html` | inventory_manager | Stocktake training |
| `training-inventory-manager.html` | inventory_manager | Inventory training |
| `uat-hub.html` / `uat-testing.html` | admin | UAT test management |
| `patient-onboarding.html` | admin | Medical patient Section 21 signup |
| `sop-operations.html` | all staff | Standard Operating Procedures |
| `staff-handbook.html` | all staff | Staff manual |

---

## 15. Summary: What T&T Sees When It Looks at the Platform

```
CULTIVATION          WAREHOUSE/HQ           BRANCHES (x9)          CUSTOMERS
 ┌──────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────┐
 │ Zones    │──────>│ Products     │──────>│ Branch       │──────>│ POS Sale │
 │ Batches  │ ???   │ (MDC)       │ Inter- │ Inventory    │ Sale  │ B2B Order│
 │ Harvests │       │ Batch       │ Branch │ Stocktake    │       │ Receipt  │
 │ Env Data │       │ Inventory    │ Xfer   │ Receiving    │       │          │
 └──────────┘       └──────────────┘       └──────────────┘       └──────────┘
      │                    │                      │                      │
      │              ??? = MISSING LINK            │                      │
      │         (batch → product connection)       │                      │
      │                                           │                      │
      └───── Track & Trace fills all the ??? ─────┘──────────────────────┘
```

The platform has rich data at every node (cultivation, warehouse, branch, customer) but **no formal chain connecting them**. The stocktake system provides the closest existing infrastructure for physical verification, and each role dashboard already has the UI patterns and auth flows that T&T can mirror.

---

*This document should be updated as the Track & Trace system is designed and built.*
