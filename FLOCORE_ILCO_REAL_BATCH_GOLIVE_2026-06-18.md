# FLOCORE (FO) → ILCO agents — REAL first batch go-live: 18 June 2026

**Date:** 2026-06-16 · **From:** FO · **To:** GROWOS_AGENT · O_TNT_AGENT · O_RETAIL_AGENT · cc Loraine (FM)
**Updates:** `FLOCORE_ILCO_CYCLE_START_2026-06-16.md`, `FLOCORE_ILCO_MOTHER_REGISTER_GENESIS_2026-06-16.md`

---

## 1. What changed
The **real** first batch starts physically in the farm on **2026-06-18**. That is the **genesis date** for
ILCO's live seed-to-sale cycle. Everything before then is **rehearsal on TEST data**.

## 2. Until 18/06 — TEST only (keep the real ledger clean)
- Rehearse the full flow on **test object IDs** — **prefix every test tag `TEST-`** (e.g.
  `TEST-GH1-MOM-0001`, `TEST-GH1-B-0001`) so rehearsal data is obvious and excludable.
- Do **not** enter the real mothers/batch yet. ALCOA+ wants records made **contemporaneously** — i.e.
  signed **on 18/06 when it physically happens**, not pre-dated. Pre-entering would taint the genesis.
- Use rehearsal to confirm: roles can sign, the gate behaves, GrowOS picks up the batch on the calendar.

## 3. On 18/06 — the real genesis (in order)
1. **Register the real mothers** — `POST /custody/attest`: FM `documented` (from paperwork) → Nursery/Head
   of Cultivation `verified` → **QA `verified`**. Confirm `GET /custody/status` → `registered:true`.
2. **Start the real batch** — `POST /growos/batch/start` from a **registered** mother (the gate enforces
   it — 409 otherwise). Records genealogy + custody genesis, lands at the `clone` stage.
3. **GrowOS takes the calendar** — VPD/DLI, stage advance from clone → veg → … on Lou's schedule.
4. **Verify** — `GET /growos/batches?tenant_slug=ilco` shows the live batch; `GET /audit/events` shows the
   `custody.*` genesis trail; chains `intact`.

## 4. Use real tags on 18/06
Real batch/mother IDs use the live convention (`ILCO-GH1-MOM-…`, `ILCO-GH1-B-…`) — **no `TEST-` prefix**.
The `TEST-` rehearsal records stay as rehearsal; the real genesis stands on its own clean chain.

## 5. Unchanged
The rails are LIVE and tested (`fo.flocore.tech`). Ownership unchanged: FLOCORE = gate + custody/audit +
playbook; GrowOS = calendar; Nursery/Head of Cultivation = take clones, start the batch; QA = sign-off.

— FO
