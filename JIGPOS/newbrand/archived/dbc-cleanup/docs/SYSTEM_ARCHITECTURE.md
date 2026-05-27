# De Bud Chef - Complete System Architecture

## System Flow Diagram

```mermaid
flowchart TB
    subgraph SOURCING["STAGE 1: SOURCING"]
        FARMER[("Farmer<br/>Upload Harvest")]
        SUPPLIER[("Supplier<br/>Upload Products")]
    end

    subgraph QA["STAGE 2: QUALITY ASSURANCE"]
        QA_DASH["QA Dashboard<br/>qa-dashboard.html"]
        QA_TEST{{"Lab Testing<br/>Potency/Contaminants"}}
        QA_APPROVE["APPROVED"]
        QA_REJECT["REJECTED"]
    end

    subgraph INVENTORY["STAGE 3: INVENTORY MANAGEMENT"]
        INV_DASH["Inventory Manager Dashboard<br/>inventory-manager-dashboard.html"]
        MDC[("MDC<br/>Master Data Catalog")]
        TRACK_TAG["Track Tagging<br/>Section 21 / Lifestyle"]
        PRICING["Network Pricing"]
        ACTIVATE["Activate on Network"]
    end

    subgraph PND["STAGE 4: PACKAGING & DISTRIBUTION"]
        PND_DASH["PND Dashboard<br/>pnd-dashboard.html"]
        PACKER["Packer<br/>Pick & Pack Only"]
        DISPATCH["Dispatch Manager<br/>Dispatch Only"]
        PHOTO_BEFORE["Photo: Before Pack"]
        PHOTO_AFTER["Photo: After Pack"]
        PHOTO_HANDOFF["Photo: Courier Handoff"]
    end

    subgraph DISTRIBUTION["STAGE 5: STOCK DISTRIBUTION"]
        TRANSFER["Transfer Order"]
        COURIER["Courier/Logistics"]
    end

    subgraph BRANCHES["STAGE 6: BRANCH OPERATIONS"]
        subgraph ORMONDE["ORMONDE HQ"]
            ORM_RECEIVE["Branch Receiving"]
            ORM_POS["POS Terminal"]
            ORM_STOCK[("Branch Stock")]
        end
        subgraph SPRUITVIEW["SPRUITVIEW"]
            SPR_RECEIVE["Branch Receiving"]
            SPR_POS["POS Terminal"]
            SPR_STOCK[("Branch Stock")]
        end
        subgraph OTHER["OTHER 6 BRANCHES"]
            OTHER_RECEIVE["Branch Receiving"]
            OTHER_POS["POS Terminal"]
            OTHER_STOCK[("Branch Stock")]
        end
    end

    subgraph SALES["STAGE 7: CUSTOMER SALES"]
        WALKIN["Walk-in Customer"]
        ONLINE["Online Order"]
        PAYMENT["Payment<br/>Cash/EFT/Card"]
        INVOICE["Invoice Generation"]
        RECEIPT["Receipt"]
    end

    subgraph OVERSIGHT["OWNER OVERSIGHT"]
        OWNER_DASH["Owner Dashboard"]
        REPORTS["Reports & Analytics"]
        ALERTS["Low Stock Alerts"]
    end

    %% Flow Connections
    FARMER --> QA_DASH
    SUPPLIER --> QA_DASH
    QA_DASH --> QA_TEST
    QA_TEST --> QA_APPROVE
    QA_TEST --> QA_REJECT
    QA_REJECT -.->|Notify| FARMER
    QA_REJECT -.->|Notify| SUPPLIER

    QA_APPROVE --> INV_DASH
    INV_DASH --> TRACK_TAG
    TRACK_TAG --> MDC
    INV_DASH --> PRICING
    PRICING --> MDC
    MDC --> ACTIVATE

    ACTIVATE --> PND_DASH
    PND_DASH --> PACKER
    PACKER --> PHOTO_BEFORE
    PHOTO_BEFORE --> PHOTO_AFTER
    PHOTO_AFTER --> DISPATCH
    DISPATCH --> PHOTO_HANDOFF

    PHOTO_HANDOFF --> TRANSFER
    TRANSFER --> COURIER

    COURIER --> ORM_RECEIVE
    COURIER --> SPR_RECEIVE
    COURIER --> OTHER_RECEIVE

    ORM_RECEIVE --> ORM_STOCK
    SPR_RECEIVE --> SPR_STOCK
    OTHER_RECEIVE --> OTHER_STOCK

    ORM_STOCK --> ORM_POS
    SPR_STOCK --> SPR_POS
    OTHER_STOCK --> OTHER_POS

    WALKIN --> ORM_POS
    WALKIN --> SPR_POS
    WALKIN --> OTHER_POS
    ONLINE --> PAYMENT

    ORM_POS --> PAYMENT
    SPR_POS --> PAYMENT
    OTHER_POS --> PAYMENT

    PAYMENT --> INVOICE
    PAYMENT --> RECEIPT

    ORM_STOCK -.->|Low Stock| ALERTS
    SPR_STOCK -.->|Low Stock| ALERTS
    OTHER_STOCK -.->|Low Stock| ALERTS
    ALERTS --> OWNER_DASH

    ORM_POS -.->|Sales Data| REPORTS
    SPR_POS -.->|Sales Data| REPORTS
    OTHER_POS -.->|Sales Data| REPORTS
    REPORTS --> OWNER_DASH
```

