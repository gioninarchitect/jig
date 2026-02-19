# CBD Wellness 24 - Testing Guide

## Test Environment Setup

The system has been seeded with test users, lifestyle cannabis products, and medical cannabis products for comprehensive testing.

---

## Test Users

All passwords follow the format: `[Role]123!`

### 1. Admin User
- **Email**: admin@cbdwellness24.co.za
- **Password**: Admin123!
- **Role**: Admin
- **Access**: Full system access, admin panel
- **Test URL**: http://localhost:3001/admin.html

### 2. Store Manager
- **Email**: manager@cbdwellness24.co.za
- **Password**: Manager123!
- **Role**: Staff Manager
- **Permissions**: Branch management, inventory, staff, POS, sales reports, suppliers
- **Branch**: Main Store (MAIN)
- **Test URL**: http://localhost:3001/dashboard.html

### 3. Staff Assistant / Staff Assistant
- **Email**: assistant@cbdwellness24.co.za
- **Password**: Assistant123!
- **Role**: Staff Assistant
- **Permissions**: POS/Sales only
- **Branch**: Main Store (MAIN)
- **Test URL**: http://localhost:3001/dashboard.html

### 4. Regular User (Lifestyle Customer)
- **Email**: user@cbdwellness24.co.za
- **Password**: User123!
- **Role**: User
- **Section 21 Status**: None
- **Access**: Lifestyle cannabis products, can upload Section 21 authorization
- **Test URL**: http://localhost:3001/dashboard.html

### 5. Pending Section 21 User
- **Email**: pending@cbdwellness24.co.za
- **Password**: Pending123!
- **Role**: User
- **Section 21 Status**: Pending review
- **Access**: Lifestyle products, Section 21 under verification
- **Test URL**: http://localhost:3001/dashboard.html

### 6. Patient (Approved Section 21)
- **Email**: patient@cbdwellness24.co.za
- **Password**: Patient123!
- **Role**: User
- **Section 21 Status**: Approved
- **Authorization Number**: S21-2024-001234
- **Doctor**: Dr. Jane Wilson (MP-123456)
- **Issue Date**: June 1, 2024
- **Expiry Date**: December 1, 2024
- **Conditions**: Chronic Pain, Anxiety
- **Access**: Full access to lifestyle AND medical cannabis products
- **Test URL**: http://localhost:3001/dashboard.html

---

## Test Products

### Lifestyle Cannabis Products (9 total)

#### Cannabis Flower (3 products)
1. **Premium Sativa - Durban Poison** (LF-001)
   - Price: R350.00
   - THC: 18.5% | CBD: 0.5%
   - Weight: 3.5g
   - Effects: Energetic, Uplifted, Creative, Focused

2. **Indica Blend - Northern Lights** (LF-002)
   - Price: R320.00
   - THC: 16.0% | CBD: 1.0%
   - Weight: 3.5g
   - Effects: Relaxed, Sleepy, Happy, Euphoric

3. **Hybrid - Blue Dream** (LF-003)
   - Price: R380.00
   - THC: 17.5% | CBD: 0.8%
   - Weight: 3.5g
   - Effects: Balanced, Creative, Relaxed, Happy

#### Pre-Rolls (3 products)
1. **Sativa Pre-Roll - 5 Pack** (PR-001)
   - Price: R250.00
   - 5x 0.5g joints (2.5g total)
   - THC: 18.0% | CBD: 0.5%

2. **Indica Pre-Roll - 5 Pack** (PR-002)
   - Price: R250.00
   - 5x 0.5g joints (2.5g total)
   - THC: 16.5% | CBD: 1.0%

3. **CBD Rich Pre-Roll - 5 Pack** (PR-003)
   - Price: R280.00
   - 5x 0.5g joints (2.5g total)
   - THC: 8.0% | CBD: 8.0% (1:1 ratio)

#### Vape Cartridges (3 products)
1. **Sativa Vape Cartridge - 1g** (VP-001)
   - Price: R450.00
   - THC: 85.0% | CBD: 2.0%
   - 510 thread compatible

2. **Indica Vape Cartridge - 1g** (VP-002)
   - Price: R450.00
   - THC: 82.0% | CBD: 3.0%
   - 510 thread compatible

3. **Full Spectrum CBD Vape - 1g** (VP-003)
   - Price: R420.00
   - THC: 10.0% | CBD: 75.0%
   - 510 thread compatible

