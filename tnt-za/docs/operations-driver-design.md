# TnT-ZA — Role-Based Operations Driver (SOP + KPI assistant as the driving force)

**Design, 2026-06-06.** Goal: turn the existing AI/ops stack from **answer-when-asked** into a **proactive driving force** — each role's assistant, grounded in its **SOPs + KPIs + live state**, tells people what to do now, auto-creates tickets/CAPA when something slips, and auto-allocates the day's work. **This is orchestration of what's already built, not a rebuild.**

---

## 1. What already exists (reuse — do NOT rebuild)
Grounded in the codebase (`backend/src/services/`):

| Capability | Service | State |
|---|---|---|
| Per-role AI Q&A (15+ roles, focus + prompt hints) | `general-ops.service` (`ROLE_PROFILES`), Sonnet 4.6 | ✓ works, via `/api/chat` |
| Intent routing | `maestro.service` (Haiku 4.5) | ✓ |
| Owner morning brief | `owner-concierge.service` (Opus) | ✓ (owner only) |
| Per-role KPIs (targets + live actuals) | `kpi.service` (`getKpisForRole`) | ✓ computes, not thresholded |
| Auto-route + auto-escalate tickets | `smart-tickets.service` | ✓ |
| SOP → training + task-templates + QMS ticket | `sop-governance.service` | ✓ |
| Live facility state + risk + inferences | `worldModel.service` | ✓ on-demand |
| Anomaly detect/resolve | `anomaly.service` (8 rules) | ✓ |
| Domain events | `eventBus.ts` | ⚠ emit-only, **no listeners** |
| Shift/task allocation | `shift.service` | ⚠ manual |
| Immutable AI audit | `ai-audit.service` (hash-chained) | ✓ |

## 2. The gaps that make it "driving" (this is what we build)
1. **Closed loop** — `eventBus` has no listeners; world model + KPIs only recompute when a page asks. Nothing reacts.
2. **KPI breach → action** — KPIs have targets but no breach detection → no auto-ticket.
3. **A heartbeat** — no scheduler; the "what to do now" never gets pushed.
4. **A per-role action queue** — the assistant has no proactive feed; it's stateless Q&A with no SOP context.
5. **Auto-allocation** — FM allocates shifts by hand; no SOP-workload-driven auto-fill.

---

## 3. Architecture — "The Driver Loop" + the per-role Co-pilot

```
        ┌──────────────────────── THE DRIVER (new, thin) ────────────────────────┐
 events │  SENSE            EVALUATE              ACT                  SURFACE      │
 ───────▶ eventBus    →  rules engine:      →  reuse existing:   →  per-role       │
 + tick │ listeners +    · KPI vs target       · smart-tickets      Action Queue   │
 (cron) │ scheduler      · anomaly fired        (create/route)      (the feed)     │
        │                · SOP overdue          · tasks.service                    │
        │                · world-model infer    · sop-governance                   │
        │                · weight variance       · shift auto-alloc                │
        └───────────────────────────────────────────────────────────────────────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │  Per-role CO-PILOT (extend     │
                         │  general-ops chat):            │
                         │  • SOP context injected         │
                         │  • role KPIs + Action Queue     │
                         │  • conversation memory          │
                         │  • can EXECUTE (close ticket,   │
                         │    complete task, allocate)     │
                         └────────────────────────────────┘
```

**Four moving parts, three of them thin glue over existing services:**

### 3.1 SENSE — close the event loop (NEW, small)
- Register `eventBus.on(...)` listeners + a **scheduler** (node-cron / Bull) that fires a tenant "tick" (e.g., every 15 min + shift boundaries).
- On event/tick → recompute `worldModel.computeState` + `kpi.getKpisForRole` for affected roles. This is the heartbeat the platform is missing.

