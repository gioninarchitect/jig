# TnT-ZA — Training Guide

> Quick-start guide per role. Open https://tntilco.cleva-ai.co.za on your phone.

---

## For Everyone — Getting Started

1. Open https://tntilco.cleva-ai.co.za on your phone or desktop
2. Enter your email → enter your PIN (123456 for UAT)
3. You'll see your **personalized dashboard** — different for each role
4. **Phone bottom nav**: Home, BayGrid, Scan, Tickets, More
5. Tap **More** for the full menu (28 pages)

### Your Login

| Name | Email | Role |
|------|-------|------|
| Floris | superilco@cleva-ai.co.za | Super Admin |
| Ilze | ilze@ilcofarming.co.za | Tenant Admin — approves everything |
| RP | rp@ilcofarms.co.za | Responsible Pharmacist — product sign-off |
| Ray | ray@ilcofarming.co.za | Facility Manager — all operations |
| Jannette (JR) | jr@ilcofarms.co.za | Processing Manager — steps 9-14 |
| Loraine | loraine@ilcofarms.co.za | Facility Supervisor — day-to-day |
| QA | qa@ilcofarms.co.za | QA Inspector — audit + sign-off |
| Maintenance | maint@ilcofarms.co.za | Maintenance Manager — equipment |
| Lou | lou@ilcofarming.co.za | Head of Cultivation — manages cultivators |
| Cultivator 1 | cult1@ilcofarms.co.za | Cultivator — reports to Lou |
| Cultivator 2 | cult2@ilcofarms.co.za | Cultivator — reports to Lou |
| Keke | keke@ilcofarms.co.za | Lab Tech — testing + COA |
| Irrigation | irrigation@ilcofarms.co.za | Irrigation Tech — feeding |
| Sipho | sipho@ilcofarms.co.za | Security — gate + dispatch |
| Trimmer 1 | trimmer1@ilcofarms.co.za | Trimmer |
| Trimmer 2 | trimmer2@ilcofarms.co.za | Trimmer |
| General Worker | worker@ilcofarms.co.za | General Worker |
| Housekeeping | hk@ilcofarms.co.za | Housekeeping |
| Laundry | laundry@ilcofarms.co.za | Laundry |
| SAHPRA Inspector | inspector@ilcofarms.co.za | Viewer — read-only |

**PIN for all UAT accounts: 123456**

---

## Head of Cultivation (Lou)

**Your role:** You manage the cultivators. You oversee steps 1-8: mothers, clones, BayGrid, grow calendar, and harvest. Cultivators report to you. You report to Loraine (Facility Supervisor).

### Your Dashboard
- Stats, BayGrid quick view, Tasks, Clone Trays, Tickets, Phase Chart, Activity

### Daily Routine
1. Open **Dashboard** → check "My Tasks" + clone tray progress
2. Open **BayGrid** → review all greenhouses, bay status, days in phase
3. Open **Grow Calendar** → today's schedule highlighted in green
4. Review any tickets from cultivators
5. Open **Mothers** → check clone success rates

### Key Pages
- **BayGrid** → visual greenhouse view, allocate/clear bays
- **Grow Calendar** → day-by-day schedule per greenhouse batch
- **Mothers** → register mothers, take cuttings, track clone trays
- **Strains** → performance analytics (rooting %, THC, yield per strain)
- **Tasks** → assign tasks to cultivators, review completed
- **Tickets** → review + resolve cultivation issues

### Register a Mother Plant
1. **Mothers** → **Register Mother**
2. Identifier: M1, Strain: Durban Poison, Source: Purchased, Breeder: Dutch Passion
3. Submit → appears in list

### Take Cuttings (Clone)
1. On mother card → **Clone** → enter 10 cuttings → Submit
2. Clone tray CT-2026-xxx created → track on dashboard widget

### Allocate Bay
1. **BayGrid** → tap an EMPTY bay → **Allocate Plants**
2. Enter strain + number of plants → Submit
3. Bay turns green with strain color

### Create Grow Schedule
1. **Grow Calendar** → **New Schedule**
2. Name: GH1 Batch #03, Strain: Durban Poison, GH: GH1, Start date, 14 veg + 56 flower
3. Calendar auto-populates: scouting, run-off, topping, spraying, cloning, harvest

