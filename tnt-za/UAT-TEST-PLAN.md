# TnT-ZA — UAT Test Plan

> Version 2.0 | Date: 28 March 2026 | Site: https://tntilco.cleva-ai.co.za

---

## Test Accounts

| # | Name | Role | Email | PIN |
|---|------|------|-------|-----|
| 1 | Floris | SUPER_ADMIN | superilco@cleva-ai.co.za | (existing) |
| 2 | Ilze | TENANT_ADMIN | ilze@ilcofarming.co.za | 123456 |
| 3 | RP | RESPONSIBLE_PHARMACIST | rp@ilcofarms.co.za | 123456 |
| 4 | Ray | FACILITY_MANAGER | ray@ilcofarming.co.za | 123456 |
| 5 | Jannette | PROCESSING_MANAGER | jr@ilcofarms.co.za | 123456 |
| 6 | Loraine | FACILITY_SUPERVISOR | loraine@ilcofarms.co.za | 123456 |
| 7 | QA | QA_INSPECTOR | qa@ilcofarms.co.za | 123456 |
| 8 | Maintenance | MAINTENANCE_MANAGER | maint@ilcofarms.co.za | 123456 |
| 9 | Head Cult | HEAD_OF_CULTIVATION | headcult@ilcofarms.co.za | 123456 |
| 10 | Lou | CULTIVATOR | lou@ilcofarming.co.za | 123456 |
| 11 | Keke | LAB_TECH | keke@ilcofarms.co.za | 123456 |
| 12 | Irrigation | IRRIGATION_TECH | irrigation@ilcofarms.co.za | 123456 |
| 13 | Sipho | SECURITY_OFFICER | sipho@ilcofarms.co.za | 123456 |
| 14 | Trimmer1 | TRIMMER | trimmer1@ilcofarms.co.za | 123456 |
| 15 | Housekeeping | HOUSEKEEPING | hk@ilcofarms.co.za | 123456 |
| 16 | Laundry | LAUNDRY | laundry@ilcofarms.co.za | 123456 |
| 17 | Inspector | VIEWER | inspector@ilcofarms.co.za | 123456 |

---

## Test Cases by Workflow Step

### STEP 1: Mother Plants (Lou — Cultivator)
- [ ] **TC-001** Open Mothers page → see empty state or existing mothers
- [ ] **TC-002** Tap "Register Mother" → fill identifier (M1), strain (Durban Poison), source (Purchased), breeder (Dutch Passion) → Submit
- [ ] **TC-003** Verify mother appears in list with ACTIVE status
- [ ] **TC-004** Tap mother → see detail modal with clone history (empty)

### STEP 2: Clone (Lou — Cultivator)
- [ ] **TC-005** On mother card, tap "Clone" button → enter 10 cuttings → Submit
- [ ] **TC-006** Verify clone tray CT-2026-001 created
- [ ] **TC-007** Verify mother's total clones updated to 10
- [ ] **TC-008** Verify toast: "Clone tray CT-2026-001 created — 10 cuttings"

### STEP 3: Rooting (Lou — Cultivator)
- [ ] **TC-009** Clone tray shows in Active Clone Trays dashboard widget
- [ ] **TC-010** Progress bar shows rooting days

### STEP 4: Transplant / BayGrid (Lou — Cultivator)
- [ ] **TC-011** Open BayGrid → see empty state or greenhouses
- [ ] **TC-012** Tap "Add Greenhouse" → name: GH1, type: Mixed, bays: 6 → Submit
- [ ] **TC-013** Verify 6 bays created (all EMPTY)
- [ ] **TC-014** Tap Bay 1 → see EMPTY status → tap "Allocate Plants"
- [ ] **TC-015** Enter strain: Durban Poison, 8 plants → Submit
- [ ] **TC-016** Verify bay shows green color, strain name, 8/8 count

### STEP 5-7: Veg → Flip → Flower
- [ ] **TC-017** Open Grow Calendar → create schedule: GH1 Batch #01, Durban Poison, start date today, 14 veg + 56 flower
- [ ] **TC-018** Verify calendar shows day-by-day tasks with phase colors
- [ ] **TC-019** Verify today is highlighted with green ring
- [ ] **TC-020** Tap a day with tasks → see detail modal with instructions + IPM

