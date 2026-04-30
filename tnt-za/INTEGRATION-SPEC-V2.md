# TnT-ZA v2.0 — Integration Specification

> Based on tenant admin + cultivator workflow notes from ILCO Farms site visit.
> This document captures EVERY data point, workflow, and role requirement for the production system.

---

## 1. NEW ROLES NEEDED

### Current Roles (v1.0)
| Role | Level | Who |
|------|-------|-----|
| SUPER_ADMIN | 5 | Floris |
| TENANT_ADMIN | 4 | Ilze |
| FACILITY_MANAGER | 3 | Ray |
| CULTIVATOR | 2 | Lou |
| LAB_TECH | 2 | Keke |
| SECURITY_OFFICER | 1 | Sipho |
| VIEWER | 0 | SAHPRA Inspector |

### Missing Roles (v2.0)

| New Role | Level | Who | Responsibilities |
|----------|-------|-----|-----------------|
| **PROCESSING_MANAGER** | 3 | Jannette | Manages drying, debuc, trimming, curing. Oversees trimmers. Signs off on processing completion. |
| **FACILITY_SUPERVISOR** | 3 | (TBD) | Day-to-day facility ops. Manages maintenance tickets, cleaning schedules, SAHPRA spray days. |
| **QA_INSPECTOR** | 3 | (TBD) | QA dashboard. Signs off on final package. QC inspection + approval. Manages SOPs to QA dashboard. |
| **TRIMMER** | 1 | Multiple workers | Assigned to trim sessions. Tracked per-trimmer: weight in, weight out, completed/not completed. |
| **GENERAL_WORKER** | 1 | Multiple workers | Laundry, clearing, defoliation, general cultivation tasks. SOP checklists. |
| **MAINTENANCE** | 1 | (TBD) | Maintenance tickets. Equipment upkeep. Greenhouse infrastructure. |
| **IRRIGATION_TECH** | 2 | (TBD) | Feeding programs, irrigation schedules, run-off testing, nutrient management. |

### Updated RBAC Matrix

```
Level 5: SUPER_ADMIN
Level 4: TENANT_ADMIN
Level 3: FACILITY_MANAGER, PROCESSING_MANAGER, FACILITY_SUPERVISOR, QA_INSPECTOR
Level 2: CULTIVATOR, LAB_TECH, IRRIGATION_TECH
Level 1: SECURITY_OFFICER, TRIMMER, GENERAL_WORKER, MAINTENANCE
Level 0: VIEWER
```

---

## 2. MOTHER PLANT MANAGEMENT

### Current State
- Plant model has `motherPlantId` (self-reference for genealogy)
- Basic parent-child tracking exists

### What's Needed

#### Mother Plant Registry
```
Mother Plant {
  id, identifier (ZA-XXXXXX)
  strain
  status: ACTIVE | CULLED | STRESSED | RETIRED
  source: CLONED | PURCHASED
  breeder: string (seed bank / breeder name)
  purchaseDate / cloneDate
  defects: string[] (documented issues)
  testStatus: TESTED | NOT_TESTED
  testResults: JSON (if tested)
  totalClonesTaken: number
  activeClones: number
  facilityId, zoneId, bayId
  photos: string[] (360-degree view)
  notes: string
}
```

#### Mother → Clone Relationship
- One mother → many clones
- Each clone tracks: date taken, rooting success/fail, mortality
- Clone matrix view: which mothers produced which clones, success rates
- Mother stress tracking: if too many clones taken, flag as STRESSED

#### Clone Tray Setup
```
Clone Tray {
  id
  strain
  motherPlantId
  cloneDate
  totalCuttings: number
  rooted: number
  mortality: number
  rootingPeriod: "2 weeks" (configurable)
  status: ROOTING | ROOTED | TRANSPLANTED | FAILED
  trimmerWhoTook: userId (who took the cuttings)
  photo: string (photo of tray setup)
}
```

