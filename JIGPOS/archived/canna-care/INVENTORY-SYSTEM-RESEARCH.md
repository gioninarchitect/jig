# Inventory & Multi-Store System Research Document
**Date**: 2025-11-06
**Purpose**: UAT preparation + Future multi-store development
**Status**: Current implementation analysis + Recommendations

---

## CURRENT IMPLEMENTATION

### 1. Branch Inventory Model
**Location**: `backend/modules/database/models/BranchInventory.js`

**Key Features**:
- Per-branch stock tracking
- Stock movement history (last 10 movements)
- Movement types: `sale`, `restock`, `transfer_in`, `transfer_out`, `adjustment`, `return`, `damage`, `theft`
- Reserved stock management (for pending orders)
- Low stock/reorder alerts
- Branch-specific pricing overrides
- Physical location tracking (aisle, shelf, bin)

**Data Structure**:
```javascript
{
  branchId: ObjectId,
  productId: ObjectId,
  quantity: Number,
  reserved: Number,
  lowStockThreshold: 10,
  reorderPoint: 20,
  reorderQuantity: 50,
  maxStock: 500,
  overridePrice: Number,
  locationCode: String,
  recentMovements: [{
    type: 'sale'|'restock'|'transfer_in'|'transfer_out'|'adjustment'|'return'|'damage'|'theft',
    quantity: Number,
    balanceBefore: Number,
    balanceAfter: Number,
    reference: String,
    performedBy: ObjectId
  }]
}
```

### 2. POS Integration
**Location**: `backend/routes/pos.js`

**Current Flow**:
1. Sale created with items
2. Payment processed
3. If payment approved instantly (card/cash):
   - Inventory deducted via `BranchInventory.deductStock()`
   - Stock movement recorded with sale number
   - `sale.inventoryDeducted = true`
4. If payment pending (EFT):
   - No immediate deduction
   - Deducted when payment approved

**Code Reference**: Lines 84-97, 231-244

### 3. Available Methods
**From BranchInventory model**:

- `recordMovement(type, quantity, reference, notes, userId)` - Record any stock movement
- `reserveStock(quantity)` - Reserve stock for pending order
- `releaseReservation(quantity)` - Release reserved stock
- `deductStock(quantity, saleNumber, userId)` - Deduct for completed sale
- `adjustStock(newQuantity, reason, userId)` - Physical stock count adjustment
- `getLowStockItems(branchId)` - Static: Get items needing restock
- `getReorderList(branchId)` - Static: Get reorder list
- `checkAvailability(branchId, productId, quantity)` - Static: Check if stock available
- `getBranchInventoryValue(branchId)` - Static: Calculate branch inventory value

---

## CURRENT GAPS

### For UAT (Need to fix NOW):

1. **No Inventory Upload/Bulk Update Endpoint**
   - Admin panel needs way to upload CSV/Excel of inventory
   - No API endpoint to create/update BranchInventory in bulk
   - Manual entry only

2. **No Inventory Management UI**
   - Admin panel has "Inventory" tab but likely not fully implemented
   - Need to verify what exists in `admin.html`

3. **No Stock Transfer UI/Workflow**
   - Model supports `transfer_in`/`transfer_out` but no API/UI
   - Cannot move stock between branches via admin panel

### For Future Development:

4. **No Inter-Branch Stock Visibility**
   - Cannot see if product is in stock at other branches
   - No "find in store" feature for customers

5. **No Automatic Reorder Alerts**
   - System tracks `needsReorder` but doesn't notify anyone

6. **No Supplier Integration**
   - Reorder list exists but no way to send to suppliers

---

## RECOMMENDATIONS

### Phase 1: UAT PREPARATION (Implement Now)

#### 1.1 Inventory Upload API
**Create**: `/backend/routes/inventory.js`

