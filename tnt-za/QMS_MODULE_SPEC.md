# QMS Module — Section Structure (ILCO QA, captured 2026-06-19 from Coenie/Keke)

> Owner of the quality system: **QA Inspector (Keke)** — full CRUD, sign-off authority.
> Lives under the **Compliance** nav group. Each item below is its **own section** (own page + nav entry; most need their own data model).

## 1. Quality Events  *(parent — QA manages all quality-related events here)*
The umbrella for everything QA reviews. Three event types, each its own sub-section:
- **Deviations** *(exists & live)* — raise → QA approve → CAPA (Level 1 & 2 only) → RP close.
  - Levels: **1 Critical · 2 Serious** (need CAPA before close) · **3 Minor** (no CAPA).
- **Change Control** — planned change request → impact assessment → QA approval → implementation → verification.
- **OOS (Out of Spec)** — a single out-of-specification result → investigation (lab error vs real) → disposition → CAPA if confirmed.
- **OOT (Out of Trend)** — gradual deterioration over time (e.g. a plant/batch trending worse across readings) even while still in spec → flag → investigate → CAPA. Distinct from OOS (trend vs single point).
- Today Deviations lives inside `/qms`; restructure so Quality Events is the parent section with these tabs (Deviations · Change Control · OOS · OOT).

## 2. Legal & Regulation
- Register of legal/regulatory obligations + status (SAHPRA s22C, SAPC, EU-GMP, POPIA…).
- Ties into the existing grounded **Regulatory Sources** registry (SOP Library) — extend, don't duplicate.

## 4. Validations  *(parent section with sub-types)*
Each validation is a record with protocol → execution → report → QA approval. Sub-types:
- **Process** validation
- **Machinery** validation
- **Equipment** qualification (IQ/OQ/PQ)
- **Moisture Analyser** (calibration/validation)
- **HVAC** (qualification + monitoring)

## 5. Stability Studies
- Per-batch/strain stability program: timepoints, storage conditions, test pulls, results, shelf-life.

## 6. Barcode
- Barcode/label master + generation + verification (ties to batch/tray/container IDs already in the system).

## 7. Risk Assessment
- Risk register: hazard → likelihood × severity → risk rating → mitigation/controls → residual risk → QA review.
- Links to deviations, validations and change control (a change/deviation can spawn a risk assessment).

## 8. Engineering  *(parent section — facility systems under compliance)*
- **HVAC** — qualification + monitoring (cross-refs Validations §4; HVAC sits under compliance/engineering both).
- **RO Systems** — reverse-osmosis water treatment: monitoring, sanitisation, water quality records.
- **Electrical** — electrician records: inspections, maintenance, certificates of compliance.
- Each = asset + planned-maintenance schedule + records + QA/engineering sign-off.

---

## Build approach (phased — do NOT fragment mid-genesis)
- **Phase A (low risk, now-able):** Deviations → own route/section + classify deviations by the quality areas above. Add the quality categories to the deviation "Type" classifier so QA can tag immediately.
- **Phase B:** Quality Events + Legal & Regulation (lightweight registers; reuse Deviation/Ticket patterns + Regulatory Sources).
- **Phase C:** Validations (parent + 5 sub-types) — biggest; protocol/execution/report model.
- **Phase D:** Stability Studies + Barcode.

Each phase = data model (Prisma) + routes + page + nav + QA RBAC. Build off the live floor, deploy additively.
