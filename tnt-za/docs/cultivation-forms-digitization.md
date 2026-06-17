# Cultivation Paper Forms → Digital — Catalogue & Implementation Strategy

**Source:** 21 photos in `~/Downloads/ilcocultivationforms/` (ILCO Farming paper forms, Mar–Apr 2026).
**Result:** 21 images = **17 distinct forms** in 3 mirror room families (Mother Bay / Clone Room / Greenhouse).
**Goal:** kill the paper trail — every form becomes a digital flow in the **Checklists** menu, captured at point-of-work, attributed, timestamped, append-only audit, with the RP/QA sign-off chain enforced.

---

## 1. The catalogue (17 distinct forms)

| # | Form | SOP | Role | Frequency | Key fields / columns |
|---|------|-----|------|-----------|----------------------|
| A | Current Mothers register | 3-CUL-6 | Cultivator | Register | Strain, Tag ID, Origin, Transplant, Issues, Culled, Reason, Weight, Person, Signed |
| B | Current Plants register (GH) | 3-CUL-8 | Cultivator | Register | Strain, Amount, Origin, Transplant, Bay, Row, Notes, Harvest |
| C | Daily Check Sheet — Mother Bay | 3-CUL-6 | Cultivator | DAILY | lights, extraction/oscillating fans, feed lines, wet wall & filters, heater fan, tears on plastic, plant bins, foot bath, PPE station, drippers, plants, plant labels, Notes |
| D | Daily Check Sheet — Greenhouse | (—) | Cultivator | DAILY | as C + UV screens, blackout screen (no heater fan/labels) |
| E | Cultivation Activity Log — Mother Bay | 3-CUL-6 | Cultivator | PER_EVENT | Date, Time, Activity, Reason, Performed by, Signed |
| F | Cultivation Activity Log — Clone Room | (—) | Cultivator | PER_EVENT | Date, Time, Activity, Reason, Performed by |
| G | Cultivation Activity Log — Greenhouse | 3-CUL-9/10 | Cultivator | PER_EVENT | Date, Time, Activity, Reason, Performed by, Signed |
| H | Mortality Register — Mother Bay | 3-CUL-6 | Cultivator (RP sign-off) | PER_EVENT | Date, Time, Plant Tag ID, Batch #, Weight, Reason, Performed by, Signed |
| I | Mortality Register — Clone Room | 3-CUL-7 | Cultivator (RP sign-off) | PER_EVENT | Date, Time, Strain ID, Batch #, Tray #, # clones made, # deaths, Reason, Performed by |
| J | Mortality Register — Greenhouse | 3-CUL-9/10 | Cultivator (RP sign-off) | PER_EVENT | Date, Time, Plant Tag ID, Batch #, Weight, Reason, Performed by, Signed |
| K | Cloning Schedule V1 (client/dispatch) | 3-CUL-7 | Grower (QA review) | PER_BATCH | Clone date, Strain, Batch #, Tray #, # clones, Date of dispatch, Grower, Comments |
| L | Cloning & Transplanting Schedule V1 | 3-CUL-7 | Grower (QA review) | PER_BATCH | Clone date, Mother #, Tray #, # clones, Mortality W1/W2/W3, # transplanted, Date of transplant, Grower, Comments |
| M | IPM Scouting Sheet | 3-CUL-2 | Cultivator/scout (RP sign-off) | DAILY | Date, Line, Insect/Disease, Degree (Low/Med/High), Pest type, Counts (avg/block), Notes, Done by, Sign, Dept head |
| N | Temp & Humidity Check — Cloning | 4-FAC-2 | Cultivator (QAM/RP sign-off) | DAILY ×3 | Desired Temp/RH, Aircon set, Dehumidifier set, Actual Temp/RH @ 08:00 / 11:50 / 16:50, Checked by |
| O | Temp & Humidity Check — Greenhouse | 4-FAC-2 | Cultivator (QAM/RP sign-off) | DAILY ×3 | as N, ranges 22–28°C / 45–65% RH (no aircon col) |
| P | Harvest Request Form | 3-CUL-012 | Head of Cultivation (QAM approve) | PER_BATCH | Batch #, Strain ID, Flowering start, Batch size, Greenhouse, Bay, Reason, Requested by, Requested date |
| Q | Harvest Request Check Sheet | 3-CUL-012 | HoC / QA (QAM approve) | PER_BATCH | 9 readiness Y/N questions + Drying room allocated, Comments |
| R | Cleaning Checklist — Mother Bay (Yellow) | 8-CLN-7 | Assistant Growers | DAILY/weekly grid | Day rows × pre-filled tasks + Initialed |
| S | Cleaning Checklist — Clone Room (Green) | 8-CLN-9 | Facility Cleaners | DAILY/weekly grid | Day rows × pre-filled tasks + Date + Initialed |
| (S2) | Cleaning Checklist — Greenhouse (Blue) | 8-CLN-8 | Facility Cleaners | DAILY/weekly grid | (seen in bg of img 13) |

Duplicates: images 4≡21 (IPM), 12≡13 (Cloning Schedule). Sign-off block is consistent: **Authorised by / AR + Checked by / Responsible Pharmacist** (QA Manager on temp/humidity & harvest) — that's the regulatory chain to enforce.

---

## 2. The key insight — 3 room families, one parameterised schema

