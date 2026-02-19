# Future Development: Branch & Franchise Management

**Status:** Backlog (Post-UAT)
**Priority:** High
**Requested:** 26 November 2025

---

## Overview

Enable admin self-service for onboarding new franchise branches without developer intervention. Currently branches must be added manually to MongoDB.

---

## Scope

| Component | Description | Hours | Cost (R500/hr) |
|-----------|-------------|-------|----------------|
| Branch CRUD API | POST/GET/PUT/DELETE /api/v1/branches endpoints | 3 | R1,500 |
| Admin Branches Tab | List, create, edit, deactivate branches in admin panel | 4 | R2,000 |
| Branch Inventory Setup | Auto-populate product inventory when branch created | 2 | R1,000 |
| Staff Assignment | Assign manager/assistants to branch, RBAC per branch | 2 | R1,000 |
| Branch Selector in POS | Dynamic dropdown (remove hardcoded branchId) | 1 | R500 |
| Testing & QA | End-to-end testing of branch workflows | 2 | R1,000 |

---

## Total Estimate

| | |
|---|---|
| **Total Hours** | 14 hours |
| **Total Cost** | R7,000 |

---

## Branch Model (Already Exists)

The data model supports:
- Branch code, name, type (retail/cafe/drive-through/warehouse/hybrid)
- Full address with GPS coordinates
- Operating hours per day
- POS tills with speed point configuration (Yoco, iKhokha, PayGate)
- Lifestyle and Medical track toggles
- Franchise owner assignment
- Banking details for EFT payments
- Cached sales statistics

---

## Admin UI Requirements

1. **Branches Tab** in admin.html
   - Table listing all branches (code, name, city, type, status)
   - "Add Branch" button opens modal form
   - Edit/Deactivate actions per row
   - Filter by city, type, active status

2. **Branch Form Fields**
   - Branch Code (auto-generated or manual)
   - Name, Type dropdown
   - Address fields (street, suburb, city, province, postal code)
   - Phone, Email
   - Operating hours grid (Mon-Sun with open/close times)
   - Tracks enabled (Lifestyle, Medical checkboxes)
   - Franchise toggle + owner assignment
   - Banking details section

3. **Post-Creation Automation**
   - Create BranchInventory records for all active products
   - Set default stock levels (configurable)
   - Notify franchise owner via email

---

## Notes

- Franchises are self-owned but operate within Basotho Medical Herbs system
- Each branch can have independent POS, inventory, and staff
- Head office retains visibility of all branch sales and inventory
- This was not in original spec - additional feature request

---

## Approval

- [ ] Client approval of scope and cost
- [ ] Development scheduled
- [ ] Deployed to production