### 3.2 EVALUATE — the rules engine (NEW, the core)
A single `driver.service` that, given fresh world state + KPIs + anomalies + SOP status, produces **Drivers** (things that need doing). Rule sources, all already computed elsewhere:
- **KPI breach** — `actual` worse than `target` (e.g., clone_rooting < 85%, ticket_resolution > 3 days).
- **Anomaly fired** — from `anomaly.service` (the 8 rules).
- **SOP overdue / untrained** — from `sop-training` / `sop-governance`.
- **World-model inference** — the 5 existing inference rules (diversion pattern, quota pressure, lab bottleneck…).
- **Task/checklist overdue** — from `tasks.service`.
Each Driver = `{ role, severity, sourceType, evidence, suggestedAction }`.

### 3.3 ACT — reuse existing actuators (GLUE)
Map each Driver → an existing service call, idempotently (don't double-create):
- breach/anomaly/inference → `smart-tickets` create + `autoRouteTicket`.
- SOP gap → `sop-governance` (already does training+template+ticket).
- workload → `shift` **auto-allocate** (new: fill the day's SOP-driven tasks across available staff, respecting role + simple constraints: min coverage, no solo night).
- everything writes to the immutable `AuditLog` + `ai-audit`.

### 3.4 SURFACE — the per-role Action Queue + Co-pilot (EXTEND chat)
- Persist Drivers as a per-role **Action Queue** (`DriverItem` table) shown on each role dashboard: "Your shift: 5 things, 2 urgent." This is the *driving force* the user sees.
- Extend `general-ops` chat: inject the role's **relevant SOP sections** + its **Action Queue** + **KPIs** into the prompt; add **conversation memory** (session) and **executable actions** (the existing `buildChatActions` already suggests buttons — wire them to actually run: close ticket, complete task, accept allocation).

---

## 4. Per role — how SOPs + KPIs + queue come together
For each role (FM · Nursery Mgr · Nursery Staff · Cultivation Mgr/Head Grower · Processing · QA/Compliance · RP — *GroOS/HoC excluded*):
- **KPIs:** already in `kpi.service` (extend coverage to the corrected cultivation roles).
- **SOPs:** `sop-governance` already maps category→roles; the Co-pilot injects the role's active SOP steps as "today's checklist."
- **Action Queue:** the Driver feeds it; breaches/anomalies/overdue SOPs become tickets/tasks assigned to the role.
- **Drive:** morning, the Co-pilot opens with "Here's your shift" (SOP tasks + KPI status + queue), not a blank chat box.

## 5. New data (minimal)
- `DriverRule` (optional config) — threshold/source/severity/targetRole/action; seed from the hardcoded KPI targets so they become tunable.
- `DriverItem` — the per-role action queue row (role, severity, source, evidence, linkedTicketId/taskId, status, dedupeKey, createdAt).
- `ChatSession` / `ChatMessage` — conversation memory.
- Everything tenant-scoped; idempotency via `dedupeKey` so the loop never spams duplicates.

## 6. Phasing (highest-leverage first)
1. **Close the loop** — eventBus listeners + scheduler + `driver.service` EVALUATE producing `DriverItem`s from **KPI breach + anomalies + overdue SOP** (read-only feed first; no auto-tickets yet). *Proves the brain works before it acts.*
2. **ACT (tickets)** — wire Drivers → `smart-tickets`/`tasks`/`sop-governance` idempotently.
3. **SURFACE** — per-role Action Queue card on dashboards + Co-pilot opens with the queue; inject SOPs + KPIs + memory.
4. **Auto-allocation** — `shift` auto-fill from the day's SOP workload + constraints.
5. **Executable chat actions** — let the Co-pilot run actions (close/complete/allocate) with RBAC + audit.

## 7. Reuse / non-goals
**Reuse:** general-ops, maestro, kpi, smart-tickets, sop-governance, worldModel, anomaly, tasks, shift, ai-audit, eventBus, RBAC, tenants — the Driver is **thin glue + one rules engine**, not a new platform. **Non-goals:** replacing any existing service, ML/optimisation for allocation (start with simple constraints), cross-tenant logic.

## 8. The one-line pitch
> Wire the heartbeat (events + tick) into a rules engine that reads the KPIs/anomalies/SOPs you already compute, turns breaches into tickets you already auto-route, and hands each role a live "what to do now" queue inside the chat assistant you already have.
