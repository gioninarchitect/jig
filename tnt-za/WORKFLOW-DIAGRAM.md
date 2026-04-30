# ILCO Farms — Complete Cultivation & Processing Workflow

> Traced from Floris's hand-drawn diagram. This is THE workflow that TnT-ZA must track end-to-end.

---

## VISUAL FLOW

```
                                    CULTIVATION
═══════════════════════════════════════════════════════════════════════════════════

  ┌──────────┐     ┌──────────┐
  │   MB1    │     │   MB2    │
  │ Mother   │     │ Mother   │
  │ Batch 1  │     │ Batch 2  │
  │ ──────── │     │          │
  │ Strain A │     │ Strain B │
  │ Strain B │     │          │
  │ Strain C │     │          │
  └────┬─────┘     └────┬─────┘
       │                │
       └───────┬────────┘
               │
               ▼
        ┌─────────────┐
        │   CLONE     │    ← Cuttings taken from mother
        │   ✂️         │    ← Record: who cut, how many, which mother
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │  ROOTING    │    ← Clone trays
        │  2 weeks    │    ← Track: mortality, rooting success
        │  (14 days)  │    ← Photo: tray setup
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │ TRANSPLANT  │    ← Rooted clones move to greenhouse bay
        │             │    ← Assign: GH + Bay + Line + Position
        └──────┬──────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
  ┌─────────┐    ┌─────────┐
  │  GH1    │    │  GH2    │
  │┌──┬──┬─┐│    │┌──┬──┐  │
  ││B1│B2│B3││    ││B4│B5│  │
  │└──┴──┴─┘│    │└──┴──┘  │
  └────┬────┘    └────┬────┘
       │              │
       └──────┬───────┘
              │
              ▼
       ┌─────────────┐
       │     VEG     │    ← 2 weeks – 16 days
       │             │    ← Light: 18/6
       │  Topping    │    ← Tasks: top, defoliate, bottom clean
       │  Defoliate  │    ← Record: cm growth
       │  Bottom     │    ← Feeding starts (low → builds up)
       │  clean      │
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │    FLIP     │    ← Light change: 18/6 → 12/12
       │             │    ← Record: flip date, stretch start
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │   FLOWER    │    ← 8 weeks (56 days)
       │             │    ← Monitor: trichomes, pistils
       │  8 weeks    │    ← Feeding: full bloom nutrients
       │  (56 days)  │    ← Target harvest date calculated
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │  HARVEST    │    ← Cut plants
       │             │    ← Record: wet weight per plant
       │  Wet weight │    ← Clear bay in BayGrid
       │  recorded   │    ← Create batch
       └──────┬──────┘
              │
              │


                                    PROCESSING
═══════════════════════════════════════════════════════════════════════════════════
              │
              ▼
       ┌─────────────┐
       │ WET MATERIAL│    ← Receiving from cultivation
       │ RECEIVING   │    ← Weigh in: total wet weight
       │             │    ← Assign container IDs (BIN-xxx)
       │ Weigh in    │    ← Handover: Cultivator → Processing Manager
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │   DRYING    │    ← DRS (Drying Room/Space)
       │             │    ← 2 weeks
       │   DRS       │    ← Hang on racks (RACK-xxx)
       │   2 weeks   │    ← Monitor: temp, humidity daily
       │             │    ← Weight loss: ~70-75% moisture lost
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │   DEBUC     │    ← JR ONLY (Jannette's responsibility)
       │             │    ← Cut buds from stems into bins
       │  JR ONLY    │    ← Each bin weighed + barcoded
       │             │    ← Generate barcode/scan per bin
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │    TRIM     │    ← Assigned to TRIMMERS
       │             │    ← Multiple trimmers simultaneously
       │  Trimmers:  │    ← Each gets weighed bin (weight IN)
       │  ┌──┬──┬──┐ │    ← Each returns trimmed product (weight OUT)
       │  │T1│T2│T3│ │    ← Track: waste weight, completed/not
       │  └──┴──┴──┘ │    ← Reconcile: IN = OUT + waste
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │    CURE     │    ← Into cure containers
       │             │    ← Minimum 2 weeks
       │  ○○○○      │    ← Monitor: burping schedule
       │  ○○○○      │    ← Final weight before packaging
       │  ○○○○      │
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │   STORE     │    ← Storage vault/room
       │             │    ← Inventory count
       │  Vault      │    ← COA must be issued before sale
       │             │    ← QA sign-off required
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │    SALE     │    ← Client order received
       │             │    ← Batch allocated to order
       │  Order      │    ← Invoice generated
       │  allocated  │    ← SAHPRA tracking ref
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │  DISPATCH   │    ← Transport manifest created
       │             │    ← Vehicle + driver assigned
       │  Manifest   │    ← GPS tracking (optional)
       │  created    │    ← Security sign-off at gate
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │   RETAIL    │    ← Delivered to client/store
       │             │    ← Origin POS receives stock
       │  Delivered  │    ← Customer scans QR → full provenance
       └─────────────┘
```

