# De Bud Chef - Supply Chain Architecture

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              DBC SUPPLY CHAIN FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘

STAGE 1: SOURCING
═══════════════════════════════════════════════════════════════════════════════════════════

    ┌─────────────────────┐          ┌─────────────────────┐
    │   FARMER DASHBOARD  │          │  SUPPLIER DASHBOARD │
    │   (supplier-portal) │          │  (supplier-portal)  │
    │                     │          │                     │
    │  • Upload harvest   │          │  • Upload products  │
    │  • Batch details    │          │  • SKU, pricing     │
    │  • Weight (kg)      │          │  • Units quantity   │
    │  • Strain info      │          │  • Product specs    │
    │  • COA upload       │          │  • MSDS sheets      │
    └──────────┬──────────┘          └──────────┬──────────┘
               │                                 │
               └──────────────┬──────────────────┘
                              │
                              ▼
STAGE 2: QUALITY ASSURANCE (MISSING)
═══════════════════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────┐
                    │      QA DASHBOARD       │
                    │    (qa-dashboard.html)  │  ◄── NEEDS TO BE BUILT
                    │                         │
                    │  • Receive batch        │
                    │  • Lab test results     │
                    │  • Potency testing      │
                    │  • Contaminant check    │
                    │  • Moisture analysis    │
                    │  • APPROVE / REJECT     │
                    │  • Photo of test        │
                    │  • Certificate gen      │
                    └───────────┬─────────────┘
                                │
                     ┌──────────┴──────────┐
                     │                     │
                     ▼                     ▼
              ┌──────────┐          ┌──────────┐
              │ APPROVED │          │ REJECTED │
              └─────┬────┘          └─────┬────┘
                    │                     │
                    ▼                     ▼
                                    ┌──────────────┐
                                    │ Notify Farm/ │
                                    │ Supplier     │
                                    │ (return/fix) │
                                    └──────────────┘

STAGE 3: INVENTORY & MDC (EXISTS - inventory-manager-dashboard.html)
═══════════════════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────────┐
                    │     INVENTORY MANAGER DASH      │
                    │  (inventory-manager-dashboard)  │  ◄── EXISTS
                    │                                 │
                    │  • Receive approved batches     │
                    │  • Assign TRACK:               │
                    │    - Section 21 (Medical)       │
                    │    - Lifestyle (Public)         │
                    │    - Both                       │
                    │  • Set pricing                  │
                    │  • Upload to MDC                │
                    │  • ACTIVATE on network          │
                    └───────────────┬─────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │    MASTER DATA CATALOG (MDC)    │
                    │                                 │
                    │  Central Product Repository     │
                    │  • Product ID, Name, SKU        │
                    │  • Track (Section 21/Lifestyle) │
                    │  • Base Price                   │
                    │  • QA Certificate               │
                    │  • Stock at HQ                  │
                    └───────────────┬─────────────────┘
                                    │
                                    │ BROADCAST
                                    ▼

STAGE 4: STOCK DISTRIBUTION (LOGIC NEEDED)
═══════════════════════════════════════════════════════════════════════════════════════════

TWO MODELS TO CONSIDER:

MODEL A: PUSH MODEL (HQ Distributes)
─────────────────────────────────────
Inventory Manager decides which branches get what stock.

    ┌─────────────────────────────────┐
    │         ORMONDE HQ              │
    │     (Central Warehouse)         │
    │                                 │
    │  Stock: 1000 units             │
    └───────────────┬─────────────────┘
                    │
    ┌───────────────┼───────────────┬───────────────┬───────────────┐
    │               │               │               │               │
    ▼               ▼               ▼               ▼               ▼
┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│Spruitvw│    │Rustenb.│    │Klerksd.│    │Mayfair │    │ etc... │
│ 150u   │    │ 100u   │    │  80u   │    │ 120u   │    │        │
└────────┘    └────────┘    └────────┘    └────────┘    └────────┘

Pros: Central control, predictable
Cons: May not match demand


MODEL B: PULL MODEL (Branches Request)
─────────────────────────────────────
Branches request stock when running low.

    ┌────────────────────────────────────────────────────────┐
    │  BRANCH sends STOCK REQUEST when below threshold       │
    │                                                        │
    │  Low Stock Alert → Request to Inventory Manager        │
    └────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌─────────────────────────────────┐
    │     INVENTORY MANAGER           │
    │                                 │
    │  • Review request               │
    │  • Check HQ stock               │
    │  • Approve/Modify quantity      │
    │  • Create TRANSFER ORDER        │
    └───────────────┬─────────────────┘
                    │
                    ▼
    ┌─────────────────────────────────┐
    │        PND DASHBOARD            │
    │                                 │
    │  PACKER: Pick & pack for branch │
    │  DISPATCH: Send to branch       │
    └───────────────┬─────────────────┘
                    │
                    ▼
    ┌─────────────────────────────────┐
    │      BRANCH RECEIVING           │
    │                                 │
    │  • Branch manager receives      │
    │  • Photo of received goods      │
    │  • Count verification           │
    │  • Stock added to branch inv    │
    └─────────────────────────────────┘

