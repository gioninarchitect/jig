# 🚨 SECTION 21 MEDICAL CANNABIS COMPLIANCE SYSTEM

## CRITICAL BUSINESS RULES

### ⚠️ NO MEDICAL CANNABIS WITHOUT VALID SECTION 21

**ABSOLUTE REQUIREMENTS:**
1. Medical cannabis products NEVER appear on public website
2. Medical cannabis ONLY accessible after login + approved Section 21
3. Prescription must be reviewed and approved by admin
4. Prescription valid for exactly 6 months
5. System auto-prompts for renewal before expiry
6. ZERO purchases allowed without valid, approved Section 21

---

## ARCHITECTURE OVERVIEW

### **PUBLIC WEBSITE (No Login Required)**
✅ **ONLY** accessories and CBD products visible:
- Glass water pipes, grinders, rolling papers
- Vape pens, storage jars
- CBD oils, wellness products
- Coffee shop menu items (La Brewha, Bean & Bud)

❌ **NO medical cannabis products**
❌ **NO prescription-required items**

### **DASHBOARD (After Login)**
📋 **Section 21 Medical Cannabis Section:**
- Displayed as GREYED OUT horizontal carousel
- Shows medical cannabis products (disabled/locked)
- Click triggers Section 21 upload modal
- User uploads prescription document (PDF/JPG/PNG)
- Document sent to admin for review

---

## WORKFLOW

### 1. **User Uploads Section 21**
```
User logs in → Dashboard → Section 21 carousel (greyed out)
→ Click → Upload modal opens
→ User uploads prescription letter
→ Status: PENDING (cannot access products)
```

### 2. **Admin Reviews & Approves**
```
Admin panel → Section 21 pending documents
→ Reviews prescription
→ Approves or Rejects
→ If Approved: User can now access medical cannabis
```

### 3. **Access Granted**
```
Status: APPROVED → Section 21 carousel becomes active
→ User can browse medical cannabis products
→ User can add to cart and purchase
→ Expiry date tracked: 6 months from issue
```

### 4. **Expiry Management**
```
30 days before expiry → Email notification sent
14 days before expiry → Reminder sent
7 days before expiry → Final reminder
On expiry date → Access revoked automatically
→ User must upload new prescription
```

---

## API ENDPOINTS

### **User Endpoints:**
```
GET  /api/v1/section21/check-access/:userId
     → Check if user can access medical cannabis

GET  /api/v1/section21/user/:userId
     → Get user's Section 21 documents

POST /api/v1/section21/upload
     → Upload new Section 21 document
     → Body: userId, prescriptionNumber, prescribedBy, issuedDate
     → File: document (PDF/JPG/PNG, max 10MB)
```

### **Admin Endpoints:**
```
GET  /api/v1/section21/admin/pending
     → Get all pending documents for review

POST /api/v1/section21/admin/approve/:documentId
     → Approve a Section 21 document
     → Body: adminId, adminNotes

POST /api/v1/section21/admin/reject/:documentId
     → Reject a Section 21 document
     → Body: adminId, rejectionReason, adminNotes

GET  /api/v1/section21/admin/expiring
     → Get documents expiring within 30 days
```

---

## DATABASE MODEL

### **Section21Document Schema:**
```javascript
{
  userId: ObjectId (ref: User)
  documentUrl: String (file path)
  documentType: String (pdf|jpg|jpeg|png)

  prescriptionNumber: String
  prescribedBy: String (doctor name)
  issuedDate: Date
  expiryDate: Date (auto-calculated: +6 months)

  status: String (pending|approved|rejected|expired)
  isExpired: Boolean

  reviewedBy: ObjectId (ref: User - admin)
  reviewedAt: Date
  rejectionReason: String
  adminNotes: String

  expiryNotificationSent: Boolean
  renewalReminders: Array

  replacedBy: ObjectId (for renewals)
  replaces: ObjectId (chain of renewals)
}
```

---

## SECURITY MEASURES

### **Frontend Protection:**
1. Medical cannabis products hidden from public routes
2. Dashboard checks Section 21 status before rendering
3. Add-to-cart disabled for medical cannabis without approval
4. Checkout validates Section 21 before payment

### **Backend Protection:**
1. All medical cannabis endpoints require authentication
2. Purchase API validates active Section 21
3. Auto-expire documents after 6 months
4. Admin-only approval endpoints
5. File upload validation (size, type)

---

## PRODUCT CATEGORIES

### **Public Products** (accessories category):
- Glass water pipes
- Grinders
- Rolling papers
- Vape pens
- Storage jars
- CBD oils (non-prescription)

### **Section 21 Only** (medical category):
- Medical cannabis strains
- THC oils/extracts
- Cannabis edibles (medical)
- High-THC products
- Prescription cannabis

---

## ADMIN RESPONSIBILITIES

### **Document Review Checklist:**
1. ✅ Verify prescription is from licensed doctor
2. ✅ Check prescription number is valid
3. ✅ Confirm issue date is recent
4. ✅ Verify patient details match user account
5. ✅ Check document is clear and legible
6. ✅ Approve or Reject with notes

### **Monitoring:**
- Check pending documents daily
- Review expiring prescriptions weekly
- Send renewal reminders automatically
- Audit medical cannabis sales monthly

---

## FILE STORAGE

**Location:** `/uploads/section21/`
**Format:** `section21-{timestamp}-{random}.{ext}`
**Access:** Protected route, admin-only viewing
**Retention:** 12 months after expiry (audit trail)

---

## CRON JOBS (To Be Implemented)

```javascript
// Daily: Check for expired documents
0 0 * * * → Mark expired documents, revoke access

// Daily: Send renewal reminders
0 9 * * * → Email users with expiring prescriptions

// Weekly: Admin report
0 9 * * 1 → Send admin summary of pending/expiring docs
```

---

## NEXT STEPS

1. ✅ Section21Document model created
2. ✅ API routes implemented
3. ✅ File upload configured
4. 🔄 Dashboard UI for Section 21 upload
5. 🔄 Admin approval interface
6. 🔄 Medical cannabis product seeding
7. ⏳ Email notification system
8. ⏳ Expiry tracking cron jobs

---

## COMPLIANCE NOTES

**This system ensures:**
- No underage access (18+ age gate on homepage)
- No medical cannabis without prescription
- Full audit trail of all approvals
- Automatic expiry enforcement
- Admin oversight on all prescriptions
- Legal compliance with South African Section 21 regulations

**NEVER compromise on these requirements.**