---

### Medical Cannabis Products - Section 21 (8 total)

#### Medical Cannabis Flower (3 products)
1. **Medical THC Flower - High Potency** (MED-FL-001)
   - Price: R1,250.00
   - THC: 22.0% | CBD: 0.5%
   - Weight: 28g (1oz)
   - Medical Uses: Chronic Pain, Insomnia, Muscle Spasms
   - Dosage: Start 0.1-0.2g, increase under supervision

2. **Medical CBD Flower - 1:1 THC:CBD** (MED-FL-002)
   - Price: R1,150.00
   - THC: 10.0% | CBD: 10.0%
   - Weight: 28g (1oz)
   - Medical Uses: Anxiety, Inflammation, PTSD, Chronic Pain
   - Dosage: Start 0.2-0.3g, adjust based on symptoms

3. **Medical CBD Flower - High CBD** (MED-FL-003)
   - Price: R980.00
   - THC: 2.0% | CBD: 18.0%
   - Weight: 28g (1oz)
   - Medical Uses: Epilepsy, Anxiety, Inflammation, Neuropathic Pain
   - Dosage: Start 0.3-0.5g, can increase safely

#### Medical Cannabis Oils (3 products)
1. **Medical THC Oil - 30ml** (MED-OIL-001)
   - Price: R850.00
   - Concentration: 20mg/ml THC
   - Total: 600mg THC
   - Medical Uses: Chronic Pain, Insomnia, Cancer symptoms, HIV/AIDS
   - Dosage: Start 0.25ml (5mg THC) daily, increase every 3-5 days

2. **Medical CBD Oil - 1:1 THC:CBD** (MED-OIL-002)
   - Price: R780.00
   - Concentration: 10mg/ml THC + 10mg/ml CBD
   - Total: 300mg THC + 300mg CBD
   - Medical Uses: Pain, Anxiety, PTSD, Inflammation, MS
   - Dosage: Start 0.5ml (5mg:5mg) twice daily

3. **Medical CBD Oil - High CBD** (MED-OIL-003)
   - Price: R720.00
   - Concentration: 25mg/ml CBD
   - Total: 750mg CBD
   - Medical Uses: Epilepsy, Seizures, Anxiety, Inflammation
   - Dosage: Start 1ml (25mg CBD) twice daily, up to 2ml three times daily

#### Medical Capsules (2 products)
1. **Medical THC Capsules - 30 Count** (MED-CAP-001)
   - Price: R650.00
   - Dosage: 10mg THC per capsule
   - Medical Uses: Chronic Pain, Insomnia, Appetite
   - Instructions: 1 capsule evening, effects 1-2 hours, max 3/day

2. **Medical CBD Capsules - 30 Count (1:1)** (MED-CAP-002)
   - Price: R580.00
   - Dosage: 5mg THC + 5mg CBD per capsule
   - Medical Uses: Anxiety, Mild Pain, PTSD, Inflammation
   - Instructions: 1-2 capsules twice daily with food

---

## Testing Scenarios

### Scenario 1: Regular User - Lifestyle Cannabis Shopping

**Login**: user@cbdwellness24.co.za / User123!

**Steps**:
1. Navigate to http://localhost:3001/login.html
2. Login with credentials
3. Verify redirect to dashboard
4. Check welcome message and membership level
5. Click on "Lifestyle Cannabis" tab
6. Browse lifestyle products (flower, pre-rolls, vapes)
7. Click on a product to view details
8. Add products to cart
9. View cart and proceed to checkout
10. Verify Section 21 is NOT accessible (locked)

**Expected Results**:
- Dashboard loads successfully
- Lifestyle Cannabis tab shows 9 products
- Products display with price, THC/CBD content, effects
- Can add to cart without restrictions
- Medical Cannabis tab shows lock icon or prompt to upload Section 21

---

### Scenario 2: Patient - Medical Cannabis Access

**Login**: patient@cbdwellness24.co.za / Patient123!

**Steps**:
1. Navigate to http://localhost:3001/login.html
2. Login with credentials
3. Verify dashboard shows "Patient" or "Medical Member" status
4. Click on "Medical Cannabis" tab
5. Verify Section 21 status is displayed:
   - Authorization Number: S21-2024-001234
   - Doctor: Dr. Jane Wilson
   - Status: Approved
   - Expiry: December 1, 2024
