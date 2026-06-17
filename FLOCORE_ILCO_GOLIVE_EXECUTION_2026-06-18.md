# FLOCORE (FO) → ILCO agents — 18/06 cannabis GO-LIVE execution + poultry dashboard

**Date:** 2026-06-17 · **From:** FO (super admin: Floris) · **To:** O_TNT_AGENT · GROWOS_AGENT
**Readiness:** Sentinel ILCO role-health **15/15 PASS** (KPIs · micro-models · SOPs · dashboards · smart chat) — rails are go-live ready.

---

## 1. The 18/06 cannabis go-live sequence (forward production genesis)
Execute on the day, contemporaneously (sign when it physically happens):

1. **Register the real mothers (CFS baseline first).** For existing stock use `basis:"cfs"` + the real
   `effective_date`; record via `POST /custody/attest` → FM `documented` → Nursery/HOC `verified` → **QA
   `verified`**. Confirm `GET /custody/status` → `registered:true`. (Real IDs, no `TEST-`.)
2. **Start the first batch from a registered mother** — `POST /growos/batch/start`. The gate **blocks any
   propagation from an unregistered mother (409)**, so step 1 must be green first. Records genealogy + a
   custody genesis; lands the batch at the `clone` stage.
3. **HOC / cultivation admin creates the grow calendar — on the TENANT side (GrowOS).** This is theirs:
   which room/batch sits at which stage, photoperiod, VPD/DLI, when to advance. FLOCORE supplies the
   stage SOPs/checklists + custody; **GrowOS owns the calendar.**
4. **Verify:** `GET /growos/batches?tenant_slug=ilco` shows the live batch with genealogy; `GET /audit/events`
   shows the `custody.*` genesis trail; chains `intact`. SOPs ground to each role's dashboard.

## 2. Ownership at go-live (no blur)
- **FM** — facility/custody (CFS register, chain-of-custody).
- **Nursery / HOC** — genetics: verify mothers, take clones, start batches.
- **HOC / cultivation admin** — **the grow calendar (tenant/GrowOS side).**
- **QA** — independent sign-off (the dual-sign gate).
- **FLOCORE** — SOPs/custody/gate + the verification rails. Not the calendar.

## 3. SOPs
14 grow-cycle SOP drafts are in the handoffs (`ilco_sops/`), grounded + law-cited. Author them
**just-in-time** before each stage runs via `/sops/draft`→`/sops/author` (dual sign-off → live); the clone
SOP must be green before the 18/06 run.

## 4. Poultry dashboard (Loraine — chicken farm)
Proceed with the task already issued (`FLOCORE_TASK_ILCO_LORAINE_POULTRY_DASHBOARD`): stand up Loraine's
**poultry** role + dashboard as a **customer under ILCO** (KCS engine: role→KPIs→SOPs→dashboard), grounded
to **DALRRD/biosecurity/animal-welfare** (not SAHPRA). Confirm poultry type (broiler/layer/breeder) for the
KPI set; Ilse (owner) gets owner-level **view** access. Different silo from the cannabis customer.

## 5. Comms
Route everything through **Floris (super admin)**. Do **not** brief owners/clients/operators — Floris
controls all stakeholder contact. Report go-live results back to FO.

— FO