#### Workflow
1. Select mother plant
2. Take cuttings → record number, date, who
3. Place in clone tray → photograph setup
4. 2-week rooting period
5. Document mortality (how many died)
6. Surviving clones → transplant to veg bay

---

## 3. BAYGRID — Greenhouse Allocation System

### Concept
The farm has multiple greenhouses (GH1, GH2, etc.). Each greenhouse has bays. Each bay has lines. Plants are allocated to specific bay positions.

### Data Model

```
Greenhouse {
  id
  name: "GH1", "GH2"
  type: GROW | VEG | FLOWER | MOTHER
  totalBays: number
  facilityId
}

Bay {
  id
  greenhouseId
  name: "Bay 1", "Bay 2"
  lines: number (e.g., 4 lines per bay)
  capacity: number (plants per bay)
  status: EMPTY | PARTIAL | FULL | RESERVED
  currentBatchId: string (which batch is in this bay)
  currentStrain: string
}

BayAllocation {
  id
  bayId
  plantId / batchId
  strain
  lineNumber: number
  position: number
  allocatedAt: DateTime
  removedAt: DateTime?
  allocatedBy: userId
}
```

### BayGrid View (Frontend)
- Visual grid showing all greenhouses
- Each greenhouse shows bays as colored blocks
- Bay color = strain (different strain = different color)
- Click bay → see all plants, batch, strain, phase, days in bay
- Drag-and-drop bay allocation (v2.1)
- Occupancy percentage per greenhouse
- Filter by: strain, batch, phase, empty bays

### Bay Allocation Workflow
1. Clone rooted → allocate to Bay in GH
2. Select greenhouse → select bay → select line → assign plants
3. System tracks: strain, batch, clone date → bay position
4. When harvested → bay marked EMPTY → available for next batch

---

## 4. CULTIVATION LIFECYCLE (Detailed)

### Phase Expansion (v1.0 → v2.0)

**v1.0 phases:** SEEDLING → VEGETATIVE → FLOWERING → HARVESTED → DRYING → CURING → PROCESSING → PACKAGED

**v2.0 phases (expanded):**

```
CLONE_CUTTING → ROOTING (2 weeks, document mortality)
  → TRANSPLANT (into bay, feeding starts low)
  → VEG (topping, bottom cleaning, defoliation, fan leaf clearing)
    - Document: cm growth in veg period
    - Track: light schedule (18/6)
    - Tasks: topping, defoliation, bottom cleaning
  → FLIP (lights changed to 12/12, flower trigger)
    - Document: stretch growth
    - Calculate: total stretch = growth from flip to end of stretch
    - Track: stretch per strain (build strain database)
  → FLOWER (monitor trichomes, pistils)
    - Duration varies by strain
  → HARVEST (cut, weigh wet weight)
  → DRYING (hang on racks, monitor temp/humidity)
  → DEBUC (cut into bins, weighed)
    - Generator/barcode scan
  → TRIMMING (multiple trimmers, per-trimmer tracking)
    - Trimmer assigned weight IN
    - Trimmer weight OUT when done
    - Track: completed / not completed
    - Track: what's leftover (trim waste)
    - Must be flexible (partial completion)
  → CURING (cure containers, stored)
  → PACKAGED (final package, QC inspection, sign-off)
```

### Per-Phase Data Collection

| Phase | Data Points |
|-------|------------|
| **CLONE_CUTTING** | Mother ID, cuttings taken, who cut, photo |
| **ROOTING** | Tray ID, start date, mortality count, root check dates |
| **TRANSPLANT** | Bay allocation (GH/Bay/Line), feeding program start |
| **VEG** | cm growth daily/weekly, topping dates, defoliation dates, bottom cleaning, light schedule (18/6), fan leaf removal |
| **FLIP** | Flip date, light change to 12/12, document stretch start |
| **STRETCH** | cm growth per day, total stretch measurement, stretch end date |
| **FLOWER** | Trichome checks, pistil color, target harvest date |
| **HARVEST** | Wet weight, who harvested, bay cleared |
| **DRYING** | Rack ID, temp, humidity, duration, dry weight |
| **DEBUC** | Cut into bins, each bin weighed, barcode scanned |
| **TRIMMING** | Trimmer ID, weight in, weight out, completed?, leftover/waste weight |
| **CURING** | Container ID, start date, check dates, final weight |
| **PACKAGED** | Final weight, QC inspection, QA sign-off, package photo |

