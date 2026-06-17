# FLOCORE (FO) → ILCO agents — start the grow cycle FROM the registered mothers

**Date:** 2026-06-16 · **From:** FO · **To:** GROWOS_AGENT · O_TNT_AGENT · O_RETAIL_AGENT · cc Loraine (FM)
**Status:** LIVE on `fo.flocore.tech` · follows on from the mother-register genesis
(`FLOCORE_ILCO_MOTHER_REGISTER_GENESIS_2026-06-16.md`).

---

## 1. The rule (track-and-trace integrity)
You may **only propagate from a `registered` mother** — one that passed dual sign-off (≥2 distinct roles
incl QA). Propagating from an unverified mother breaks seed-to-sale trace, so the rail **hard-blocks it
(HTTP 409)**. Get the mothers registered first, then take clones.

## 2. The rail — LIVE now
- **`POST /growos/batch/start`** — start a batch from a mother. Body:
  `{tenant_slug:"ilco", batch_id:"ILCO-GH1-B-0001", mother_id:"ILCO-GH1-MOM-0001", strain:"…", count:24, actor:"<name>", role_key:"NURSERY_MANAGER", site:"GH1"}`
  - **Gate:** `mother_id` must be `registered` → else **409** (verified live).
  - On success: records **genealogy** `[mother_id]`, writes a **custody genesis** for the batch (chained +
    audited), and starts it at the **clone / propagation** stage.
  - Tenant-scoped POST — send the ilco bearer.
- **`GET /growos/batches?tenant_slug=ilco&mother_id=…&stage=…`** — trace batches by mother or stage.
- The batch's first-stage SOPs/checklist come from **`GET /growos/cycle/stage?stage=clone`** (the W37
  playbook: cloning SOP, dome RH, rooting check, label).

## 3. Ownership (unchanged)
- **FLOCORE** — the gate (registered-only), genealogy, custody genesis + audit, the cycle **playbook**
  (stage SOPs/checklists/targets). This is the control plane.
- **GrowOS (Lou)** — the **calendar**: which batch is in which room, VPD/DLI, **when** to advance each
  stage. FLOCORE defines the stages; GrowOS runs them.
- **Nursery Manager / Head of Cultivation** — take the clones, start the batch (they're the `actor`).

## 4. Sequence
1. Mothers `registered` (genesis protocol). ✅ prerequisite.
2. Nursery Manager takes clones from a registered mother → `POST /growos/batch/start` (count = clones taken).
3. Batch lands at **clone** stage with its genealogy + custody chain; GrowOS picks it up on the calendar.
4. GrowOS advances it through veg → flower → harvest → dry → cure on its schedule; each batch traces back
   to its mother for the life of the cycle.

## 5. Definition of done (cycle start)
- Each started batch: `genealogy = [mother_id]`, `stage_key = "clone"`, its own custody chain `chain_intact`.
- No batch exists whose mother isn't `registered` (the gate guarantees this).
- `GET /growos/batches?tenant_slug=ilco` shows the live cycle; `GET /audit/events` shows `custody.documented`
  for each batch genesis.

— FO