Mother Bay / Clone Room / Greenhouse each get the **same six forms** (Register, Daily Check, Activity Log, Mortality, Cleaning, Temp/Humidity). So we **don't build 17 screens** — we build each form ONCE, keyed by `room_type` (+ greenhouse/bay/batch). Collapses 17 → ~9 real templates.

---

## 3. The strategy — reuse, don't rebuild

The app already ships screens that mirror these forms. The job is **map → gap-check → fill → enforce sign-off**, not build from scratch.

| Form group | Existing screen | Action |
|---|---|---|
| Daily Check (C,D) | `/daily-check` | gap-check it has the exact check items per room |
| Temp & Humidity (N,O) | `/env-log` | gap-check 3×/day capture + desired ranges |
| Cleaning (R,S,S2) | `/cleaning-schedule` | gap-check day-grid + per-room task lists |
| Activity Log (E,F,G) | `/activity-log` | confirm fields + room key |
| Mortality (H,I,J) | `/mortality` | confirm clone-room variant (tray/clones) |
| IPM (M) | `/ipm-scouting` | confirm degree/counts/sign |
| Harvest (P,Q) | `/harvest-request` | confirm request + 9-pt check + QAM approve |
| Registers (A,B) | `/mothers`, `/plants` | already live data, not a form |
| Cloning Schedule (K,L) | grow calendar / clones | **gap — confirm or build** |

For any genuine gap → create a **`TaskTemplate`** (real columns become checklist items; `roleRequired`, `frequency`, `sopId`, linked EU-GMP `sourceId`; `autoCreate` + `triggerEvent`). It appears under **Checklists**; the **grow calendar → ticket connector** triggers the daily/per-batch ones at the right time; the **RP/QA sign-off** is the rail-guarded close.

---

## 4. Sequence (nailed)

1. **Gap-audit** each existing screen vs the form's real fields (the matrix above) → one page of "matches / needs fields / missing".
2. **Fill gaps** — add missing fields to existing screens; create `TaskTemplate`s for forms with no screen (esp. Cloning Schedule).
3. **Parameterise by room_type** so Mother Bay / Clone / Greenhouse reuse one template each.
4. **Enforce sign-off** — RP/QA authorisation required to close compliance forms (the rail-guard), every action → AuditLog.
5. **Trigger from the calendar** — daily checks / cleaning / temp-humidity auto-appear each day; per-batch forms on batch events.

**Outcome:** the paper binder becomes a timed, role-routed, signed, audit-logged digital flow — stronger than paper for the GMP inspection.

---

## 5. Tie-back to the EU GMP foundation (grounding)

These forms are **not free-floating** — each ILCO SOP maps to a source in our **EU GMP `ComplianceSource` registry** (13 EudraLex Vol.4 sources, live) and onto a **governance template** the `sop-governance` sync already generates. Digitising a form therefore *populates the foundation*: every record cites its EU GMP chapter, and its close is the rail-guarded RP/QA sign-off.

| ILCO form (SOP) | Governance theme (existing TaskTemplate family) | EU GMP `ComplianceSource` |
|---|---|---|
| Daily Check (3-CUL-6) | EU GMP Maintenance, Calibration & Asset Readiness | `EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT` |
| Temp & Humidity (4-FAC-2) | (environmental control) | `…CH3_PREMISES_EQUIPMENT` (+ `…CH5_PRODUCTION`) |
| Cleaning Checklists (8-CLN-7/8/9) | EU GMP Cleaning & Hygiene Record Control | `…CH3_PREMISES_EQUIPMENT` |
| Activity Log + Registers (3-CUL-6/8/9-10) | EU GMP Batch Cultivation Record Control | `…CH4_DOCUMENTATION` |
| IPM Scouting (3-CUL-2) | Batch Cultivation Record (pest control) | `…CH5_PRODUCTION` |
| Cloning Schedule (3-CUL-7) | EU GMP Batch Cultivation Record Control | `…CH5_PRODUCTION` (BCR) |
| Harvest Request + Check (3-CUL-012) | EU GMP Batch Cultivation Record Control | `…CH5_PRODUCTION` |
| Mortality / Destruction (3-CUL-6/7/9-10) | EU GMP Quarantine & Destruction Control | `…CH5_PRODUCTION` (+ `…CH8_COMPLAINTS_RECALL`) + SAPS 22-series (regulatory, specialist sign-off) |
| The AR/RP/QAM sign-off block (all forms) | EU GMP QA Deviation, CAPA & Release Readiness | `…CH1_PQS` + `…CH2_PERSONNEL` + `EU_GMP_VOL4_ANNEX16` (certification/release) |

**What this means for the build:**
1. Each digitised form (or `TaskTemplate`) gets a `sopId` **and** a `ComplianceSource` `sourceId` → the record is **cited**, the way the firewall requires (no source → blocked).
2. Populating these forms is what finally fills the empty **`ComplianceControl`** mapping layer (currently 0) — each form becomes a control that *evidences* its EU GMP clause. That is the inspection pack.
3. The cross-cutting **sign-off gap** (forms carry AR/RP/QAM signatures the app never enforces) is the same **rail-guard** identified for tickets — solve once as a shared, enforced two-party sign-off, grounded in `CH1_PQS` + `ANNEX16`.

So the cultivation-forms digitisation, the ticket rail-guard, and the EU GMP registry are **one piece of work**: forms → cited records → enforced sign-off → live `ComplianceControl` evidence graph. Regulatory specifics (esp. SAPS destruction) stay placeholder pending medicines-law sign-off — see [[feedback_no_unverified_regulatory_copy]].