---

## 5. FEEDING & IRRIGATION SYSTEM

### Feed Plan Configuration
```
FeedPlan {
  id
  name: "GH1 Veg Feed Plan"
  greenhouseId
  phase: VEG | FLOWER
  schedule: [
    { weekNumber: 1, nutrientA: ml, nutrientB: ml, ph: target, ec: target },
    { weekNumber: 2, ... },
    ...
  ]
  notes: string
  createdBy: userId
}
```

### Feeding Records
```
FeedingRecord {
  id
  feedPlanId
  date
  greenhouseId, bayId
  actualPh: number
  actualEc: number
  waterVolume: liters
  nutrients: JSON { A: ml, B: ml, C: ml }
  runOffPh: number (what came out)
  runOffEc: number
  runOffNotes: string (what the plant didn't absorb)
  recordedBy: userId
}
```

### Key Features
- Config feed plan per greenhouse per phase
- Feeding starts low on transplant, increases through veg
- Run-off testing: measure what the plant didn't absorb
- Feed forecasts: predict when next feeding needed based on consumption
- Alerts if pH or EC out of range
- Track feeding cost per batch

---

## 6. TRIMMING WORKFLOW

### Problem
Multiple trimmers work simultaneously. Each gets a bin of material. They trim at different speeds. Some finish, some don't. Leftover must be tracked.

### Data Model
```
TrimSession {
  id
  batchId
  date
  status: IN_PROGRESS | COMPLETED
  totalWeightIn: grams
  totalWeightOut: grams
  totalWaste: grams
  supervisorId: userId (Processing Manager)
}

TrimmerAssignment {
  id
  trimSessionId
  trimmerId: userId (TRIMMER role)
  weightIn: grams (what they received)
  weightOut: grams (trimmed product)
  wasteWeight: grams
  status: ASSIGNED | IN_PROGRESS | COMPLETED | PARTIAL
  startTime: DateTime
  endTime: DateTime?
  notes: string
}
```

### Workflow
1. Processing Manager creates trim session for batch
2. Assigns trimmers → each gets a weighed bin
3. Each trimmer logs: weight out, waste weight, completed?
4. If not completed → leftover stays with trimmer for next day
5. Session closes when all bins complete
6. Total reconciliation: weight in vs weight out + waste
7. Variance check: if total doesn't add up → anomaly

---

## 7. PROCESSING PIPELINE

```
HARVEST
  ↓
DRYING (racks, 10-14 days, moisture loss tracked)
  ↓
DEBUC (cut from stems into bins, each bin weighed + barcoded)
  ↓
TRIMMING (assigned to trimmers, per-trimmer tracking)
  ↓
CURING (into cure containers, minimum 2 weeks)
  ↓
QC INSPECTION (QA Inspector checks, approves or rejects)
  ↓
PACKAGING (final weight, labeled, signed off)
  ↓
STORAGE → DISTRIBUTION (to clients)
```

