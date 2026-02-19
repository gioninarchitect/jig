# Da Bud Chef - Ormonde Branch Launch Checklist

**Branch**: Ormonde (HQ)
**Target Launch**: TBD
**Assessment Date**: 4 February 2026

---

## LAUNCH READINESS SCORE: 75%

| Category | Status | Blocker? |
|----------|--------|----------|
| Core POS | READY | No |
| Inventory | READY | No |
| Staff Roles | READY | No |
| Payment Processing | INCOMPLETE | **YES** |
| Offline Mode | INCOMPLETE | **YES** |
| Testing | MINIMAL | **YES** |
| Daily Cashup | READY | No |
| Reporting | PARTIAL | No |

---

## CRITICAL BLOCKERS (Must Fix Before Launch)

### BLOCKER 1: Payment Processing
**Status**: InstaPay integration incomplete
**Impact**: Cannot process card payments

**To Fix**:
- [ ] Complete InstaPay API integration
- [ ] Test card payment flow end-to-end
- [ ] Implement refund processing
- [ ] Add webhook handlers for payment notifications
- [ ] Test payment reconciliation

**Effort**: 2-3 days

---

### BLOCKER 2: Offline Mode
**Status**: Service worker exists but not production-ready
**Impact**: POS unusable during internet outages

**To Fix**:
- [ ] Test offline sale queueing
- [ ] Test sync when back online
- [ ] Handle inventory conflicts
- [ ] Add offline indicator in UI (DONE)
- [ ] Test with airplane mode

**Effort**: 1-2 days

---

### BLOCKER 3: Test Coverage
**Status**: 2 test files only
**Impact**: Risk of regressions, unknown bugs

**To Fix**:
- [ ] Write POS sale flow tests
- [ ] Write inventory deduction tests
- [ ] Write payment method tests
- [ ] Write daily cashup tests
- [ ] Achieve 50%+ coverage on critical paths

**Effort**: 3-4 days

---

## PRE-LAUNCH CHECKLIST

### 1. Database Setup
- [ ] MongoDB production instance configured
- [ ] Database `dbc` created
- [ ] Indexes verified
- [ ] Backup schedule configured

### 2. Seed Data
```bash
cd /Users/florisolivier/DBC/newbrand
node backend/scripts/seed-test-users.js     # Admin, staff users
node backend/scripts/add-products.js         # Sheet blades, StonerDayz
node backend/scripts/seed-dbc-stock.js       # All products
```

- [ ] Admin user created (admin@debudchef.co.za)
- [ ] Ormonde branch created
- [ ] Staff accounts created
- [ ] Products seeded with stock
- [ ] Till sessions initialized

### 3. Branch Configuration
- [ ] Ormonde branch in database
- [ ] Operating hours set
- [ ] Till numbers configured
- [ ] Manager assigned
- [ ] Bank details entered (for EFT)

### 4. Staff Accounts
| Role | Email | Created |
|------|-------|---------|
| Owner | owner@debudchef.co.za | [ ] |
| Admin | admin@debudchef.co.za | [ ] |
| Manager | ormonde.manager@debudchef.co.za | [ ] |
| Assistant 1 | ormonde.assistant@debudchef.co.za | [ ] |
| Assistant 2 | ormonde.assistant2@debudchef.co.za | [ ] |
| Inventory | inventory@debudchef.co.za | [ ] |

### 5. POS Terminal Setup
- [ ] pos.html loads correctly
- [ ] Products display in grid
- [ ] Category filtering works
- [ ] Search works
- [ ] Cart functions (add, remove, quantity)
- [ ] Payment methods visible
- [ ] Till session can open/close
- [ ] Receipt prints/emails

### 6. Payment Methods
| Method | Status | Tested |
|--------|--------|--------|
| Cash | Ready | [ ] |
| Card (InstaPay) | **BLOCKED** | [ ] |
| EFT | Ready | [ ] |
| Voucher | Ready | [ ] |

### 7. Inventory Management
- [ ] Stock levels visible
- [ ] Low stock alerts working
- [ ] Stock deducts on sale
- [ ] Manual adjustments work
- [ ] Transfer requests work

### 8. Daily Operations
- [ ] Clock in/out works
- [ ] Till session open works
- [ ] Sales can be processed
- [ ] Refunds can be processed
- [ ] Till session close works
- [ ] Daily cashup works
- [ ] Denomination counting works
- [ ] Variance calculation correct

### 9. Reports
- [ ] Daily sales report
- [ ] Inventory levels report
- [ ] Low stock report
- [ ] Cashup report

---

## HARDWARE CHECKLIST

### Required Equipment
- [ ] POS terminal (tablet/laptop)
- [ ] Cash drawer
- [ ] Receipt printer (optional - email receipts available)
- [ ] Barcode scanner (optional)
- [ ] Card machine (Yoco/InstaPay compatible)

### Network
- [ ] Stable internet connection
- [ ] Backup mobile hotspot
- [ ] Offline mode tested

---

## STAFF TRAINING CHECKLIST

### POS Operations
- [ ] Logging in
- [ ] Opening till session
- [ ] Processing cash sale
- [ ] Processing card sale
- [ ] Processing EFT sale
- [ ] Applying vouchers
- [ ] Processing refunds
- [ ] Closing till session
- [ ] Daily cashup procedure

### Inventory
- [ ] Checking stock levels
- [ ] Reporting low stock
- [ ] Receiving stock
- [ ] Stock adjustments

### Troubleshooting
- [ ] What to do if offline
- [ ] What to do if payment fails
- [ ] Who to contact for support

---

## GO-LIVE DAY CHECKLIST

### Morning (Before Opening)
- [ ] System health check
- [ ] Database connectivity verified
- [ ] Staff logged in
- [ ] Till sessions opened
- [ ] Opening float counted
- [ ] Test transaction processed
- [ ] Card machine tested

### During Service
- [ ] Monitor for errors
- [ ] Check offline indicator
- [ ] Verify inventory deducting
- [ ] Support on standby

### Evening (After Close)
- [ ] All till sessions closed
- [ ] Daily cashup completed
- [ ] Variance explained (if any)
- [ ] Cash counted and secured
- [ ] System logs reviewed
- [ ] Issues documented

---

## POST-LAUNCH MONITORING (Week 1)

### Daily Checks
- [ ] Sales processed correctly
- [ ] Inventory accurate
- [ ] No sync issues
- [ ] Staff feedback collected
- [ ] Bug reports reviewed

### End of Week 1
- [ ] Sales report accurate
- [ ] Inventory report matches physical
- [ ] Staff comfortable with system
- [ ] Issues prioritized for fixes

---

## ROLLBACK PLAN

If critical issues occur:

1. **Immediate**: Switch to manual cash register
2. **Document**: Record all manual transactions
3. **Fix**: Resolve system issues
4. **Sync**: Enter manual transactions into system
5. **Verify**: Reconcile all data

---

## CONTACTS

| Role | Name | Phone |
|------|------|-------|
| Technical Support | TBD | TBD |
| Branch Manager | TBD | TBD |
| Owner | TBD | TBD |

---

## SIGN-OFF

| Item | Approved By | Date |
|------|-------------|------|
| System Ready | | |
| Staff Trained | | |
| Hardware Ready | | |
| Go-Live Approved | | |