---

## Cultivator (cult1, cult2)

**Your role:** You grow the plants. You report to Lou (Head of Cultivation) and Loraine (Facility Supervisor). Steps 1-8.

### Your Dashboard
- Stats, BayGrid quick view, Tasks due, Clone Trays, Tickets, Phase Chart

### Daily Routine
1. Open **Dashboard** → check "My Tasks" (what Lou assigned)
2. Open **Grow Calendar** → see today's tasks
3. Complete tasks: scouting, topping, defoliation, run-off tests
4. If you find an issue → raise a **Ticket** (stage: the step where you found it)

### Register a Plant
1. **Plants** → **Register Plant** → select strain → Submit
2. Plant gets ZA-XXXXXX identifier + QR

### Advance Plant Phase
1. Tap a plant → **Advance to [next phase]**
2. Enter weight if required → Confirm
3. At HARVEST: this is WET WEIGHT — most critical measurement

### Create a Batch (at Harvest)
1. **Batches** → **Create Batch** → select harvested plants → Submit
2. Batch B-2026-xxx created
3. **HANDOVER to JR** — she receives the material

### Record Feeding
1. **Feeding** → **Record Feed**
2. Select greenhouse, water volume, pH in, EC in
3. After watering: record run-off pH + EC
4. Submit → system alerts if pH out of range (5.5-6.8)

---

## Processing Manager (JR / Jannette)

**Your role:** You handle everything from wet receiving to cure. Debuc is YOUR sole responsibility. Steps 9-14.

### Your Dashboard
- Stats, BayGrid, Tickets, Tasks, Weight Alerts, Compliance, Charts

### Step 9 — Wet Receiving
1. **Containers** → **Register Container** → type: BIN → Submit
2. Tap container → **Load** → enter wet weight → Confirm
3. **VERIFY** weight matches what cultivator recorded at harvest
4. Any difference → ANOMALY auto-created → Ray + Ilze alerted

### Step 10 — Drying
1. Register RACK containers → **Load** product with dry weight
2. **Move Zone** to drying room
3. Daily: log temp + humidity in Tasks

### Step 11 — Debuc (JR ONLY)
1. Cut buds from stems → new BIN per output
2. **Containers** → **Register Container** for each bin
3. **Load** each bin with weighed product
4. Each bin gets QR label

### Step 12 — Trim Sessions
1. **Trim Sessions** → **New Session** → select batch
2. **Assign Trimmer** → select person → enter weight IN (grams they receive)
3. When trimmer returns → they tap **Record Output** (weight OUT + waste)
4. When all trimmers done → **Complete Session** → variance check
5. If IN ≠ OUT + WASTE (>2%) → ANOMALY flagged

### Step 13 — Cure
1. Register CURE containers → **Load** trimmed product
2. Track curing time (min 2 weeks)

---

## Lab Tech (Keke)

**Your role:** Test batches, generate COAs. Step 14.

### Your Dashboard
- Stats, Tasks, Tickets, Phase Chart, Activity

### Submit Test Results
1. **Lab** → find the batch
2. **Submit Result** → select test type (8 types: POTENCY, PESTICIDE, HEAVY_METALS, MICROBIAL, MOISTURE, MYCOTOXIN, RESIDUAL_SOLVENTS, TERPENE)
3. Enter value + pass/fail → Submit
4. Repeat for all 8 test types

### Generate COA
1. When all 8 tests PASS → **Generate COA** button appears
2. Tap → COA PDF generated with QR code
3. Batch status → RELEASED

### If a Test Fails
1. Batch auto-quarantined → 7 tasks created
2. Ray investigates, RP decides release or destroy

---

## Irrigation Tech

**Your role:** Feeding programs, pH/EC monitoring, run-off testing. Steps 5-7.

### Your Dashboard
- Stats, BayGrid, Tasks, Clone Trays, Tickets, Phase Chart

### Record Feeding
1. **Feeding** → **Record Feed**
2. Select greenhouse + bay (optional)
3. Enter: water volume (L), pH in, EC in
4. After watering: pH run-off, EC run-off
5. Submit → if pH < 5.5 or > 6.8 → alert