### Processing Manager Dashboard
- Active trim sessions with trimmer progress
- Drying room status (what's on racks, how long)
- Debuc queue (what's ready to be cut)
- Curing status (what's been curing how long)
- QC approval queue
- Packaging schedule

---

## 8. SOP & TASK TRACKING SYSTEM

### Current State
- SOPs exist but are document-only
- No task assignment or checklist tracking

### What's Needed

#### Task Templates (linked to SOPs)
```
TaskTemplate {
  id
  sopId
  title: "Daily Spray Schedule"
  roleRequired: CULTIVATOR | GENERAL_WORKER | etc
  frequency: DAILY | WEEKLY | MONTHLY | PER_BATCH | ONE_TIME
  checklist: [
    { item: "Check pH of spray solution", required: true },
    { item: "Spray all plants in GH1", required: true },
    { item: "Record spray time and volume", required: true },
    { item: "Log any plant reactions", required: false },
  ]
}
```

#### Task Assignments
```
TaskAssignment {
  id
  taskTemplateId
  assignedTo: userId
  dueDate: DateTime
  status: PENDING | IN_PROGRESS | COMPLETED | OVERDUE
  completedAt: DateTime?
  checklistResponses: JSON
  photo: string? (proof of completion)
  notes: string
  reviewedBy: userId? (supervisor sign-off)
}
```

#### SAHPRA Compliance Tasks
- **Spray days**: Record date, chemical, dilution, who sprayed, which greenhouse
- **Cleaning schedule**: Laundry, facility cleaning, tool sanitization
- **Equipment checks**: Daily scale checks, humidity sensor checks
- **Staff compliance**: Hairnets, gloves, PPE verification

#### Maintenance Tickets
```
MaintenanceTicket {
  id
  title: "GH2 fan motor not working"
  description: string
  priority: LOW | MEDIUM | HIGH | CRITICAL
  status: OPEN | ASSIGNED | IN_PROGRESS | COMPLETED
  assignedTo: userId (MAINTENANCE role)
  reportedBy: userId
  facilityId, greenhouseId?
  photos: string[]
  resolution: string
  completedAt: DateTime?
}
```

---

## 9. CLIENT & DISTRIBUTION TRACKING

### Client Types
```
Client {
  id
  name
  type: B2B | EXPORT | PATIENT
  sahpraRef: string? (for patients)
  companyReg: string? (for B2B)
  exportPermit: string? (for export)
  contactPerson, email, phone
  deliveryAddress
  status: ACTIVE | SUSPENDED | PENDING
}
```

### Batch Distribution
```
BatchDistribution {
  id
  batchId
  clientId
  clientType: B2B | EXPORT | PATIENT
  quantity: grams
  distributedAt: DateTime
  transportManifestId?
  sahpraTrackingRef: string (for SAHPRA reporting)
  invoiceRef: string
}
```

### SAHPRA Reporting
- Track batch distributions per client
- Generate SAHPRA-format reports: which batches went to which clients
- INCB reporting: total produced, distributed, destroyed, in stock

---

## 10. STRAIN DATABASE

### Current
- Strain is just a text field on plants

### What's Needed
```
Strain {
  id
  name: "Durban Poison"
  species: SATIVA | INDICA | HYBRID
  chemoType: THC_DOMINANT | CBD_DOMINANT | BALANCED
  breeder: string
  source: string (seed bank)

  // Growth characteristics (built from data over time)
  avgVegDays: number
  avgFlowerDays: number
  avgStretchPercent: number
  avgYieldPerPlant: grams
  avgThcContent: percent
  avgCbdContent: percent

  // Feeding preferences
  preferredPh: { min, max }
  preferredEc: { min, max }
  feedSensitivity: LOW | MEDIUM | HIGH

  // Notes
  growNotes: string
  trimNotes: string
  curingNotes: string

  totalBatches: number (auto-calculated)
  totalPlants: number (auto-calculated)
}
```

### Strain Analytics
- Compare yield across batches for same strain
- Track stretch percentage per strain (builds predictive model)
- Feeding response per strain
- Best-performing strain by greenhouse conditions
- Time-to-harvest distribution per strain

---

## 11. QA DASHBOARD

### QA Inspector Workflow
1. View queue of items pending QC inspection
2. For each item: check weight, appearance, smell, moisture
3. Approve or reject with notes
4. Approved items → move to packaging
5. Rejected items → back to processing with reason

### QA Dashboard Widgets
- Pending inspections count
- Approval rate (%)
- Rejection reasons (top 5)
- Batches in QC pipeline
- SOP compliance score per department
- Equipment calibration status
- Open deviations

### Sign-Off Flow
```
Processing Complete → QC Inspection → QA Approval → Final Package → Sign-Off
                                    → QA Rejection → Back to Processing
```

Each sign-off creates an audit log entry with the inspector's ID, timestamp, and notes.

---

## 12. IMPLEMENTATION PRIORITY

### Phase 1 (v2.0 — Next Sprint)
1. **BayGrid** — Greenhouse/Bay/Line allocation (most requested)
2. **Mother Plant Management** — Registry with clone tracking
3. **New Roles** — PROCESSING_MANAGER, TRIMMER, QA_INSPECTOR
4. **Expanded Phase Lifecycle** — Add CLONE_CUTTING, ROOTING, TRANSPLANT, FLIP, DEBUC, TRIMMING

### Phase 2 (v2.1)
5. **Trimming Workflow** — Per-trimmer tracking with weight reconciliation
6. **Task/SOP Checklists** — Assignable tasks linked to SOPs with completion tracking
7. **Feeding System** — Feed plans, feeding records, run-off testing

### Phase 3 (v2.2)
8. **QA Dashboard** — Inspection queue, approval/rejection flow, sign-off
9. **Client Distribution** — B2B, export, patient tracking with SAHPRA reporting
10. **Strain Database** — Analytics, growth predictions, feeding preferences
11. **Maintenance Tickets** — Facility maintenance system

### Phase 4 (v2.3)
12. **Veg Growth Tracking** — cm measurements, stretch calculations
13. **Irrigation Integration** — Sensor data, automated feeding schedules
14. **Export Compliance** — International shipping manifests, permit tracking
15. **Mobile PWA** — Offline capability for greenhouse use

---

## 13. DATABASE CHANGES NEEDED

### New Models
- Greenhouse
- Bay
- BayAllocation
- CloneTray
- FeedPlan
- FeedingRecord
- TrimSession
- TrimmerAssignment
- TaskTemplate
- TaskAssignment
- MaintenanceTicket
- Client
- BatchDistribution

### Modified Models
- Plant: add `bayId`, `lineNumber`, `cloneTrayId`, expand phase enum
- User: add new role enum values
- Batch: add `productionBatchNumber`, `motherBatchRef`

### New Enums
- PlantPhase: add CLONE_CUTTING, ROOTING, TRANSPLANT, FLIP, DEBUC, TRIMMING
- UserRole: add PROCESSING_MANAGER, FACILITY_SUPERVISOR, QA_INSPECTOR, TRIMMER, GENERAL_WORKER, MAINTENANCE, IRRIGATION_TECH
- GreenhouseType: GROW, VEG, FLOWER, MOTHER, DRY, PROCESS
- BayStatus: EMPTY, PARTIAL, FULL, RESERVED
- TaskFrequency: DAILY, WEEKLY, MONTHLY, PER_BATCH, ONE_TIME
- ClientType: B2B, EXPORT, PATIENT
- TicketPriority: LOW, MEDIUM, HIGH, CRITICAL

---

## 14. INTEGRATION WITH ORIGIN POS

### What Connects
- **Batch Released** in TnT-ZA → product available in Origin POS catalog
- **Client Order** in Origin POS → batch allocation in TnT-ZA
- **Stock Level** in TnT-ZA → real-time inventory in Origin POS
- **COA** from TnT-ZA → downloadable on Origin product page
- **QR Provenance** → customer scans product QR → sees full batch history

### API Bridge
- TnT-ZA exposes: `GET /api/released-batches` (for POS catalog sync)
- Origin POS calls: `POST /api/batch-allocate` (when order placed)
- Shared auth: same JWT secret, `X-Internal-Key` header for server-to-server

---

*This document should be reviewed with Ray (FM), Lou (Cultivator), Jannette (Processing), and the QA team before implementation begins.*