## Role Access Matrix

```mermaid
graph LR
    subgraph ROLES["USER ROLES"]
        OWNER["owner"]
        ADMIN["admin"]
        INV_MGR["inventory_manager"]
        STAFF_MGR["branch_manager"]
        STAFF_ASST["branch_assistant"]
        PACKER_R["packer"]
        DISPATCH_R["dispatch_manager"]
    end

    subgraph DASHBOARDS["DASHBOARDS"]
        ADMIN_DASH["Admin Dashboard<br/>admin.html"]
        MDC_CTRL["MDC Control Panel<br/>inventory-manager-dashboard.html"]
        PND_D["PND Dashboard<br/>pnd-dashboard.html"]
        BRANCH_REC["Branch Receiving<br/>branch-receiving.html"]
    end

    subgraph ADMIN_TABS["ADMIN TABS"]
        TAB_INV["Inventory"]
        TAB_POS["POS"]
        TAB_PAY["Payments"]
        TAB_AFF["Affiliates"]
        TAB_VOUCH["Vouchers"]
        TAB_ORD["Orders"]
        TAB_USERS["Users"]
        TAB_STAFF["Staff"]
        TAB_LEADS["Leads"]
    end

    %% Owner - Full Access
    OWNER --> ADMIN_DASH
    OWNER --> MDC_CTRL
    OWNER --> PND_D
    OWNER --> BRANCH_REC
    OWNER --> TAB_INV
    OWNER --> TAB_POS
    OWNER --> TAB_PAY
    OWNER --> TAB_AFF
    OWNER --> TAB_VOUCH
    OWNER --> TAB_ORD
    OWNER --> TAB_USERS
    OWNER --> TAB_STAFF
    OWNER --> TAB_LEADS

    %% Admin - Admin Panel Only, No MDC
    ADMIN --> ADMIN_DASH
    ADMIN --> TAB_INV
    ADMIN --> TAB_POS
    ADMIN --> TAB_PAY
    ADMIN --> TAB_AFF
    ADMIN --> TAB_VOUCH
    ADMIN --> TAB_ORD
    ADMIN --> TAB_USERS
    ADMIN --> TAB_STAFF
    ADMIN --> TAB_LEADS

    %% Inventory Manager
    INV_MGR --> ADMIN_DASH
    INV_MGR --> MDC_CTRL
    INV_MGR --> PND_D
    INV_MGR --> BRANCH_REC
    INV_MGR --> TAB_INV
    INV_MGR --> TAB_ORD

    %% Staff Manager
    STAFF_MGR --> ADMIN_DASH
    STAFF_MGR --> BRANCH_REC
    STAFF_MGR --> TAB_INV
    STAFF_MGR --> TAB_POS
    STAFF_MGR --> TAB_PAY
    STAFF_MGR --> TAB_ORD
    STAFF_MGR --> TAB_STAFF
    STAFF_MGR --> TAB_LEADS

    %% Staff Assistant
    STAFF_ASST --> ADMIN_DASH
    STAFF_ASST --> TAB_POS

    %% Packer
    PACKER_R --> ADMIN_DASH
    PACKER_R --> PND_D
    PACKER_R --> TAB_ORD

    %% Dispatch Manager
    DISPATCH_R --> ADMIN_DASH
    DISPATCH_R --> PND_D
    DISPATCH_R --> TAB_ORD
```

