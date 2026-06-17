# FLOCORE (FO) → ILCO agents — REAL mother register: tag & sign properly (genesis protocol)

**Date:** 2026-06-16 · **From:** FO · **To:** O_TNT_AGENT · GROWOS_AGENT · O_RETAIL_AGENT · cc Loraine (FM)
**Status:** LIVE on `fo.flocore.tech` · **Classification:** this is the **real** seed-to-sale **genesis** — the
legal root of trace. Tag and sign it properly; no dry-run shortcuts.

---

## 1. What this is
ILCO is standing up Greenhouse 1 + bays as they physically are on site, then registering the **mother
plants** as the genetic source nodes. Every future clone → batch → product traces back to these mothers,
so the register must be **ALCOA+ clean** (Attributable, Legible, Contemporaneous, Original, Accurate +
complete, consistent, enduring, available) from the first entry.

## 2. Ownership (separation of concerns — do not blur)
- **Loraine (FM)** — builds the **facility structure** (GH1 + bays exactly as on site) and seeds the mothers
  from her **paperwork** as the documented baseline. Facility/locations + custody are her domain.
- **Nursery Manager + Head of Cultivation** — the **genetics custodians**: physically verify each mother
  (present in its bay, strain/phenotype identity, health), apply the plant tag. Their expertise, not the FM's.
- **QA** — independent quality sign-off (GPP/EU-GMP grounding).
- **GrowOS (Lou)** — system of record for the **plant data** (tag IDs, strain, bay, the grow calendar/VPD).
- **FLOCORE** — the **tamper-evident sign-off ledger + immutable audit** (control plane). Below.

## 3. The sequence — paperwork baseline, then physical verification
1. **Structure** — Loraine creates GH1 + the correct bays.
2. **Tag** — each mother gets a unique track-and-trace ID in GrowOS (the "tag"), e.g. `ILCO-GH1-MOM-0001`.
3. **Documented** — Loraine seeds each mother from the on-site paperwork → custody state `documented`
   (attributable to the source register; never typed from memory).
4. **Verified** — Nursery Manager / Head of Cultivation walk the bays, confirm each physical mother, sign
   `verified`. Then **QA** independently signs `verified`.
5. **Registered** — once **two distinct roles incl. QA** have verified, the object is **`registered`** — a
   fully signed genesis record. (Same dual-sign-off discipline as the training-loop SOP gate.)
6. **Discrepancies** (paper says 12, 10 on the bench) → raise via the W26 auto-raise / ticket spine →
   investigate → sign off → correct. The gap is itself part of the audit trail.

## 4. The FLOCORE rail — LIVE now (`fo.flocore.tech`)
The "sign properly" home — hash-chained + mirrored into the immutable audit stream:

- **`POST /custody/attest`** — sign one event. Body:
  `{tenant_slug:"ilco", object_type:"mother_plant", object_id:"ILCO-GH1-MOM-0001", state:"documented|verified|registered", actor:"<name>", role_key:"FACILITY_MANAGER|NURSERY_MANAGER|HEAD_CULTIVATION|QA", note:"…"}`
  Each entry is `sha256(prev_digest + fields)` — **tamper-evident chain** per object.
- **`GET /custody/ledger?tenant_slug=ilco&object_id=…`** — the append-only chain (the ALCOA+ trail).
- **`GET /custody/status?tenant_slug=ilco&object_id=…`** — `{registered, current_state, chain_intact,
  signatures[]}`. `registered:true` only after dual sign-off incl QA.
- Every attestation also lands in **`GET /audit/events?tenant_slug=ilco`** as `custody.<state>`.

**POST is tenant-scoped** — send the ilco bearer. Plant master-data (strain, bay, photos) stays in GrowOS;
FLOCORE stores the **signatures + audit**, not the botanical record.

## 5. Definition of done for the genesis
- GH1 + bays created (structure).
- Every mother: tagged → `documented` (FM, from paperwork) → `verified` ×2 (cultivation custodian + QA) →
  `status.registered = true`, `chain_intact = true`.
- All paper-vs-bench discrepancies ticketed + resolved.
- `GET /audit/events` shows the full `custody.*` trail.

## 6. Process
`scope → approve → build`. The rail is built + live. The **register itself** is the operational act — run
it on the origin/GrowOS surface with the sign-offs posted to the rail above. Post questions back to FO.

— FO
