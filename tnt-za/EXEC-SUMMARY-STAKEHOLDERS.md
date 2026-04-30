# TnT-ZA — Executive Summary for Stakeholders

**ILCO Farming (Pty) Ltd — Track & Trace System**
**Date:** 29 March 2026
**Prepared by:** Floris Olivier
**Status:** UAT Phase — Live at https://tntilco.cleva-ai.co.za

---

## What Is TnT-ZA?

TnT-ZA is a digital system that tracks every plant, every gram, and every person involved in cannabis production — from the moment a cutting is taken from a mother plant until the final product reaches the customer.

Think of it as a **digital chain of custody** for the entire farm operation. Every action is logged, every weight is recorded, every handover is documented. Nothing gets lost. Nothing goes unaccounted for.

The system is built specifically for **SAHPRA compliance** (South African Health Products Regulatory Authority) and meets all requirements for Section 22C licensed cultivation facilities.

---

## What Problem Does It Solve?

**Without TnT-ZA:**
- Paper-based records — easy to lose, hard to audit
- No real-time visibility of what's happening across the facility
- Weight discrepancies discovered too late
- SAHPRA audits require days of manual document preparation
- No way to trace a product back to its exact origin
- Staff accountability relies on trust, not data

**With TnT-ZA:**
- Every gram tracked digitally from mother plant to customer
- Real-time dashboards per role — each person sees exactly what they need
- Weight variances detected instantly — automatic alerts to management
- SAHPRA Site Master File generated live — always audit-ready
- Full provenance: customer scans a QR code → sees the entire production history
- Every action tied to a person, a timestamp, and a location

---

## What's Been Built

### The Complete 17-Step Workflow

The system tracks the entire production chain:

| Step | What Happens | Who Does It |
|------|-------------|------------|
| 1. Mother Plants | Register and maintain mother genetics | Cultivator / Nursery |
| 2. Clone | Take cuttings — 3 purposes: Production, R&D, Client | Cultivator / General Staff |
| 3. Rooting | 14-day rooting period — mortality tracked | Cultivator |
| 4. Transplant | Healthy clones move to greenhouse bays | Cultivator |
| 5. Vegetative | 14-16 days — topping, defoliation, feeding | Cultivator + Irrigation |
| 6. Flip | Light change triggers flowering | Cultivator |
| 7. Flower | 56 days flowering — trichome monitoring | Cultivator + Irrigation |
| 8. Harvest | Cut, weigh (wet weight), create batch | Cultivator → Processing |
| 9. Wet Receiving | Verify weight matches harvest record | Processing Manager (Jannette) |
| 10. Drying | 14 days on racks — daily environment checks | Processing Manager |
| 11. Debuc | Cut buds from stems — JR only | Processing Manager (Jannette) |
| 12. Trim | Multiple trimmers — weight in/out/waste tracked per person | Trimmers (25 staff) |
| 13. Cure | Containers — minimum 2 weeks | Processing Manager |
| 14. Store & QA | Lab testing (8 types) → COA → QA + RP sign-off | Lab Tech + QA + Pharmacist |
| 15. Sale | Client order → batch allocated → invoice | Admin (Ilze) |
| 16. Dispatch | Transport manifest → security gate sign-off | Security (Sipho) |
| 17. Retail | Delivered → weight verified → customer QR provenance | Client / Origin POS |

### 9 Weight Checkpoints

Every time product changes hands, it's weighed. The system compares each weight to the previous one. If the difference exceeds 2%, an automatic alert goes to management.

```
Harvest (450g wet) → Receiving (450g ✓) → Drying (135g) → Debuc (120g)
→ Trim (95g + 22g waste) → Cure (90g) → Store (90g) → Dispatch → Retail
```

### 19 Staff Roles

Every person has a specific role with specific permissions. They only see what's relevant to their job.

| Level | Roles | What They See |
|-------|-------|--------------|
| Executive | Admin (Ilze), Responsible Pharmacist | Everything — approvals, compliance, business metrics |
| Management | FM (Ray), Processing (Jannette), Supervisor (Loraine), QA, Maintenance, Head of Cultivation (Lou), Nursery Manager | Operations dashboards, weight alerts, risk gauges, tickets |
| Operators | Cultivators, Lab Tech (Keke), Irrigation Tech | Their workflow steps, tasks, clone trays |
| Workers | Security (Sipho), 25 Trimmers, General Workers, Housekeeping, Laundry | Their daily tasks and checklists |
| Audit | SAHPRA Inspector | Read-only access to all data (controlled by QA) |

### Smart Clone Tracking

When someone takes 20 cuttings from Mother M01:
- System auto-generates IDs: M01-01, M01-02, ... M01-20
- Staff just enters "20 cuttings" — no extra work
- At transplant: "16 survived" → system marks 16 healthy, 4 dead
- Dead ones: root cause recorded (pest, mould, root rot, etc.)
- Surviving clones auto-assigned to greenhouse bay positions
- Each clone traceable back to its mother forever

Three types of cloning:
- **Production** — grow → harvest → sell product
- **R&D** — create new mother plants
- **Client** — sell clones directly to buyers

### Greenhouse BayGrid

Visual grid of every greenhouse and bay:
- Each bay shows: strain, plant count, phase, days in phase
- 4 rows per bay — plant positions visible
- Colour-coded by strain
- Tap any bay → see all plants, allocate, or clear for next cycle

### Grow Calendar

Day-by-day schedule per greenhouse per batch — based on ILCO's actual grow schedules:
- Auto-populated: scouting days, spray schedules, topping, defoliation, flip date, harvest date
- Today highlighted — staff sees what's due
- IPM (pest management) applications logged with chemical name + dosage

### Ticket System — The Heartbeat