**Endpoints**:
```javascript
POST /api/v1/inventory/upload
  - Accept CSV file with columns: branchId, productId/SKU, quantity, lowStockThreshold
  - Validate data
  - Bulk create/update BranchInventory documents
  - Return summary of items added/updated

GET /api/v1/inventory/branch/:branchId
  - List all inventory for a branch
  - Support pagination, search, filters (low stock, out of stock)
  - Populate product details

PUT /api/v1/inventory/:inventoryId
  - Update single inventory item (quantity, thresholds, pricing)
  - Record as 'adjustment' movement

POST /api/v1/inventory/adjust/:inventoryId
  - Physical stock count adjustment
  - Requires reason and user ID
```

#### 1.2 Admin Panel Inventory Tab
**Update**: `admin.html` inventory section

**Features**:
- View all branch inventory in table
- Search by product name/SKU
- Filter by stock status (in stock, low stock, out of stock)
- Upload CSV button → calls upload API
- Edit quantity inline → calls adjust API
- Show last movement history

#### 1.3 POS Stock Visibility
**Update**: `pos.html`

**Features**:
- Show available quantity when adding items
- Prevent adding out-of-stock items
- Warning for low-stock items
- Already partially implemented (lines 932-957)

### Phase 2: MULTI-STORE PREPARATION (Future)

#### 2.1 Stock Transfer System

**Create**: Stock Transfer model + routes

**Transfer Workflow**:
```
Initiating Branch:
1. Manager creates transfer request
2. Select destination branch
3. Select products + quantities
4. Status: 'pending'

Receiving Branch:
5. Gets notification
6. Reviews transfer request
7. Accepts or rejects

On Accept:
8. Source branch: recordMovement('transfer_out', -qty)
9. Dest branch: recordMovement('transfer_in', +qty)
10. Status: 'completed'
```

**API Endpoints**:
```javascript
POST /api/v1/inventory/transfer/create
  {
    fromBranchId,
    toBranchId,
    items: [{productId, quantity}],
    reason,
    requestedBy
  }

GET /api/v1/inventory/transfer/pending/:branchId
  - Get transfers awaiting this branch's action

PUT /api/v1/inventory/transfer/:transferId/approve
  - Receiving branch approves
  - Executes stock movements

PUT /api/v1/inventory/transfer/:transferId/reject
  - Reject transfer with reason
```

#### 2.2 Inter-Branch Stock Visibility

**UI Feature**: "Find in Other Stores"

**Implementation**:
```javascript
GET /api/v1/inventory/find-in-stores/:productId
  - Returns list of all branches with this product
  - Shows: branchName, quantity, distance (if geo data available)
  - Sorted by: in stock first, then by distance

// Response:
{
  product: {...},
  availability: [
    {
      branch: {name: 'Four Ways', city: 'Johannesburg'},
      quantity: 15,
      status: 'in_stock',
      canTransfer: true
    },
    {
      branch: {name: 'Sandton', city: 'Johannesburg'},
      quantity: 0,
      status: 'out_of_stock',
      canTransfer: false
    }
  ]
}
```

**Use Cases**:
- Customer asks for product not in current store
- Staff can check other branches
- Offer to transfer or reserve at other location

#### 2.3 Centralized Inventory Dashboard

**New Page**: `inventory-overview.html`

**Features**:
- Total inventory value across all branches
- Stock levels per product across all branches
- Low stock alerts (all branches)
- Reorder list (consolidated)
- Stock movement analytics
- Branch-to-branch comparison

**API**:
```javascript
GET /api/v1/inventory/overview
  - Aggregates inventory across all branches
  - Returns summary statistics
  - Products needing attention

GET /api/v1/inventory/analytics
  - Stock turnover rates
  - Fast/slow moving products
  - Branch performance comparison
```

#### 2.4 Automated Reorder System

**Feature**: Auto-generate purchase orders

**Workflow**:
```
1. Daily cron job checks reorder points
2. For each product below reorder point:
   - Check all branches
   - Calculate total needed
   - Generate purchase order
3. Email/notify purchasing manager
4. Manager approves/modifies
5. On approval → send to supplier (email/API)
6. On delivery → update inventory via upload
```

**Models Needed**:
- PurchaseOrder
- Supplier