Pros: Demand-driven, less waste
Cons: May have stockouts if slow


RECOMMENDED: HYBRID MODEL
─────────────────────────
- MIN/MAX thresholds per branch per product
- Auto-request when below MIN
- Inventory manager can also PUSH when needed
- Weekly scheduled replenishment for staples


STAGE 5: PND - PACKAGING & DISTRIBUTION (EXISTS - pnd-dashboard.html)
═══════════════════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────────┐
                    │        PACKER (Pack Only)       │
                    │                                 │
                    │  1. Receive picking list        │
                    │  2. Photo BEFORE packing        │
                    │  3. Pick products from shelf    │
                    │  4. Pack securely               │
                    │  5. Photo AFTER packing         │
                    │  6. Label package               │
                    │  7. Mark complete → Dispatch    │
                    └───────────────┬─────────────────┘
                                    │
                                    │ (Cannot dispatch - segregation)
                                    ▼
                    ┌─────────────────────────────────┐
                    │   DISPATCH MGR (Dispatch Only)  │
                    │                                 │
                    │  1. Verify package contents     │
                    │  2. Assign courier/driver       │
                    │  3. Photo at handoff            │
                    │  4. Record courier details      │
                    │  5. Mark dispatched             │
                    └───────────────┬─────────────────┘
                                    │
                                    ▼

STAGE 6: BRANCH RECEIVING (MISSING)
═══════════════════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────────┐
                    │    BRANCH RECEIVING DASH        │
                    │ (branch-receiving.html)         │  ◄── NEEDS TO BE BUILT
                    │                                 │
                    │  • Notification: shipment coming│
                    │  • Receive package              │
                    │  • Photo of received goods      │
                    │  • Count verification           │
                    │  • Report discrepancies         │
                    │  • Accept into branch stock     │
                    └───────────────┬─────────────────┘
                                    │
                                    ▼

STAGE 7: BRANCH POS (EXISTS - admin.html POS tab)
═══════════════════════════════════════════════════════════════════════════════════════════

                    ┌─────────────────────────────────┐
                    │         BRANCH POS              │
                    │                                 │
                    │  • Sell to walk-in customers    │
                    │  • Cash / EFT payments          │
                    │  • Section 21 verification      │
                    │  • Receipt generation           │
                    │  • Deduct from branch stock     │
                    └─────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════════════════
                              DASHBOARD STATUS
═══════════════════════════════════════════════════════════════════════════════════════════

| Dashboard | File | Status | Role |
|-----------|------|--------|------|
| Supplier Portal | supplier-portal.html | MISSING | farmer, supplier |
| QA Dashboard | qa-dashboard.html | MISSING | qa_officer |
| Inventory Manager | inventory-manager-dashboard.html | EXISTS | inventory_manager |
| PND - Packer | pnd-dashboard.html | EXISTS | packer |
| PND - Dispatch | pnd-dashboard.html | EXISTS | dispatch_manager |
| Branch Receiving | branch-receiving.html | MISSING | branch_manager |
| Branch POS | admin.html (POS tab) | EXISTS | branch_assistant |
| Owner Overview | owner-dashboard.html | EXISTS | owner |


═══════════════════════════════════════════════════════════════════════════════════════════
                              CAVEATS & CONSIDERATIONS
═══════════════════════════════════════════════════════════════════════════════════════════

## 1. Stock Accuracy

PROBLEM: Stock counts can drift between physical and digital.

SOLUTIONS:
- Daily stock counts at each branch (end of shift)
- Photo documentation at each transfer point
- Barcode scanning for accuracy
- Regular full audits (monthly)
- Discrepancy reporting system


## 2. Fraud Prevention

PROBLEM: Staff could steal product or create fake sales.

SOLUTIONS IMPLEMENTED:
✓ Packer cannot dispatch (role segregation)
✓ Dispatch manager cannot pack
✓ Photo requirements at each stage
✓ Activity log with timestamps

ADDITIONAL NEEDED:
- Two-person verification for high-value items
- Random spot audits by owner/admin
- Video surveillance integration
- Variance alerts (sold vs received)


## 3. Section 21 Compliance

PROBLEM: Medical products require prescription verification.

SOLUTIONS:
- Track field on all products (Section21 / Lifestyle)
- POS blocks Section 21 sale without verified patient
- Patient verification stored on user profile
- Audit trail for all Section 21 sales