Everything flows through tickets:
- **Issues** — pest found, equipment broken, anomaly detected
- **Requisitions** — need supplies, equipment, PPE (with cost estimate)
- **Approvals** — compliance documents needing sign-off
- **RP Sign-off** — pharmacist must approve before product release

Tickets are organised by workflow stage (accordion view):
- Stage 1-3: Propagation
- Stage 4-5: Vegetative
- Stage 6-7: Flowering
- ...all the way to Stage 17: Retail

Each role only sees tickets from their stages. Management sees everything.

**Ilze approves all requisitions and compliance documents.**

### Asset Register

Every piece of equipment tracked:
- **Equipment** — scales, fans, sensors, cameras (calibration schedules)
- **Consumables** — gloves, labels, chemicals (stock levels, auto-reorder alerts)
- Each asset gets a QR code tag
- Maintenance history logged
- Low stock → automatic requisition ticket

### Site Master File

The SAHPRA Site Master File — always live, always current:
- General facility info, GPS, licenses
- All permits with expiry dates
- INCB quota usage (annual allocation vs used)
- Personnel list by role
- All SOPs with versions
- Equipment calibration status
- Production statistics
- Quality system metrics
- Destruction records
- Exportable as PDF at any time

### Compliance & Anomaly Detection

8 automated rules running constantly:
1. Weight loss >15% at any handover → CRITICAL alert
2. Destruction rate above average → flag
3. Transport taking too long → alert
4. Yield deviating from strain average → investigate
5. Inventory discrepancy >2% → alert
6. Container weight variance → alert
7. Container inactive >24 hours → check
8. Container in wrong zone → flag

All anomalies logged in a tamper-proof audit trail (SHA-256 hash chain — cannot be altered after the fact).

### QR Code Provenance

Every plant, container, batch, and asset has a QR code. Scanning any QR shows:
- Full history of that item
- Every weight recorded
- Every person who handled it
- Every zone it's been in
- For retail products: customer scans → sees Mother → Clone → Grow → Lab → COA

---

## Where We Are Now

### What's Live and Working

| Feature | Status |
|---------|--------|
| 30 pages across the application | ✅ Deployed |
| 19 staff roles with role-based dashboards | ✅ Active |
| 17-step workflow tracking | ✅ Complete |
| Weight tracking with anomaly detection | ✅ Active |
| Clone tracking (Production + R&D + Client) | ✅ Active |
| BayGrid with 4-row layout | ✅ Active |
| Grow Calendar (from ILCO schedules) | ✅ Active |
| Ticket system with workflow accordion | ✅ Active |
| Trim sessions with per-trimmer tracking | ✅ Active |
| Feeding & irrigation records | ✅ Active |
| Asset register (equipment + consumables) | ✅ Active |
| Lab testing + COA generation | ✅ Active |
| Batch destruction workflow | ✅ Active |
| Site Master File (live export) | ✅ Active |
| Strain database with analytics | ✅ Active |
| Mortality tracking with root cause | ✅ Active |
| Dispatch & transport manifests | ✅ Active |
| Mobile-first design (phone-optimised) | ✅ Active |
| Scan & Weigh with AI scale reading | ✅ Active |
| Audit trail (tamper-proof) | ✅ Active |
| QR code generation + printing | ✅ Active |
| 20 test accounts deployed | ✅ Ready for UAT |

### What's In UAT Testing

Staff at the facility are testing:
- Login with their specific role accounts
- Creating mother plants and clones
- BayGrid greenhouse setup
- Ticket creation and approval flow
- Mobile usability on phones

### What's Coming Next (Phase 2)

| Feature | Priority |
|---------|----------|
| QA-controlled viewer access (SAHPRA inspector window) | High |
| Document approval workflow UI (draft → review → RP → approve) | High |
| Origin POS integration (stock sync) | Medium |
| IoT sensor auto-readings | Medium |
| Batch number format with strain + clone date | Medium |
| Training HTML pages (interactive, per role) | Medium |

---

## Investment Summary

### What Was Built

- **Backend:** 30 API route files, 50+ database models, event-sourced architecture
- **Frontend:** 30 pages, 12 dashboard widgets, mobile-first responsive design
- **Infrastructure:** PostgreSQL database, Prisma ORM, Express API, React + Vite frontend
- **Compliance:** SAHPRA-ready, INCB quota tracking, tamper-proof audit trail

### Business Value

1. **Audit readiness** — Site Master File exportable in seconds, not days
2. **Diversion prevention** — every gram tracked, every variance flagged
3. **Staff accountability** — every action tied to a person and timestamp
4. **Operational visibility** — real-time dashboards for every level of management
5. **Compliance confidence** — automated SAHPRA reporting, quarantine protocols, destruction procedures
6. **Scalability** — multi-tenant architecture supports additional facilities
7. **Customer trust** — QR provenance shows complete production history

### Technical Foundation

- **White-label** — can be deployed for other cannabis operators
- **Multi-tenant** — one system, multiple facilities
- **Mobile-first** — designed for phone use in greenhouses and processing areas
- **Offline-capable** — scan and weigh features work without constant connection
- **API-first** — integrates with Origin POS, IoT sensors, and external systems

---

## How to Access

**Live system:** https://tntilco.cleva-ai.co.za

**Admin login:** florisolivier7@gmail.com — PIN: 123456

**All test accounts:** PIN 123456 for all
- ray@ilcofarming.co.za (Facility Manager)
- lou@ilcofarming.co.za (Head of Cultivation)
- jr@ilcofarms.co.za (Processing Manager)
- keke@ilcofarms.co.za (Lab Tech)
- sipho@ilcofarms.co.za (Security)
- And 14 more role-specific accounts

---

*This document is confidential. TnT-ZA is developed by Cleva AI for ILCO Farming (Pty) Ltd.*