### Create Feed Plan
1. **Feeding** → **+ Plan**
2. Name, greenhouse, phase (Veg/Flower/Flush)
3. Plans show on feeding page for quick reference

### Monitor Stats
- Feeding page shows: active plans, records this week, avg pH, avg EC, total litres

---

## Facility Manager (Ray)

**Your role:** Oversee all 17 steps. Resolve anomalies. Manage tickets.

### Your Dashboard
- Stats, BayGrid, Tickets, Tasks, Compliance, Weight Alerts, Clone Trays, Phase Chart, Risk Gauges

### Resolve Anomalies
1. **Compliance** → see red anomaly cards
2. **Resolve** → enter investigation notes → Submit

### Manage Tickets
1. **Tickets** → filter by stage (Propagation, Drying, Trim, etc.)
2. Comment, assign, resolve
3. Requisitions → need Ilze's approval

### Weight Alerts
- Dashboard shows RED panel if any weight variance detected
- Investigate immediately — could indicate diversion

---

## Tenant Admin (Ilze)

**Your role:** Approve everything. Business oversight. All requisitions, compliance docs, user management.

### Your Dashboard
- FULL command centre: Stats, BayGrid, Staff, Compliance, QA, Tickets, Tasks, Weight Alerts, Charts, Risk, Facilities

### Approve Requisitions
1. **Tickets** → filter by "Requisitions" type
2. See: what's requested, cost (R), quantity, who, which stage
3. Tap → **Approve** or **Reject** (with reason)

### Manage Users
1. **Users** → see all 19 staff by role
2. **Invite User** → name, email, role → PIN auto-generated
3. **Deactivate** user (Super Admin only)

### Compliance Review
1. Dashboard QA widget: quarantined batches, pending COAs, deviations
2. Dashboard Compliance widget: open anomalies, critical alerts, destructions

---

## Responsible Pharmacist (RP)

**Your role:** Sign off on product release. COA approval. Quarantine decisions.

### Your Dashboard
- Stats, BayGrid, Tickets (RP_SIGNOFF filtered), Tasks

### RP Sign-off
1. **Tickets** → you see only tickets tagged RP_SIGNOFF
2. Review batch: lab results, COA, weight chain
3. Tap **RP Sign-off** → product authorized for release
4. Then Ilze does final approval

---

## Facility Supervisor (Loraine)

**Your role:** Day-to-day facility operations. Cleaning schedules, spray days, staff oversight. Cultivators and others report to you for facility matters.

### Your Dashboard
- Stats, BayGrid, Tickets, Tasks, Compliance, Weight Alerts, Charts, Risk

### Daily Routine
1. Review all open tickets across stages
2. Check cleaning tasks completed (Housekeeping)
3. Check laundry tasks completed
4. Review spray schedule on Grow Calendar
5. Equipment maintenance checks

---

## QA Inspector

**Your role:** Audit SOPs, review deviations, sign off at Step 14 (Store & QA).

### Your Dashboard
- QA Overview (quarantined, COA pending, deviations, SOPs), Compliance, Tasks, Tickets, Weight Alerts, Charts

### Key Actions
1. **QMS** → review SOPs, raise deviations, check equipment calibration
2. **Lab** → review batch test results before sign-off
3. **Tickets** → resolve QA-related tickets
4. **Compliance** → review + resolve anomalies

---

## Maintenance Manager

**Your role:** Equipment across all stages. Calibration, repairs, tickets.

### Your Dashboard
- Tickets (primary), Tasks, Weight Alerts, BayGrid, Activity

### Key Actions
1. **Tickets** → equipment issues assigned to you
2. **Assets** → register equipment, log maintenance, calibration schedule
3. **Tasks** → weekly calibration SOP checklists
4. Low stock consumable alerts → raise requisition ticket for Ilze

---

## Security Officer (Sipho)

**Your role:** Gate logs, dispatch sign-off, destruction witness. Step 16.

### Your Dashboard
- Stats, Tasks, Tickets, BayGrid, Activity

