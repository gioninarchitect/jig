# FLOCORE (FO) → ILCO cluster — 18/06 cannabis GO-LIVE run sheet (agent-assigned)

**Date:** 2026-06-17 · **From:** FO (super admin: Floris) · **To:** O_TNT_AGENT (lead) · GROWOS_AGENT
**Status: GO** — Sentinel 15/15 + readiness check green (role grounding 34 · CFS 66.2/B · batch-start gate 409 · schedule 14 stages/117d · HOC role-chat grounded). **O_RETAIL_AGENT: not involved** (retail is separate).

---

## Agent split
- **O_TNT_AGENT (lead):** the tnt-za/ilco-tnt cultivation app — facility setup, mothers register, cloning job, role dashboards, Feeding tab. Where Loraine/Edgar/Lou/Jeanette/Ilse work.
- **GROWOS_AGENT:** the grow **calendar** (Lou builds it) + Lou's cockpit. PRIVA/igator extraction continues in parallel — **not a blocker for the 18/06 cloning run.**
- **FLOCORE (FO):** the go/no-go gate, the rails, and **live verification** of each step. FO does NOT enter cultivation data.

## Run sheet — nursery-first (people act in the app; agents support)
| # | Owner agent | Person | Action | Rail | FO verifies |
|---|---|---|---|---|---|
| 1 | O_TNT_AGENT | Loraine (FM) | Build facility → greenhouse → bays → nursery/clone room | tnt-za `createGreenhouse` | structure present |
| 2 | O_TNT_AGENT | Loraine → Edgar/Lou → **QA (Jeanette/RP)** | Register mothers as **CFS baseline** (`basis:"cfs"`, real `effective_date`) → dual sign-off (incl QA) | `POST /custody/attest` | `GET /custody/status` → `registered:true` |
| 3 | O_TNT_AGENT | Edgar (NM) | Cloning job from a **registered** mother (count = clones) | `POST /growos/batch/start` | genealogy `[mother]`, `clone` stage; **gate blocks any unregistered (409)** |
| 4 | GROWOS_AGENT | Lou (HOC) | Build the grow **calendar** (tenant side) from the template | GrowOS + `POST /growos/cycle/schedule` (start 18/06) | calendar live; SOPs ground to stage |
| 5 | O_TNT_AGENT | Loraine/QA | Author the **clone-stage SOP** green before the run (just-in-time) | `/sops/draft` → `/sops/author` (dual sign-off) | SOP `active`, signed |
| 6 | FLOCORE | — | Confirm the genesis is clean | `/growos/batches` · `/audit/events` · `/cfs/indicator` | chains intact, `custody.*` trail, CFS lifts |

## Ownership / boundaries (no blur)
- **Calendar = HOC/cultivation admin (GrowOS, tenant side).** FO supplies the cycle template + SOPs/custody; it does not own the calendar.
- **CFS baseline ≠ forward genesis.** Existing mothers = CFS (recorded now, real inception as a data field). The **18/06 cloning run is the forward production genesis** — signed contemporaneously on the day, real IDs (no `TEST-`).
- **Recommend-only** into the regulated process (SAHPRA/EU-GMP); humans sign. Per-(tenant×customer) silo; append-only audit.

## Comms
Route everything through **Floris (super admin)**. Do NOT brief owners/clients/operators directly. Post go-live results back to FO on the day.

## On the day
Ping FO when you start step 2 — FO watches the custody registrations + the batch start + the audit trail live and confirms green at step 6.

— FO