## Data Models

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER ||--o{ SALE : processes
    USER }|--|| BRANCH : "assigned to"

    BRANCH ||--o{ BRANCH_INVENTORY : has
    BRANCH ||--o{ SALE : "occurs at"
    BRANCH ||--o{ TRANSFER_ORDER : "receives from"
    BRANCH ||--o{ TRANSFER_ORDER : "sends to"

    PRODUCT ||--o{ BRANCH_INVENTORY : "stocked at"
    PRODUCT ||--o{ ORDER_ITEM : "in order"
    PRODUCT ||--o{ SALE_ITEM : "in sale"
    PRODUCT }|--|| QA_TEST : "tested by"

    SUPPLIER ||--o{ PRODUCT : supplies
    SUPPLIER ||--o{ QA_TEST : "submits for"

    ORDER ||--|{ ORDER_ITEM : contains
    ORDER ||--o{ PAYMENT : "paid via"
    ORDER ||--o| INVOICE : generates

    SALE ||--|{ SALE_ITEM : contains
    SALE ||--o{ PAYMENT : "paid via"
    SALE ||--o| RECEIPT : generates

    TRANSFER_ORDER ||--|{ TRANSFER_ITEM : contains
    TRANSFER_ORDER ||--o{ PHOTO_DOC : "documented by"

    USER {
        string email
        string password
        string role
        ObjectId primaryBranch
        array assignedBranches
        boolean section21Approved
    }

    BRANCH {
        string name
        string code
        string address
        boolean isHQ
        boolean isActive
    }

    PRODUCT {
        string name
        string sku
        string track
        number price
        string category
        object inventory
        array branchInventory
    }

    SALE {
        string saleNumber
        ObjectId branchId
        ObjectId cashierId
        string track
        array items
        array payments
        string status
        string paymentStatus
    }

    TRANSFER_ORDER {
        string orderId
        ObjectId fromBranch
        ObjectId toBranch
        array items
        string status
        ObjectId packedBy
        ObjectId dispatchedBy
        ObjectId receivedBy
        object photos
    }

    QA_TEST {
        ObjectId batchId
        ObjectId supplierId
        ObjectId testedBy
        object results
        string status
        string certificateUrl
    }
```

## API Endpoints Structure

```mermaid
graph TB
    subgraph AUTH["/api/v1/auth"]
        AUTH_LOGIN["POST /login"]
        AUTH_REG["POST /register"]
        AUTH_ME["GET /me"]
        AUTH_LOGOUT["POST /logout"]
    end

    subgraph PRODUCTS["/api/v1/products"]
        PROD_LIST["GET / - List products"]
        PROD_GET["GET /:id - Get product"]
        PROD_CREATE["POST / - Create product"]
        PROD_UPDATE["PUT /:id - Update product"]
        PROD_DELETE["DELETE /:id - Delete product"]
    end

    subgraph POS["/api/v1/pos"]
        POS_SALE["POST /sale - Create sale"]
        POS_SALES["GET /sales - List sales"]
        POS_APPROVE["POST /payment/:id/approve"]
        POS_RECEIPT["GET /sale/:id/receipt"]
    end

    subgraph ORDERS["/api/v1/orders"]
        ORD_LIST["GET / - List orders"]
        ORD_GET["GET /:id - Get order"]
        ORD_CREATE["POST / - Create order"]
        ORD_UPDATE["PUT /:id - Update order"]
        ORD_INVOICE["GET /:id/invoice"]
    end

    subgraph BRANCHES["/api/v1/branches"]
        BR_LIST["GET / - List branches"]
        BR_GET["GET /:id - Get branch"]
        BR_STOCK["GET /:id/inventory"]
        BR_UPDATE["PUT /:id - Update branch"]
    end

    subgraph TRANSFERS["/api/v1/transfers"]
        TR_LIST["GET / - List transfers"]
        TR_CREATE["POST / - Create transfer"]
        TR_UPDATE["PUT /:id - Update status"]
        TR_RECEIVE["POST /:id/receive"]
        TR_PHOTO["POST /:id/photo"]
    end

    subgraph USERS["/api/v1/users"]
        USR_LIST["GET / - List users"]
        USR_GET["GET /:id - Get user"]
        USR_CREATE["POST / - Create user"]
        USR_UPDATE["PUT /:id - Update user"]
    end
```

## Dashboard Status

| Dashboard | File | Status | Roles | API Connected |
|-----------|------|--------|-------|---------------|
| Admin Panel | admin.html | COMPLETE | All staff | YES |
| MDC Control | inventory-manager-dashboard.html | UI DONE | owner, inventory_manager | NEEDS API |
| PND | pnd-dashboard.html | UI DONE | owner, inventory_manager, packer, dispatch_manager | NEEDS API |
| Branch Receiving | branch-receiving.html | UI DONE | owner, inventory_manager, branch_manager | NEEDS API |
| Owner Dashboard | owner-dashboard.html | NOT BUILT | owner | - |
| Supplier Portal | supplier-portal.html | NOT BUILT | supplier, farmer | - |
| QA Dashboard | qa-dashboard.html | NOT BUILT | qa_officer | - |

## ZayaHealth vs DBC Comparison

### What ZayaHealth Has (That DBC Needs)

| ZayaHealth Dashboard | DBC Equivalent | Status | Priority |
|---------------------|----------------|--------|----------|
| Farm Management | supplier-portal.html | NOT BUILT | Phase 2 |
| QA Compliance | qa-dashboard.html | NOT BUILT | Phase 2 |
| GMP Partner | PND Dashboard | ADAPTED | Done |
| MDC Inventory Manager | inventory-manager-dashboard.html | COPIED | Done |
| Delivery Logistics | (not planned) | - | Phase 3 |
| Financial/CFO | owner-dashboard.html | NOT BUILT | Phase 2 |
| Pharmacist | (not applicable - DBC is retail) | - | - |
| Doctor Assistant | (not applicable) | - | - |
| Patient B2C Store | index.html (public store) | EXISTS | Done |
| Store B2B Wholesale | (not applicable - DBC owns stores) | - | - |
| Admin Dashboard | admin.html | EXISTS | Done |

### Key Features to Adopt from ZayaHealth

1. **Zero Hardcoded Data** - All data from API/database
2. **Collapsible Sidebar Navigation** - Done in admin.html
3. **Real-time WebSocket Updates** - NOT YET in DBC
4. **5-Bubble Chat System** - For delivery communication - NOT YET
5. **6-Gate Onboarding** - For supplier verification - Phase 2
6. **CFO Wallet Approval** - Payment approval workflow - PARTIAL (EFT approval exists)

---

## PWA Apps Required (Photo Proof Roles)

```mermaid
flowchart TB
    subgraph PWA_APPS["PWA APPS NEEDED"]
        subgraph PACKER_PWA["PACKER PWA"]
            P1["Receive picking list"]
            P2["Photo: BEFORE packing"]
            P3["Pick products from shelf"]
            P4["Pack securely"]
            P5["Photo: AFTER packing"]
            P6["Label package"]
            P7["Mark complete"]
        end

        subgraph DISPATCH_PWA["DISPATCH MANAGER PWA"]
            D1["Verify package contents"]
            D2["Assign courier/driver"]
            D3["Photo: COURIER HANDOFF"]
            D4["Record courier details"]
            D5["Mark dispatched"]
        end

        subgraph RECEIVER_PWA["BRANCH RECEIVER PWA"]
            R1["Notification: shipment incoming"]
            R2["Photo: PACKAGE RECEIVED"]
            R3["Count verification"]
            R4["Report discrepancies"]
            R5["Accept into branch stock"]
        end

        subgraph DRIVER_PWA["DELIVERY DRIVER PWA"]
            DR1["Pickup confirmation"]
            DR2["GPS tracking"]
            DR3["Photo: DELIVERY PROOF"]
            DR4["Customer signature"]
            DR5["Complete delivery"]
        end
    end

    P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7
    P7 --> D1
    D1 --> D2 --> D3 --> D4 --> D5
    D5 --> DR1
    DR1 --> DR2 --> DR3 --> DR4 --> DR5
    DR5 --> R1
    R1 --> R2 --> R3 --> R4 --> R5
```

### Photo Documentation Points (Fraud Prevention)

| Stage | Role | Photo Required | Purpose |
|-------|------|---------------|---------|
| 1. Before Packing | packer | YES | Verify products before pack |
| 2. After Packing | packer | YES | Verify sealed package |
| 3. Courier Handoff | dispatch_manager | YES | Chain of custody to courier |
| 4. Delivery Proof | driver | YES | Proof of delivery to branch |
| 5. Package Received | branch_manager | YES | Branch confirms receipt |

### PWA Technical Requirements

```
Each PWA App Must Have:
├── Offline capability (service worker)
├── Camera access for photos
├── GPS location (for driver app)
├── Push notifications
├── Session persistence
├── Role-locked functionality
└── Real-time sync when online
```

---

## Missing API Endpoints (To Build)

### Transfer Orders API
```
POST   /api/v1/transfers              - Create transfer order
GET    /api/v1/transfers              - List transfer orders (filter by status, branch)
GET    /api/v1/transfers/:id          - Get transfer order details
PUT    /api/v1/transfers/:id          - Update transfer order
POST   /api/v1/transfers/:id/pack     - Mark as packed (packer)
POST   /api/v1/transfers/:id/dispatch - Mark as dispatched (dispatch_manager)
POST   /api/v1/transfers/:id/receive  - Mark as received (branch_manager)
POST   /api/v1/transfers/:id/photo    - Upload photo documentation
```

### QA Testing API
```
POST   /api/v1/qa/batches             - Submit batch for testing
GET    /api/v1/qa/batches             - List batches (filter by status)
GET    /api/v1/qa/batches/:id         - Get batch details
PUT    /api/v1/qa/batches/:id         - Update test results
POST   /api/v1/qa/batches/:id/approve - Approve batch
POST   /api/v1/qa/batches/:id/reject  - Reject batch
```

### Stock Thresholds API
```
GET    /api/v1/thresholds             - List all thresholds
POST   /api/v1/thresholds             - Set threshold for product/branch
PUT    /api/v1/thresholds/:id         - Update threshold
GET    /api/v1/thresholds/alerts      - Get low stock alerts
```

---

## POS System Comparison (vs Industry Leaders)

### DBC Current State: ~65% Complete

| Feature | Lightspeed | Flowhub | Dutchie | **DBC** |
|---------|------------|---------|---------|---------|
| Basic POS | YES | YES | YES | **YES** |
| Multi-location | YES | YES | YES | **YES** |
| Section 21 Compliance | NO | YES | YES | **YES** |
| Batch/Lot Tracking | YES | YES | YES | **NO** |
| Purchase Limits | NO | YES | YES | **NO** |
| Supplier Management | YES | YES | YES | **NO** |
| Purchase Orders | YES | YES | YES | **NO** |
| Expiry Tracking | YES | YES | YES | **NO** |
| Split Payments | YES | YES | YES | **NO** |
| Staff Time Clock | YES | NO | NO | **NO** |
| Email Marketing | YES | YES | YES | **NO** |
| SMS Marketing | YES | YES | YES | **NO** |
| Real-time Dashboard | YES | YES | YES | **Partial** |

### Critical Missing Features (By Priority)

**PRIORITY 1 - Cannabis Compliance:**
1. Batch/lot tracking with cannabinoid profiles
2. Purchase limits enforcement per patient
3. Destruction tracking for expired product
4. Transfer manifest generation
5. SAHPRA compliance reporting

**PRIORITY 2 - Supply Chain:**
1. Supplier model and management
2. Purchase order workflow
3. Goods Received Notes (GRN)
4. Cost price history
5. Supplier performance tracking

**PRIORITY 3 - Advanced Inventory:**
1. Expiration date tracking
2. Full movement history (not just last 10)
3. Waste/shrinkage categorization
4. Stock take sessions with blind counts

**PRIORITY 4 - Customer Engagement:**
1. Email marketing integration
2. SMS marketing campaigns
3. Push notifications
4. Customer feedback/reviews

## Ormonde Launch Checklist (31 Jan 2026)

### Ready for Launch
- [x] POS Sales (Cash, EFT)
- [x] User Authentication
- [x] Role-based Access Control
- [x] Branch Assignment (staff to their branches)
- [x] Product Inventory
- [x] Invoice Generation
- [x] Receipt Generation

### UI Complete, Needs API
- [ ] Branch Receiving (connects to /api/v1/transfers)
- [ ] MDC Control Panel (connects to /api/v1/products bulk operations)
- [ ] PND Dashboard (connects to /api/v1/transfers)

### Phase 2 (After Launch)
- [ ] Supplier Portal
- [ ] QA Dashboard
- [ ] Owner Analytics Dashboard
- [ ] Auto-reorder System
- [ ] Inter-branch Transfers