---

## WEIGHT TRACKING CHAIN (Every gram accounted for)

```
HARVEST (wet weight)
    └→ WET RECEIVING (total wet weight IN)          ← MUST MATCH harvest weight
        └→ DRYING (dry weight OUT)                  ← ~25-30% of wet weight
            └→ DEBUC (weight per bin)               ← Each bin weighed
                └→ TRIM (weight IN per trimmer)     ← Sum of all bins
                    └→ TRIM OUT + WASTE             ← IN = OUT + WASTE (±2%)
                        └→ CURE (weight IN)         ← Sum of trimmed product
                            └→ CURE OUT             ← Slight moisture loss
                                └→ STORE (final)    ← This is sellable weight
                                    └→ DISPATCH     ← Weight on manifest
                                        └→ RETAIL   ← Weight received
```

**At every transition: weigh, scan, log handler, timestamp.**
**Any variance > threshold → ANOMALY → alert FM + Admin.**

---

## DATA CAPTURED AT EACH STAGE

| Stage | Who | Weight? | Container | Scan? | Photo? | Tasks |
|-------|-----|---------|-----------|-------|--------|-------|
| **Mother** | Cultivator | — | — | — | Yes (360°) | Health check |
| **Clone** | Cultivator | — | Clone tray | — | Yes (tray) | Record cuttings count |
| **Rooting** | Cultivator | — | Clone tray | — | Yes (roots) | Check roots at day 7, 14 |
| **Transplant** | Cultivator | — | Bay position | — | — | Assign bay, start feeding |
| **Veg** | Cultivator | — | Bay | — | Optional | Top, defoliate, bottom clean, cm growth |
| **Flip** | Cultivator | — | Bay | — | — | Record flip date, stretch start |
| **Flower** | Cultivator | — | Bay | — | Optional | Trichome check, feeding |
| **Harvest** | Cultivator | **WET WEIGHT** | BIN-xxx | QR | Yes | Cut, weigh, clear bay |
| **Wet Receiving** | Processing Mgr | **VERIFY WET** | BIN-xxx | QR | — | Handover sign-off |
| **Drying** | Processing Mgr | — | RACK-xxx | QR | — | Daily temp/humidity check |
| **Dry Weight** | Processing Mgr | **DRY WEIGHT** | RACK-xxx | QR | — | Weigh after 2 weeks |
| **Debuc** | JR ONLY | **PER BIN** | BIN-xxx new | Barcode | — | Cut, weigh, label |
| **Trim** | Trimmers | **IN + OUT + WASTE** | BIN-xxx | Barcode | — | Per-trimmer tracking |
| **Cure** | Processing Mgr | **CURE WEIGHT** | CURE-xxx | QR | — | Burping schedule |
| **Store** | FM / QA | **FINAL WEIGHT** | PACKAGE-xxx | QR | — | QA sign-off, COA required |
| **Sale** | Admin | — | — | — | — | Order, invoice, SAHPRA ref |
| **Dispatch** | Security | **MANIFEST WEIGHT** | — | — | — | Transport manifest, gate log |
| **Retail** | Client | **RECEIVED WEIGHT** | — | QR | — | Delivery confirmation |

