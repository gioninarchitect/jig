# Basotho Medical Herbs - REVISED Business Model & Technical Requirements

**Date**: 2025-11-05
**Status**: URGENT - Missing Critical POS Features

---

## 🎯 ACTUAL BUSINESS MODEL

### Physical Store: La Brewha / Bean & Bud Café
**Products Sold**:
- Cannabis accessories (bongs, grinders, papers, pipes, vaporizers)
- CBD wellness products (legal, non-prescription)
- Coffee & beverages
- Lifestyle products

**Customer Journey**:
1. Walk into physical store
2. Purchase accessories/coffee (cash or card)
3. Sign up as "Lifestyle Member" during checkout
4. Get login credentials for online dashboard
5. Access wellness content and Section 21 path online

**Revenue**: ~70% of business

---

### Online Platform: Basotho Medical Herbs Dashboard
**For Lifestyle Members**:
- View product catalog (accessories, CBD products)
- Wellness content and education
- **Section 21 Gateway** (greyed out initially)
- Order history and loyalty points

**Section 21 Flow** (Medical Cannabis Access):
1. Member sees "Section 21" tab (greyed out, locked)
2. Clicks → Prompt: "Upload prescription to unlock"
3. Upload prescription documents
4. **Admin reviews and approves**
5. Once approved → "Book Appointment" button unlocks
6. Member books consultation
7. After consultation → **Redirect to external compliant cannabis store**
8. You earn referral commission

**Key Point**: You are NOT selling cannabis. You're a **referral platform** connecting patients to licensed providers.

---

### B2B Wholesale (30% of Business)
**Customers**: Other smoke shops, cafés, wellness stores

**Features Needed**:
- Separate wholesale price list
- Bulk order management
- Credit terms (30/60 days payment)
- Delivery scheduling
- B2B invoicing with tax compliance

---

## 🚨 CRITICAL MISSING: Full Point of Sale System

### Current POS (What You Have):
- ✅ Product display
- ✅ Add to cart
- ✅ Basic checkout
- ✅ Payment methods

### Required POS Features (What's MISSING):

#### 1. **Till/Cash Management**
```
OPEN TILL:
- Clock in with staff PIN
- Enter opening float (e.g., R500)
- Timestamp recorded

DURING SHIFT:
- Track all cash sales
- Track all card sales
- Running cash total

CLOSE TILL:
- Count physical cash
- System expected: R2,450
- Actual counted: R2,445
- Cash short: -R5
- Submit for manager approval
- Generate shift report
```

**Why Critical**: You're a CASH business. Without this, you have:
- No accountability (staff can steal)
- No daily reconciliation (accounting nightmare)
- No audit trail (tax compliance issue)

---

#### 2. **Barcode/SKU System**
```
CURRENT: Staff types "grinder" → Search → Click product
TIME: 30 seconds per item

NEEDED: Staff scans barcode
TIME: 2 seconds per item

BENEFIT: 15x faster checkout during busy morning rush (Bean & Bud café)
```

**Implementation**:
- Assign SKU to each product (e.g., GRN-001, BNG-045, CBD-OIL-10)
- Generate barcode labels
- USB barcode scanner connected to POS system
- Scan → Instant add to cart

---

#### 3. **Returns & Refunds**
**Legal Requirement**: Consumer Protection Act (CPA) mandates returns within 7 days if defective.

**Features**:
- Select original order
- Choose items to return
- Reason (defective, wrong item, change of mind)
- Refund method:
  - Cash (instant)
  - Card (3-5 days)
  - Store credit (instant)
- Update inventory (returned item back in stock)

---

#### 4. **Loyalty Integration at POS**
**Current Problem**: Customers earn points online but CAN'T use them in-store.

**Needed**:
- Look up customer by phone/email
- Display current points balance
- Apply points as discount (e.g., 100 points = R10)
- Customer earns points on purchase (R100 spent = 10 points)
- Update in real-time

**Why Critical**: Your loyalty program is USELESS if only works online. 70% of sales are in-store.

---

#### 5. **Staff Performance Tracking**
**Manager Needs**:
- Who sold what today?
- How much did each staff member sell?
- Average transaction value per staff
- Who gave discounts/voids?

**For Payroll**:
- Sales commissions
- Performance bonuses
- Identify training needs

---

#### 6. **Inventory Management at POS**
**Stock Receiving**:
```
1. Shipment arrives from supplier
2. Staff opens "Receive Stock" screen
3. Scans barcodes or enters SKUs
4. System updates inventory automatically
5. Generate receiving report
```

**Stock Transfers** (if multiple locations):
```
1. Transfer 10x grinders from Main Store → Bean & Bud Centurion
2. Deduct from Main Store inventory
3. Add to Centurion inventory
4. Generate transfer document
```

**Stock Adjustments** (damage, theft, samples):
```
1. Item damaged → Mark as loss
2. Inventory decreases
3. Reason logged
4. Manager approval required
```

---

## 📋 REVISED DATABASE SCHEMA NEEDED

### TillSession Model
```javascript
{
  _id: ObjectId,
  staffId: ObjectId,           // Who opened the till
  branchId: ObjectId,           // Which location
  openTime: DateTime,
  closeTime: DateTime,
  openingFloat: Number,         // Starting cash (e.g., R500)

  // Sales during shift
  totalCashSales: Number,
  totalCardSales: Number,
  totalSales: Number,

  // Closing
  expectedCash: Number,         // Opening float + cash sales - refunds
  actualCash: Number,           // What staff counted
  cashVariance: Number,         // Difference (positive = over, negative = short)

  // Shift summary
  transactionCount: Number,
  averageTransaction: Number,
  discountsGiven: Number,
  refundsGiven: Number,

  status: String,               // 'open', 'closed', 'pending_approval'
  approvedBy: ObjectId,         // Manager who approved
  notes: String
}
```

