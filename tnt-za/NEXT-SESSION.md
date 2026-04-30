# TnT-ZA — Next Session Plan

**Date:** After 29 March 2026
**Current State:** Deployed + UAT in progress
**Live URL:** https://tntilco.cleva-ai.co.za

---

## What Was Deployed (28-29 March Sprint)

### Pages Live: 35+
- Dashboard (7 role layouts + notifications + forecast)
- My Shift, Task Board (Kanban), Tasks & SOPs
- Facility 360 Drilldown, BayGrid (4 rows per bay, mixed strains)
- Grow Calendar, Mothers + Timeline, Clone Tracking (M01-01 auto-IDs)
- Mortality Register, Strains Analytics, Feeding & Irrigation
- Plants, Containers, Batches (+ destruction), Lab + COA
- Trim Sessions (25 trimmers), Tickets (accordion by stage)
- Assets (3-tier), Dispatch, Security, Compliance, QMS
- Site Master File, Audit Trail, Users (21 roles), Onboarding Wizard
- Scan & Weigh (AI), QR Provenance

### Roles: 21
```
Level 5: SUPER_ADMIN
Level 4: TENANT_ADMIN, RESPONSIBLE_PHARMACIST
Level 3: FM, PROCESSING_MGR, PROCESSING_SUPERVISOR, FACILITY_SUPERVISOR,
         QA_INSPECTOR, MAINTENANCE_MGR, HEAD_OF_CULTIVATION, NURSERY_MGR
Level 2: CULTIVATOR, LAB_TECH, IRRIGATION_TECH
Level 1: SECURITY, DELIVERY_DRIVER, TRIMMER, GENERAL_WORKER, HOUSEKEEPING, LAUNDRY
Level 0: VIEWER
```

### Backend: 35 route files, 60+ models, 40+ API endpoints per domain

---

## Outstanding — Build Next Session

### Priority 1: MUST DO

| # | Feature | Description | Est. |
|---|---------|------------|------|
| 1 | **Brand Update** | Change from ILCO green to Origin design system: black, gold (#C9A84C), white accent. Update all CSS variables, login page, sidebar, cards. | 2hrs |
| 2 | **Owner Dashboard** | Rename Tenant Admin → Owner. 360 view: iFarm stats + Origin retail stats + combined P&L overview. | 2hrs |
| 3 | **Client Dashboard** | Clients log in → see their orders, COAs, delivery status, batch provenance. New ROLE: CLIENT. | 3hrs |
| 4 | **Delivery System** | Delivery types: Self deliver, Courier (First Freight), Client pickup. Waybill creation. DELIVERY_DRIVER role wired. | 2hrs |
| 5 | **Photo Proof on Steps** | Camera button on every workflow step — attach photo evidence. Upload to server. Visible in audit trail. | 2hrs |
| 6 | **Updated Organogram** | Visual org chart reflecting 21 roles + reporting lines. HTML + PDF. | 1hr |

### Priority 2: HIGH

| # | Feature | Description | Est. |
|---|---------|------------|------|
| 7 | **Calendar Staff Allocation UI** | FM taps day on calendar → assign staff + tasks. Currently API only, needs frontend. | 2hrs |
| 8 | **Tasks to Multiple Staff** | Task can be assigned to 2+ people. Each tracks their own completion. | 1hr |
| 9 | **SOP Workflow** | Task → QA formats into official SOP → submitted to SOP Library. Draft → Review → Approved. | 2hrs |
| 10 | **Document Approval UI** | ComplianceApproval model exists. Build frontend: draft → review → RP → approve flow. | 2hrs |
| 11 | **QA-Controlled Viewer Access** | SAHPRA inspector requests access → QA allocates viewing window (date/time). Expires after window. | 2hrs |
| 12 | **Deficiency Trackback** | From any mortality/anomaly → trace back through previous tasks to find root cause pattern. | 2hrs |

### Priority 3: MEDIUM

| # | Feature | Description | Est. |
|---|---------|------------|------|
| 13 | **Calendar Amendment Log** | When FM changes grow calendar → log who, when, what changed, why. Audit trail for schedule changes. | 1hr |
| 14 | **Repeating/Pinned Tasks** | FM can pin daily recurring tasks. Auto-create each day. Unpin to stop. | 1hr |
| 15 | **Stale Ticket Detection** | Auto-flag tickets not actioned within X hours. Escalate to FM. | 1hr |
| 16 | **Origin POS Integration** | API bridge: released batches → Origin stock. Orders → batch allocation. Stock sync. | 4hrs |
| 17 | **IoT Sensor Auto-Readings** | Sensors push readings via API. Dashboard shows live environment data. | 2hrs |
| 18 | **Exec Summary on Brand** | Update stakeholder docs to Origin black/gold/white design. | 1hr |

---

## UAT Feedback to Address

_(Fill in from facility testing)_

| Issue | Page | Reported By | Status |
|-------|------|------------|--------|
| | | | |
| | | | |
| | | | |

---

## Staff Assignments (Confirmed)

| Person | Role | Email |
|--------|------|-------|
| Floris | SUPER_ADMIN | superilco@cleva-ai.co.za |
| Floris | TENANT_ADMIN | florisolivier7@gmail.com |
| Ilze | TENANT_ADMIN (Owner) | ilze@ilcofarming.co.za — NOT ACTIVE YET |
| Ray | FACILITY_MANAGER | ray@ilcofarming.co.za |
| Lou | HEAD_OF_CULTIVATION | lou@ilcofarming.co.za |
| Jannette (JR) | PROCESSING_MANAGER | jr@ilcofarms.co.za |
| Loraine | FACILITY_SUPERVISOR | loraine@ilcofarms.co.za |
| Keke | LAB_TECH | keke@ilcofarms.co.za |
| Sipho | SECURITY_OFFICER | sipho@ilcofarms.co.za |
| 25 Trimmers | TRIMMER | Create via Users page |
| General workers can clone | GENERAL_WORKER | Level 1 access to clone ops |

---

## Technical Notes

- PIN login: 123456 for all UAT accounts (stored PIN fallback enabled)
- Deploy script: `bash deploy.sh` — uploads + schema push + seeds + restart
- Frontend build: `cd frontend && npm run build`
- Backend build: `cd backend && npm run build`
- Schema: `npx prisma validate && npx prisma generate && npx prisma db push`
- Grow calendar format: matches ILCO Excel schedules (GH1 Batch #02, GH2 Batch #01)
- Clone flow: Mother → "20 cuttings" → auto M01-01 to M01-20 → transplant → plant IDs activated
- RP signs off on ALL processing steps (9-14), not just Step 14
- Bay rows can have mixed strains (per-position tracking)
- Forecast: auto-generates tickets from grow calendar for next 3 days

---

## Session Start Checklist

1. [ ] Run `bash deploy.sh` to get latest code on server
2. [ ] Check UAT feedback — any bugs to fix first?
3. [ ] Start with brand update (black/gold/white) — highest visual impact
4. [ ] Build Owner Dashboard (360 view)
5. [ ] Build Client Dashboard + Delivery system
6. [ ] Add photo proof to workflow steps
7. [ ] Calendar staff allocation UI
8. [ ] Generate updated organogram

---

*This document should be loaded at the start of the next Claude Code session.*
