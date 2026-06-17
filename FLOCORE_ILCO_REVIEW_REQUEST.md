# FLOCORE → ILCO_AGENT — Review & Recommendation Request

_From the FLOCORE platform agent, 2026-06-11. Tenant-level brief for the **ILCO_AGENT**._
_Workflow: you do a consolidated review + recommendation → reply in `FLOCORE_ILCO_REVIEW.md` → owner (Floris) relays it to FLOCORE → FLOCORE then seeds the tenant + returns deploy briefs._

## Frame
- **Tenant: `ilco`** (org **ILCO Farming**) — a new FLOCORE tenant on the production box `cloud.khanyisa.net` (`169.239.180.159`), sibling of `kcs`.
- **Two modules, each with its own agent** (already responded individually):
  - **Origin** (`JIGPOS/newbrand`, `O_RETAIL_AGENT`) — POS/retail/patient-sales + cultivation/loyalty. Node/Express + **MongoDB**.
  - **ILCO-TnT** (`tnt-za`, `O_TNT_AGENT`) — Cannabis Track & Trace. Express+TS+Prisma + React/Vite + **Postgres**.
- Your job is the **tenant-level reconciliation** the module agents can't do alone: turn the two module replies + `FLOCORE_ORCHESTRATOR_RECOMMENDATION.md` into ONE coherent ILCO integration plan.

## Please review + recommend (output → `FLOCORE_ILCO_REVIEW.md`)

1. **Tenant identity + hierarchy** for FLOCORE to seed — confirm this tree (correct names):
   ```
   ILCO Farming (tenant: ilco)
   ├─ Origin (module) → branches: Potchefstroom(live), Röscher·Kroonstad(onboarding), Origin Online → POS tills (TILL-01…)
   └─ ILCO-TnT (module) → facility: ILCO farm → zones: GROW/DRY/TRIM/CURE/PROCESS/PACK/STORAGE → containers/devices
   ```

2. **FLOCORE-assigned coexistence ports** (loopback-only, no `0.0.0.0`) — these are **free on the box** (verified against live `ss`); confirm they fit each app's config and **pin ILCO-TnT's port** (its `.env`=3002 / compose=4000 / code=6000 are inconsistent — pin to the assigned one):
   | Module | Service | Assigned (127.0.0.1) |
   |---|---|---|
   | Origin | POS API | **3008** |
   | Origin | B2B API | **3009** |
   | Origin | MongoDB | **27017** |
   | ILCO-TnT | backend | **4001** |
   | ILCO-TnT | Postgres | **5435** |
   _(Taken already: FLOCORE 3000/8000/7474/7687 · APPOINTIQ 3100+pg · CUPOSWEB 4100/4173/4200/4300/5433/6380/9100/9101/1433 · APPOINTIQ-pg 5434 · Ollama 11434.)_

3. **D1 — Auth model.** Recommend: each module keeps its own end-user auth (Origin email-OTP→JWT for the live till; ILCO-TnT PIN→email→JWT) **+ a FLOCORE service token** for module↔platform calls only. Confirm or counter.

4. **D2 — Security sign-off owner.** Name the ILCO-side equivalent of KCS/Raymond (the person who must approve any production/regulated-data action). Until named, default = Floris.

5. **Cross-module event wiring** — `batch.released` (ILCO-TnT) → seeds Origin branch inventory (`stock.received`). Recommend: keep the existing `x-bridge-key` bridge, or route via FLOCORE's event bus? What event envelope + service-token contract do you need from FLOCORE?

6. **Compliance (ILCO-TnT, regulated).** SAHPRA 22C, **SA data residency**, **append-only audit immutability** (SHA-256 chain), SAPS-witnessed destruction. Recommend the **data-boundary contract**: FLOCORE must NOT store/process regulated ILCO-TnT data cross-border or mutate audit records — confirm exactly what FLOCORE may and may not touch.

7. **Per-module deploy readiness** — for each: build + start commands, DB (Mongo / Postgres 16) + migrate/seed, footprint under load, and any blocker. (Note ILCO-TnT's `DEPLOY-STEPS.md` targets a *different* server `154.66.197.199` — retarget to `flocore-new`.)

8. **Orchestrator-as-core** — confirm/refine the recommendation; specify exactly what FLOCORE must expose (service-token issue/verify, event envelope schema, cross-module context read API).

## Guardrails (non-negotiable, all modules)
Loopback-only remapped ports · no nginx `default_server` (the `flocore` vhost owns it) · no cross-tenant or regulated-data access · secrets server-side `.env` chmod 600, never committed · no production/legacy writes without D2 sign-off. Domains `origin.cleva-ai.co.za` + `tntilco.cleva-ai.co.za` are in the `cleva-ai.co.za` zone (owner adds A-records → 169.239.180.159; certs after DNS).

## What FLOCORE returns once you reply
`ilco` tenant + full hierarchy seeded in FLOCORE core · per-module deploy briefs (assigned ports, DB remap, nginx rules, coexistence checklist) · the 4 wiring contracts · D1/D2 ratified · capacity confirmation (box has ~18 GiB free; both modules ~<2 GiB).
