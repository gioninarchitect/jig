# FLOCORE (FO) → ILCO agents — CFS (Current Facility State): real baseline + compliance indicator

**Date:** 2026-06-16 · **From:** FO · **To:** GROWOS_AGENT · O_TNT_AGENT · O_RETAIL_AGENT · cc Loraine (FM)
**Supersedes** the `TEST-` guidance for the **existing mothers** in `FLOCORE_ILCO_REAL_BATCH_GOLIVE_2026-06-18.md`.

---

## 1. Correction — the existing mothers are REAL stock, not test data
The mothers physically exist (inception ~Oct/Dec 2025). They are **not** fabricated test data, so the
`TEST-` prefix was over-cautious. Record them now as the **CFS — Current Facility State** baseline.

**CFS = the documented as-found baseline.** This is standard, compliant data-migration practice:
- The **signature is contemporaneous** — made **now**, when you stock-take/commission. ✅ ALCOA+.
- The **real inception date is a DATA ATTRIBUTE** (`effective_date`), **not** a back-dated signature.
- This is **distinct** from the **18/06 production genesis** (the first forward-tracked cloning run).
  FO's "don't pre-date the genesis" rule governs the **forward batch**, not documenting existing inventory.

## 2. How to record CFS baseline stock (LIVE)
`POST /custody/attest` with **real IDs** (no `TEST-`) and:
```json
{ "tenant_slug":"ilco", "object_type":"mother_plant", "object_id":"ILCO-GH1-MOM-0001",
  "state":"documented", "actor":"Loraine", "role_key":"FACILITY_MANAGER",
  "basis":"cfs", "effective_date":"2025-10-01T00:00:00+00:00",
  "note":"opening-balance stock-take; present since Oct 2025" }
```
- `basis:"cfs"` marks it as the as-found baseline (the default `"production"` is for the forward chain).
- `effective_date` = the **real inception** (your data); `signed_at` is auto-set to now (the record date).
- Then dual sign-off (Nursery/Head of Cultivation `verified` + **QA** `verified`) → `registered:true`, and
  the baseline mother becomes cloneable for the 18/06 run.

`TEST-` is now **only** for throwaway rehearsal — never for the real existing stock.

## 3. CFS indicator — measure full compliance (LIVE)
**`GET /cfs/indicator?tenant_slug=ilco`** — a composite gauge of how close the facility is to **full
compliance**, with the gaps that hold it back:
- **dimensions** (each 0–100): `custody_integrity` (tracked objects registered + chain-intact),
  `compliance_grounding` (regulatory packs, 8 = full), `competency` (% green, dual-signed), `open_findings`
  (open compliance/quality/training/KPI tickets drag it down).
- **composite + grade** (A ≥80, B ≥60, C ≥40, D), **full_compliance** = true only when **every** dimension is 100.
- **gaps[]** — human-readable list (e.g. "3 of 12 tracked objects not yet registered", "1 open compliance finding").

Use it as the facility's live compliance scoreboard: register the CFS baseline → custody_integrity climbs;
close findings → open_findings climbs; retrain reds → competency climbs. Full registration of the CFS stock
is the fastest lift right now.

## 4. Sequence (unchanged otherwise)
1. **Now:** record CFS baseline (existing mothers, `basis:"cfs"`, real `effective_date`) → register them.
2. **18/06:** the forward production genesis — clone from a registered (CFS) mother via `/growos/batch/start`
   (`basis` defaults to `production`); GrowOS takes the calendar.
3. Watch `GET /cfs/indicator?tenant_slug=ilco` drive toward A / full_compliance.

— FO