## 4. Stock Distribution Logic

OPTIONS:

A) MANUAL ALLOCATION
   - Inventory manager manually decides
   - Most control, most labor

B) THRESHOLD-BASED AUTO-REQUEST
   - Each product at each branch has:
     - MIN threshold (trigger reorder)
     - MAX threshold (don't over-stock)
     - REORDER quantity (how much to request)
   - System auto-creates transfer order when below MIN

C) SALES-VELOCITY BASED
   - Track sales per product per branch per week
   - Allocate based on historical demand
   - Branches that sell more get more

RECOMMENDATION: Start with B (threshold-based) + manual override


## 5. Inter-Branch Transfers

PROBLEM: What if Spruitview is out but Rustenburg has excess?

SOLUTION: Allow branch-to-branch transfers with approval
- Branch A requests from Branch B
- Inventory manager approves
- Branch B packs and dispatches
- Branch A receives
- Both inventories updated

COMPLEXITY: This adds another flow path


## 6. Returns & Damaged Goods

PROBLEM: Products returned or damaged need tracking.

SOLUTION:
- Damaged at branch → Mark damaged, photo, reduce inventory
- Customer return → Return to branch stock or HQ (policy needed)
- Expired products → Mark expired, dispose, photo evidence


## 7. Expiry Tracking

PROBLEM: Cannabis products have shelf life.

SOLUTION:
- Batch-level expiry dates from supplier
- FIFO (First In First Out) selling
- Expiry alerts (30 days, 7 days, expired)
- Discount system for near-expiry


## 8. Multi-Location Visibility

PROBLEM: Need to see stock across all 8 branches.

SOLUTION:
- Owner dashboard: All branch stock levels
- Inventory manager: Consolidated view
- Each product shows: HQ stock + each branch stock


═══════════════════════════════════════════════════════════════════════════════════════════
                              PRIORITY BUILD ORDER
═══════════════════════════════════════════════════════════════════════════════════════════

PHASE 1 (Core Flow - Before Launch)
1. ✓ Inventory Manager Dashboard - EXISTS
2. ✓ PND Dashboard (Packer/Dispatch) - EXISTS
3. ✓ Branch POS - EXISTS
4. Branch Receiving - NEEDED (simple version)

PHASE 2 (Source & Quality)
5. Supplier Portal (unified for farmer + vendor)
6. QA Dashboard

PHASE 3 (Optimization)
7. Stock threshold management
8. Auto-reorder system
9. Inter-branch transfers
10. Returns/damaged goods tracking


═══════════════════════════════════════════════════════════════════════════════════════════
                              DATA MODELS NEEDED
═══════════════════════════════════════════════════════════════════════════════════════════

## TransferOrder
- orderId
- fromBranchId (or 'HQ')
- toBranchId
- items: [{ productId, quantity, batchNumber }]
- requestedBy (user)
- approvedBy (inventory_manager)
- status: requested → approved → packing → dispatched → received
- createdAt, updatedAt
- photos: { beforePacking, afterPacking, handoff, received }

## StockThreshold
- branchId
- productId
- minQuantity
- maxQuantity
- reorderQuantity
- autoReorder: boolean

## QATest
- batchId
- supplierId
- testDate
- testedBy (qa_officer)
- results: { potency, contaminants, moisture }
- status: pending → passed → failed
- certificateUrl
- photos

## BranchReceiving
- transferOrderId
- receivedBy (branch_manager)
- receivedAt
- items: [{ productId, expectedQty, receivedQty, discrepancy }]
- photos
- notes


═══════════════════════════════════════════════════════════════════════════════════════════
                              NOTIFICATION FLOW
═══════════════════════════════════════════════════════════════════════════════════════════

1. Supplier uploads batch → Notify QA Officer
2. QA approves → Notify Inventory Manager
3. QA rejects → Notify Supplier
4. Inventory activates on MDC → Notify all Branch Managers
5. Branch stock low → Notify Inventory Manager
6. Transfer order created → Notify Packer
7. Packing complete → Notify Dispatch Manager
8. Dispatched → Notify receiving Branch Manager
9. Received → Notify Inventory Manager (close loop)


═══════════════════════════════════════════════════════════════════════════════════════════
                              SUMMARY: WHAT TO BUILD NEXT
═══════════════════════════════════════════════════════════════════════════════════════════

IMMEDIATE (For Ormonde Launch):
1. Branch Receiving workflow (simple photo + count)
2. Stock threshold settings in Inventory Manager

NEXT WEEK:
3. QA Dashboard (basic approve/reject)
4. Supplier Portal (unified)

LATER:
5. Auto-reorder system
6. Inter-branch transfers
7. Returns management