### STEP 8: Harvest (Lou → JR handover)
- [ ] **TC-021** Open Plants → "Register Plant" → strain: Durban Poison → Submit
- [ ] **TC-022** Plant gets ZA-XXXXXX identifier
- [ ] **TC-023** Tap plant → "Advance to VEGETATIVE" → enter weight → Confirm
- [ ] **TC-024** Advance through all phases to HARVESTED
- [ ] **TC-025** Open Batches → "Create Batch" → select harvested plants → Submit
- [ ] **TC-026** Batch B-2026-001 created

### STEP 9: Wet Receiving (JR — Processing Manager)
- [ ] **TC-027** Login as jr@ilcofarms.co.za
- [ ] **TC-028** Open Containers → "Register Container" → type: BIN → Submit
- [ ] **TC-029** Tap container → "Load" → enter weight → Confirm
- [ ] **TC-030** Weight recorded in timeline

### STEP 10: Drying
- [ ] **TC-031** Register RACK container → "Move Zone" to DRY zone
- [ ] **TC-032** Verify zone transition logged

### STEP 11: Debuc (JR ONLY)
- [ ] **TC-033** Register new BIN containers for debuc output
- [ ] **TC-034** Each bin weighed via "Load" action

### STEP 12: Trim (JR creates, Trimmers execute)
- [ ] **TC-035** Login as JR → Open Trim Sessions → "New Session" → select batch → Submit
- [ ] **TC-036** Session created with IN_PROGRESS status
- [ ] **TC-037** "Assign Trimmer" → select Trimmer1, weight: 45g → Submit
- [ ] **TC-038** Login as trimmer1@ilcofarms.co.za
- [ ] **TC-039** Open Trim Sessions → see assigned session
- [ ] **TC-040** Tap session → see assignment with 45g IN
- [ ] **TC-041** "Record Output" → weight out: 35g, waste: 8g → Submit
- [ ] **TC-042** Verify variance calculation shows (45 - 35 - 8 = 2g = 4.4%)
- [ ] **TC-043** Login as JR → "Complete Session" → verify variance alert if >2%

### STEP 13: Cure
- [ ] **TC-044** Register CURE container → Load product → weight recorded

### STEP 14: Store & QA (Keke + QA + RP)
- [ ] **TC-045** Login as keke@ilcofarms.co.za (Lab Tech)
- [ ] **TC-046** Open Lab → select batch → "Submit Result" → POTENCY, value: 22.5, pass: true
- [ ] **TC-047** Submit all 8 test types (all PASS)
- [ ] **TC-048** "Generate COA" button appears → tap → COA generated
- [ ] **TC-049** Login as qa@ilcofarms.co.za → see QA dashboard widgets
- [ ] **TC-050** Login as rp@ilcofarms.co.za → see batch awaiting RP sign-off

### STEP 15-17: Sale → Dispatch → Retail
- [ ] **TC-051** Login as ilze@ilcofarming.co.za → see full admin dashboard
- [ ] **TC-052** All widgets visible: stats, BayGrid, staff, compliance, QA, risk, tickets, activity
- [ ] **TC-053** Open Tickets → "New Ticket" → type: REQUISITION, stage: TRIM, "50x scissors", R500 → Submit
- [ ] **TC-054** Requisition appears with APPROVE button for Ilze
- [ ] **TC-055** Tap "Approve" → ticket resolved

---

## Test Cases by Feature

### Tickets + Approvals
- [ ] **TC-060** Each role only sees tickets from their workflow stages
- [ ] **TC-061** Cultivator sees: Propagation, Vegetative, Flowering, Harvest tickets
- [ ] **TC-062** Processing Mgr sees: Wet Receiving, Drying, Debuc, Trim, Cure, Store/QA tickets
- [ ] **TC-063** Security sees: Dispatch, Facility tickets
- [ ] **TC-064** Viewer sees: all tickets, no edit buttons
- [ ] **TC-065** RP sees only RP_SIGNOFF tickets + own tickets
- [ ] **TC-066** Ilze sees ALL tickets + Approve/Reject buttons on requisitions

### Tasks & SOPs
- [ ] **TC-070** Login as Ray (FM) → Open Tasks → "Seed SAHPRA SOPs" → verify templates created
- [ ] **TC-071** "New Task" → assign to Lou, title: "Top plants Bay 1", due: tomorrow
- [ ] **TC-072** Login as Lou → see task in "My Tasks" on dashboard
- [ ] **TC-073** Tap "Done" → complete with notes
- [ ] **TC-074** KPI cards show actual values with progress bars