---

## TECHNICAL DECISIONS

### Where to Manage Stock Transfers?

**Recommendation**: Create dedicated `/api/v1/inventory/transfer` endpoints

**Rationale**:
- POS is for customer-facing sales
- Inventory transfers are internal operations
- Different permissions (staff vs managers)
- Separate audit trail
- Cleaner separation of concerns

**Alternative**: Could add to POS routes but:
- Mixes customer sales with internal operations
- Makes POS routes too complex
- Harder to manage permissions

### Stock Transfer Authorization Levels

**Proposal**:
```javascript
Initiate Transfer: Manager or Admin
Approve Transfer: Manager or Admin at receiving branch
Reject Transfer: Same as approve
View Transfers: All staff can view
```

### Inventory Upload: CSV vs API vs UI?

**Recommendation**: Support all three

1. **CSV Upload** (Phase 1 - UAT)
   - Good for initial stock load
   - Good for periodic audits
   - Easy for non-technical users

2. **API** (Phase 1 - UAT)
   - For programmatic updates
   - For integrations (e.g., supplier systems)
   - For automated scripts

3. **UI** (Phase 1 - UAT)
   - Quick adjustments
   - Single item changes
   - Real-time updates

---

## IMPLEMENTATION PRIORITY

### For UAT (This Sprint):
1. ✅ POS inventory deduction (already working)
2. ⏳ Inventory upload API endpoint
3. ⏳ Admin panel inventory tab
4. ⏳ Inventory adjust/count endpoint

### Post-UAT (Next Sprint):
5. Stock transfer API
6. Stock transfer UI
7. Find-in-stores feature
8. Centralized dashboard

### Future Enhancements:
9. Automated reorder system
10. Supplier integration
11. Advanced analytics
12. Mobile inventory app for stock counts

---

## API ENDPOINTS SUMMARY

### Current (Working):
- None specific to inventory (only via POS)

### To Implement for UAT:
```
POST   /api/v1/inventory/upload           - Bulk upload CSV
GET    /api/v1/inventory/branch/:id       - List branch inventory
PUT    /api/v1/inventory/:id              - Update inventory item
POST   /api/v1/inventory/adjust/:id       - Physical count adjustment
GET    /api/v1/inventory/low-stock/:id    - Get low stock items
```

### To Implement Post-UAT:
```
POST   /api/v1/inventory/transfer/create  - Create transfer
GET    /api/v1/inventory/transfer/pending/:id
PUT    /api/v1/inventory/transfer/:id/approve
PUT    /api/v1/inventory/transfer/:id/reject
GET    /api/v1/inventory/find-in-stores/:productId
GET    /api/v1/inventory/overview         - All branches summary
GET    /api/v1/inventory/analytics        - Analytics data
```

---

## DATABASE CHANGES NEEDED

### For UAT:
- None (BranchInventory model already perfect)

### Post-UAT:
- Create StockTransfer model
- Create PurchaseOrder model
- Create Supplier model

---

## SECURITY CONSIDERATIONS

### Permission Levels:
```
Admin: Full access to all inventory operations
Manager: Branch-specific inventory + transfers
Assistant: View only + basic adjustments
```

### Audit Trail:
- All movements logged in `recentMovements`
- `performedBy` tracks who made changes
- Timestamps on all operations
- Cannot delete movements (immutable history)

---

## CONCLUSION

**Current State**:
- Solid foundation with BranchInventory model
- POS integration working
- Stock movement tracking in place
- Transfer capability built into model

**For UAT**:
- Need inventory upload/management API
- Need admin UI for inventory
- These are achievable in 1-2 days

**For Multi-Store**:
- System is ready for multiple branches
- Just need transfer workflow UI/API
- Inter-branch visibility is simple query
- Architecture supports scale

**Recommendation**:
Proceed with UAT after implementing the 4 critical inventory endpoints. Multi-store features can be added incrementally based on business growth.

---

**Document Status**: ✅ Complete
**Next Action**: Implement Phase 1 endpoints for UAT