---

## ROLES AT EACH STAGE

```
CULTIVATION:
  Mother → Clone → Rooting → Transplant → Veg → Flip → Flower → Harvest
  │                                                                    │
  └── CULTIVATOR (Lou) ────────────────────────────────────────────────┘
       + IRRIGATION_TECH (feeding)
       + HOUSEKEEPING (daily room cleaning)
       + LAUNDRY (PPE processing)

PROCESSING:
  Wet Receiving → Drying → Debuc → Trim → Cure → Store
  │                         │       │                  │
  └── PROCESSING_MANAGER ──┘       │                  └── QA_INSPECTOR (sign-off)
       (Jannette — JR)             │
                                   └── TRIMMERS (T1, T2, T3...)

DISTRIBUTION:
  Store → Sale → Dispatch → Retail
  │        │       │           │
  │        │       └── SECURITY_OFFICER (gate)
  │        └── TENANT_ADMIN (orders)
  └── FACILITY_MANAGER (inventory)

CROSS-CUTTING:
  MAINTENANCE_MANAGER — equipment across all stages
  HOUSEKEEPING — cleaning per room per stage
  LAUNDRY — uniforms and PPE
  QA_INSPECTOR — auditing + sign-off at STORE stage
  LAB_TECH — testing between CURE and STORE
```

---

## SAHPRA COMPLIANCE TOUCHPOINTS

| Event | SAHPRA Requirement | Auto-task? |
|-------|-------------------|-----------|
| Batch created | Log in production register | Yes |
| Quarantine triggered | Notify SAHPRA within 24hrs | Yes (7 auto-tasks) |
| Destruction needed | SAPS officer must witness | Yes (checklist) |
| COA issued | Attach to batch record | Automatic |
| Dispatch | Transport manifest with permit ref | Yes |
| Monthly | INCB reconciliation report | Yes (monthly template) |
| Spray applied | Record chemical, dilution, who, when | Yes (per-batch template) |
| Equipment calibrated | Log calibration results | Yes (weekly template) |

---

## WHAT TnT-ZA TRACKS vs WHAT'S MANUAL

| Tracked in TnT-ZA | Still Manual |
|-------------------|-------------|
| Every weight at every stage | Physical cutting/trimming |
| Every handler at every handover | Actual growing/feeding |
| Every container at every move | Visual inspection |
| Clone success rates | Trichome assessment |
| Bay allocation + days in phase | Deciding when to flip/harvest |
| Trimmer performance (in/out/waste) | Actual trim quality |
| Quarantine auto-tasks | Physical isolation |
| SAHPRA SOP checklists | Filing paper copies |
| Weight variance anomalies | Investigation itself |
| Transport manifest | Actual driving |

---

## SYSTEM INTEGRATION POINTS

```
TnT-ZA (Track & Trace)
    │
    ├── STORE stage → triggers → Origin POS catalog sync
    │       "Batch B-2026-012 released, 365g Durban Poison available"
    │
    ├── SALE stage → Origin POS order → TnT-ZA batch allocation
    │       "Order #1234: allocate 28g from B-2026-012"
    │
    ├── DISPATCH → Origin POS stock update
    │       "28g dispatched, remaining: 337g"
    │
    └── QR Provenance → Customer scans product
            "This is Durban Poison from Mother M1,
             cloned 1 Mar 2026, grown in GH1 Bay 1,
             harvested 5 May 2026, tested 8/8 pass,
             COA: COA-2026-012"
```

---

*This diagram represents the COMPLETE workflow from mother plant to customer's hands. Every gram tracked. Every handler named. Every timestamp logged. Full SAHPRA compliance.*