### Assets
- [ ] **TC-080** Open Assets → "Register Asset" → tier: Fixed, name: "GH1 Extractor Fan A", category: GREENHOUSE_INFRA, stage: VEGETATIVE → Submit
- [ ] **TC-081** Asset gets AST-000001 tag
- [ ] **TC-082** Register sensor: tier: Fixed, isSensor: true, type: TEMPERATURE, unit: °C
- [ ] **TC-083** Register consumable: tier: Consumable, name: "Nitrile Gloves", stock: 100, min: 20, unit: box
- [ ] **TC-084** Tap asset → 360 view with maintenance history
- [ ] **TC-085** "Log Maintenance" → type: Calibration → verify next calibration date updates

### Scan & Weigh
- [ ] **TC-090** Open Scan → "Scan Label" → open camera → photograph a QR/label
- [ ] **TC-091** System identifies container → shows action buttons
- [ ] **TC-092** Select "Load" → photograph scale → AI reads weight
- [ ] **TC-093** If weight variance >15% → red warning + "will trigger CRITICAL alert"
- [ ] **TC-094** "Confirm" → weight logged → timeline updated

### Compliance
- [ ] **TC-100** Open Compliance → see open anomalies
- [ ] **TC-101** Login as Ray → "Resolve" anomaly → enter investigation notes → Submit
- [ ] **TC-102** Anomaly marked resolved

### QMS
- [ ] **TC-110** Open QMS → "Add SOP" → title + content → Submit
- [ ] **TC-111** "Raise Deviation" → select SOP, severity: HIGH → Submit
- [ ] **TC-112** "Add Equipment" → calibrate button works

### Onboarding
- [ ] **TC-120** Login as new user (first time) → redirect to /onboarding
- [ ] **TC-121** Complete all 9 steps → "Setup complete" → redirect to dashboard
- [ ] **TC-122** Setup banner disappears after completion

### Audit
- [ ] **TC-130** Open Audit → see event log with timestamps + users
- [ ] **TC-131** "Export CSV" → downloads CSV file
- [ ] **TC-132** "PDF Package" → downloads compliance PDF

### Mobile UX
- [ ] **TC-140** Open on phone → bottom nav shows: Home, BayGrid, Scan, Tickets
- [ ] **TC-141** Tap "More" → sidebar opens with all nav items
- [ ] **TC-142** All modals slide up from bottom on mobile
- [ ] **TC-143** All buttons minimum 44px touch target
- [ ] **TC-144** Tables show as cards on mobile (<768px)
- [ ] **TC-145** Toast notifications appear above bottom nav

---

## Role-Based Dashboard Tests

| Role | Login | Expected Widgets |
|------|-------|-----------------|
| Tenant Admin | ilze@ | Stats + BayGrid + Staff + Compliance + Tickets + Tasks + Weight Alerts + Charts + QA + Risk + Facilities |
| RP | rp@ | Stats + BayGrid + Tickets (RP_SIGNOFF filtered) + Tasks |
| FM | ray@ | Stats + BayGrid + Tickets + Tasks + Compliance + Weight Alerts + Clones + Charts + Risk |
| Processing Mgr | jr@ | Stats + BayGrid + Tickets + Tasks + Weight Alerts + Charts |
| QA Inspector | qa@ | Stats + QA Overview + Compliance + Tasks + Tickets + Weight Alerts + Charts |
| Maintenance | maint@ | Stats + Tickets + Tasks + Weight Alerts + BayGrid + Activity |
| Cultivator | lou@ | Stats + BayGrid + Tasks + Clone Trays + Tickets + Phase Chart + Activity |
| Lab Tech | keke@ | Stats + Tasks + Tickets + Phase Chart + Activity |
| Security | sipho@ | Stats + Tasks + Tickets + BayGrid + Activity |
| Trimmer | trimmer1@ | Stats + Tasks + Tickets + BayGrid + Activity |
| Housekeeping | hk@ | Stats + Tasks + Tickets + BayGrid + Activity |
| Viewer | inspector@ | Stats + BayGrid + Tickets + Phase Chart + Activity (NO edit buttons) |

---

## Sign-Off

| Tester | Role | Date | Pass? | Notes |
|--------|------|------|-------|-------|
| | | | | |
| | | | | |
| | | | | |
