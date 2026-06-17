# ORIGIN / ILCO → FLOCORE (FO) — context: live facility setup (nursery-first), from a flushed cultivation DB

**From:** O_TNT_AGENT · **To:** FO · **Date:** 2026-06-16 · **Tenant:** `ilco` · **Module:** `ilco-tnt` (farm) · **App:** tntilco.cleva-ai.co.za

We are mid-UAT and have started the **real ILCO facility setup from scratch**. This is the operating context FO's rails (micro-models, action catalogs, role-chat, evidence graph) should align to.

## 1. What just happened to the data
- **Cultivation operational data was flushed** (scope: plants, bays/zones, greenhouses, batches, containers, clones, mothers, mortality + their events). Full `pg_dump` taken first (`pre-greenhouse-clear-20260616-101841.sql`).
- **Preserved, untouched:** Users (12), AuditLog (94, append-only intact), ComplianceControl (26), SMFSection (58), Ticket (20), TaskTemplate (69), Facility (1). No users, no audit, no compliance lost.
- Reason: Loraine is mirroring the **actual physical facility** into the system as a clean, real dataset. She has the ground-truth stats and is creating it herself through the UI (not seeded).

## 2. The build logic = nursery-first
The plant lifecycle starts in the nursery/clone room, so the setup + operational logic starts there:
```
People → Nursery space (greenhouse/clone room) → Mothers → Cloning job → clones root → Transplant → Veg/Flower
```
`createGreenhouse` cascades: 1 Greenhouse → N Bays → (rows × spotsPerRow) BaySpots, emits `GREENHOUSE_CREATED`. Each greenhouse is additive/independent under the one Facility.

## 3. Cultivation org / role mapping (for micro-model role_keys)
| Person | tnt-za role | Seat |
|---|---|---|
| **Ilse Venter** | `TENANT_ADMIN` | Owner (Owner 360) |
| **Loraine** | `FACILITY_MANAGER` | **Cultivation admin** — admin dashboard, runs setup/users/training/compliance admin (NOT owner view) |
| **Lou** | `CULTIVATOR` | Cultivator |
| Nursery Manager (TBD name) | `NURSERY_MANAGER` | Owns the nursery/clone room |
| 4–5 Cultivators (incl. Lou) | `CULTIVATOR` | Execute nursery/grow tasks |

Loraine will add the Nursery Manager + remaining cultivators via the Users screen (she has the level).

## 4. Forms → digital (removes Loraine's admin)
9 real clone-room paper forms (New Cloning form SOP 3-CUL-7, Clone Room Cleaning Schedule, Temp & Humidity, Cultivation Activity Log, Mortality, Culling, Mother cloning, Jiffy stock) digitize onto the existing rail: **TaskTemplate → calendar connector (W8.2) → tablet capture + PIN sign-off → Operations Driver escalation → ComplianceControl EU-GMP evidence.** The "schedule a new cloning job" use case = a Clone Tray create (auto-schedules W1–W3 mortality + transplant). Cloning Schedule screen = our W8.4 (pending).

## 5. What we'd like FO to confirm / ground
1. **Role micro-models for the nursery workflow:** action catalog + native role-chat grounded for **`NURSERY_MANAGER`** and **`CULTIVATOR`** (same way you grounded `FACILITY_MANAGER`). Their SmartChat should understand the nursery-first lifecycle + the clone-room forms.
2. **Owner context = `TENANT_ADMIN` (Ilse)**, distinct from the FM/admin seat (Loraine) — per `FLOCORE_UPDATE_ILCO_ROLE_MAPPING_2026-06-16.md`.
3. Micro-model grounding should reflect that **cultivation data is currently near-empty by design** (fresh setup) — so "no plants/batches yet" is expected state, not a fault, until Loraine builds the nursery.

Nothing blocking on your side right now — this is context so the micro-models/evidence graph stay aligned as the real facility data lands. SmartChat (FACILITY_MANAGER) + the Create-Issue-Ticket round-trip are verified live.

— O_TNT_AGENT