### Sale Model (Individual Transaction)
```javascript
{
  _id: ObjectId,
  tillSessionId: ObjectId,
  staffId: ObjectId,
  customerId: ObjectId,         // If loyalty member

  items: [{
    productId: ObjectId,
    sku: String,
    name: String,
    quantity: Number,
    unitPrice: Number,
    subtotal: Number
  }],

  subtotal: Number,
  tax: Number,
  discount: Number,
  total: Number,

  paymentMethod: String,        // 'cash', 'card', 'split'
  paymentDetails: {
    cash: Number,
    card: Number,
    change: Number
  },

  loyaltyPointsEarned: Number,
  loyaltyPointsRedeemed: Number,

  timestamp: DateTime,
  receiptNumber: String,
  status: String                // 'completed', 'refunded', 'voided'
}
```

### Refund Model
```javascript
{
  _id: ObjectId,
  originalSaleId: ObjectId,
  tillSessionId: ObjectId,
  staffId: ObjectId,
  managerId: ObjectId,          // Manager approval required

  refundedItems: [{
    productId: ObjectId,
    quantity: Number,
    refundAmount: Number,
    reason: String              // 'defective', 'wrong_item', 'change_of_mind'
  }],

  refundTotal: Number,
  refundMethod: String,         // 'cash', 'card', 'store_credit'

  timestamp: DateTime,
  notes: String
}
```

### Section21Application Model (Enhanced)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,

  // Documents
  prescriptionUrl: String,
  idDocumentUrl: String,
  proofOfAddressUrl: String,

  // Application status
  status: String,               // 'pending', 'under_review', 'approved', 'rejected', 'expired'
  submittedAt: DateTime,
  reviewedAt: DateTime,
  reviewedBy: ObjectId,         // Admin who reviewed

  // Approval details
  section21Number: String,      // e.g., S21-2024-001234
  approvalDate: DateTime,
  expiryDate: DateTime,

  // Rejection
  rejectionReason: String,

  // Doctor details
  doctorName: String,
  doctorPracticeNumber: String,
  doctorContact: String,

  // Appointment booking
  appointmentBooked: Boolean,
  appointmentDate: DateTime,
  appointmentNotes: String,

  // External referral
  referredTo: String,           // External cannabis store
  referralCommission: Number,
  referralStatus: String        // 'referred', 'purchased', 'commission_paid'
}
```

### B2BCustomer Model
```javascript
{
  _id: ObjectId,
  companyName: String,
  vatNumber: String,
  registrationNumber: String,

  contactPerson: String,
  email: String,
  phone: String,

  billingAddress: Object,
  deliveryAddress: Object,

  // B2B specific
  creditLimit: Number,
  paymentTerms: String,         // '30_days', '60_days', 'cash_on_delivery'
  discountPercentage: Number,   // Wholesale discount (e.g., 25%)

  orders: [ObjectId],
  totalSpent: Number,
  outstandingBalance: Number,

  status: String                // 'active', 'suspended', 'on_hold'
}
```

---

## 🏗️ DEVELOPMENT PRIORITIES (REVISED)

### PHASE 1: Fix POS System (THIS WEEK)
1. ✅ Till open/close with cash reconciliation
2. ✅ Barcode/SKU support
3. ✅ Returns & refunds
4. ✅ Loyalty lookup at POS
5. ✅ Shift reports for manager

### PHASE 2: Section 21 Gateway (NEXT WEEK)
1. ✅ Application queue for admin
2. ✅ Approve/reject workflow
3. ✅ Appointment booking system
4. ✅ External store redirect
5. ✅ Referral commission tracking

### PHASE 3: B2B Wholesale (WEEK 3)
1. ✅ B2B customer portal
2. ✅ Wholesale pricing
3. ✅ Bulk ordering
4. ✅ Credit terms management
5. ✅ B2B invoicing

### PHASE 4: Advanced Features (MONTH 2)
1. Stock receiving workflow
2. Multi-location inventory
3. Advanced reporting
4. Mobile POS (tablet)
5. Accounting integration

---

## 📊 SUCCESS METRICS

**POS System**:
- Average checkout time < 60 seconds
- Cash variance < R50 per shift
- Zero unreconciled tills
- Staff can process 100+ transactions/day

**Section 21**:
- Application review < 24 hours
- 80% approval rate
- 50% book appointments
- 30% complete purchases (referral commission earned)

**B2B**:
- 30% of revenue from wholesale
- Payment terms compliance > 90%
- Repeat orders from 70% of B2B customers

---

## 🚀 IMMEDIATE ACTION ITEMS

1. **Build Till Management Module** (2-3 days)
   - Open/close shift UI
   - Cash reconciliation screen
   - Shift report generation

2. **Add Barcode Scanner Support** (1 day)
   - USB scanner detection
   - SKU lookup function
   - Add to cart on scan

3. **Build Returns Screen** (1 day)
   - Order lookup
   - Item selection
   - Refund processing

4. **Loyalty Integration** (1 day)
   - Customer lookup
   - Points display
   - Points redemption

5. **Section 21 Workflow** (2 days)
   - Admin review queue
   - Approve/reject actions
   - Appointment booking

---

**Generated**: 2025-11-05
**Business Clarification**: Physical store + Online referral platform + B2B wholesale
**Next Steps**: Build full POS system with till management, barcode scanning, returns