### Dispatch
1. **Dispatch** → see transport manifests
2. Verify all containers on manifest
3. **Mark Departed** when vehicle leaves
4. **Mark Arrived** when delivery confirmed

### Destruction Witness
- When FM schedules destruction → you witness with SAPS officer
- Record in system via compliance page

---

## Trimmer (trimmer1, trimmer2)

**Your role:** Receive bins, trim product, return with weight. Step 12.

### Your Dashboard
- Stats, Tasks, Tickets, BayGrid, Activity

### Your Workflow
1. **Trim Sessions** → see your assigned session
2. Note your Weight IN (what you received)
3. Trim the product
4. **Record Output** → enter weight OUT (trimmed) + waste weight
5. System checks: IN = OUT + WASTE (must be within 2%)
6. If not → anomaly flagged

---

## Housekeeping

**Your role:** Daily cleaning per room — grow, dry, trim, pack. SAHPRA checklists.

### Daily Routine
1. Open **Dashboard** → "My Tasks"
2. Each task has a checklist (sweep, sanitize, drain trays, restock PPE, etc.)
3. Complete each item → tap **Done**
4. If you find an issue during cleaning → raise a **Ticket** with photo

---

## Laundry

**Your role:** PPE processing daily — collect, wash, dry, return.

### Daily Routine
1. Open **Dashboard** → "My Tasks"
2. Collect uniforms from each room
3. Wash + dry → return to PPE stations
4. Mark tasks complete

---

## General Worker

**Your role:** Defoliation, clearing, general cultivation tasks. SOP checklists.

### Daily Routine
1. Open **Dashboard** → "My Tasks" (assigned by Lou or Loraine)
2. Follow SOP checklist for each task
3. Complete → mark done

---

## Viewer / SAHPRA Inspector

**Your role:** Read-only access to all data for audit purposes.

### What You See
- Dashboard: Stats, BayGrid, Tickets (read-only), Phase Chart, Activity
- Can browse: Plants, Containers, Batches, Lab results, COAs, Audit trail
- **Cannot create, edit, or delete anything**
- Can export: CSV audit log, PDF compliance package

---

## How to Raise a Ticket (Everyone level 1+)

1. **Tickets** → **New Ticket**
2. Select **Type**:
   - **Issue** — something broke or a problem found
   - **Requisition** — need supplies/equipment (enters cost + quantity)
   - **Approval** — compliance document needs sign-off
   - **RP Sign-off** — pharmacist must review before Ilze
3. Select **Workflow Stage** (which step: Propagation, Drying, Trim, etc.)
4. Enter title + description + priority
5. Submit → routed to the right people based on stage + your role

---

## How to Scan QR Codes

1. **Scan** → tap **Scan Label**
2. Point camera at QR code on container/plant/batch
3. System identifies the asset
4. For containers: select action (Load, Unload, Move, Handover)
5. Photograph the scale → AI reads weight → or enter manually
6. If weight variance >15% → red warning → CRITICAL alert sent
7. **Confirm** → action recorded

---

## Assets & Equipment

1. **Assets** → see all equipment, sensors, consumables
2. **Register Asset** → name, category, stage, tier (Equipment/Consumable)
3. Gets AST-XXXXXX QR tag
4. **Log Maintenance** → calibration, repair, inspection
5. Consumables: stock tracked, low stock alert automatic → raise ticket

---

## Strain Database

1. **Strains** → see all strains with analytics
2. Each strain shows: total plants, batches, mothers, rooting %, lab pass rate, avg THC, yield, flower weeks
3. **Add Strain** → name, species, chemo type, source, expected yield/THC
4. Analytics build over time as more data enters the system

---

## Feeding & Irrigation

1. **Feeding** → see stats: active plans, avg pH/EC, water usage
2. **Record Feed** → greenhouse, water volume, pH in, EC in, run-off readings
3. **+ Plan** → create named feed plan per greenhouse per phase
4. pH out of range (5.5-6.8) → auto alert

---

## Dispatch & Transport

1. **Dispatch** → see all transport manifests
2. **New Manifest** → transporter, vehicle, driver, select released batches
3. **Mark Departed** (Security at gate)
4. **Mark Arrived** (when delivery confirmed)
5. If overdue → ANOMALY alert