6. Browse medical cannabis products
7. View product details including medical uses and dosage
8. Add medical products to cart
9. Verify prescription requirement message
10. Also test access to Lifestyle Cannabis tab

**Expected Results**:
- Dashboard shows approved Section 21 status
- Medical Cannabis tab is accessible
- Shows 8 medical products (flower, oils, capsules)
- Products display medical information
- Prescription reminder shown for checkout
- Can also access lifestyle products

---

### Scenario 3: Pending Section 21 User

**Login**: pending@cbdwellness24.co.za / Pending123!

**Steps**:
1. Login to dashboard
2. Click on "Medical Cannabis" tab
3. Verify status shows "Pending Review"
4. Check if medical products are locked
5. Verify message about verification timeframe (24-48 hours)

**Expected Results**:
- Section 21 status shows "Pending"
- Medical products may be blurred/locked
- Clear message about approval process
- Can still access lifestyle products

---

### Scenario 4: Store Manager - POS and Inventory

**Login**: manager@cbdwellness24.co.za / Manager123!

**Steps**:
1. Login to dashboard
2. Verify access to manager-specific features:
   - Inventory Management
   - Staff Management
   - Sales Reports
   - POS System
3. View product inventory levels
4. Test adding/editing products
5. View sales analytics

**Expected Results**:
- Manager dashboard with admin features
- Can view all products (lifestyle + medical)
- Has access to inventory and staff tools
- Can generate reports

---

### Scenario 5: Staff Assistant - POS Only

**Login**: assistant@cbdwellness24.co.za / Assistant123!

**Steps**:
1. Login to dashboard
2. Verify limited access (POS only)
3. Cannot access:
   - Inventory management
   - Staff management
   - Reports
4. Can process sales through POS

**Expected Results**:
- Limited dashboard view
- POS access only
- No inventory or admin features

---

## API Testing

### Get Lifestyle Products
```bash
curl http://localhost:3001/api/v1/products?category=flower,pre-rolls,vapes&track=lifestyle
```

### Get Medical Products (requires auth)
```bash
curl http://localhost:3001/api/v1/products?track=medical \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Login User
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@cbdwellness24.co.za","password":"User123!"}'
```

### Login Patient
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@cbdwellness24.co.za","password":"Patient123!"}'
```

---

## Quick Reference

### Server URLs
- **Frontend**: http://localhost:3001
- **Login**: http://localhost:3001/login.html
- **Dashboard**: http://localhost:3001/dashboard.html
- **Admin**: http://localhost:3001/admin.html
- **API Base**: http://localhost:3001/api/v1

### Database
- **Name**: cbdwellness24
- **Connection**: mongodb://localhost:27017/cbdwellness24

### Seeding Scripts
```bash
# Seed test users
node backend/scripts/seed-test-users.js

# Seed lifestyle products
node backend/scripts/seed-lifestyle-products.js

# Seed medical products
node backend/scripts/seed-medical-products.js
```

---

## Key Features to Test

### User Dashboard
- [ ] Login/Logout functionality
- [ ] Dashboard overview with stats
- [ ] Lifestyle Cannabis tab
- [ ] Medical Cannabis tab (with Section 21)
- [ ] My Health portal
- [ ] Order history
- [ ] Account settings

### Product Functionality
- [ ] Product listing and filtering
- [ ] Product detail modals
- [ ] Add to cart
- [ ] Cart management
- [ ] Checkout process

### Section 21 Features
- [ ] Upload Section 21 authorization
- [ ] View authorization status
- [ ] Access medical products
- [ ] Prescription requirements
- [ ] Expiry date tracking

### Role-Based Access
- [ ] Admin full access
- [ ] Manager permissions
- [ ] Staff Assistant limited access
- [ ] User lifestyle access
- [ ] Patient medical access

---

## Notes

- All test users have verified email addresses
- Patient Section 21 authorization expires December 1, 2024
- Medical products require prescription for purchase
- Lifestyle products have no restrictions
- All prices include 15% VAT

---

## Troubleshooting

### Server not running
```bash
npm run dev
```

### Database connection issues
Check MongoDB is running:
```bash
mongosh
```

### Products not showing
Re-run seeding scripts:
```bash
node backend/scripts/seed-lifestyle-products.js
node backend/scripts/seed-medical-products.js
```

### Login issues
Verify user exists:
```bash
mongosh cbdwellness24
db.users.findOne({email: "user@cbdwellness24.co.za"})
```
