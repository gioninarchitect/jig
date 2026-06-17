# FLOCORE ← Origin / ILCO Farming — Recommendation: position the Orchestrator as the core layer

_From the **Origin/ILCO module agents** (O_RETAIL_AGENT + O_TNT_AGENT), 2026-06-06. Follows `FLOCORE_INTEGRATION_RESPONSE.md` in `JIGPOS/newbrand/` and `tnt-za/`._

## TL;DR
We've supplied both module specs. Before wiring ports and contracts, our recommendation: **make the Orchestrator FLOCORE's *core* layer — not a side-service.** Every tenant, module, agent, event and dashboard should sit *on top of* it. Modules stay autonomous (own DB, own agent, own deploy); the Orchestrator is the thin, authoritative spine that gives the multi-tenant / multi-module / multi-agent platform coherence. Without it you have N disconnected apps sharing a box.

## Why core (not a bolt-on)
The integration requests kept pointing at "the shared tenant" as the coordination point. That shared tenant only *means* something if a core layer enforces it. The Orchestrator **is** that shared tenant, made concrete. It's the one component that can:
- keep modules from absorbing each other (the boundary rule),
- route events between them (TnT `batch.released` → Origin `stock.received`),
- give any dashboard a platform-wide read model,
- and dispatch work to the right **module agent**.

Put it anywhere but the core and each of those becomes per-module glue that drifts.

## What the Orchestrator owns (6 responsibilities)
1. **Identity & tenancy** — OTP→JWT + **service tokens**; the registry of tenants → modules; the org hierarchy contract (tenant → sites → outlets → devices). Modules may keep their own end-user auth but trust the Orchestrator for *module↔platform* calls. *(See open decision D1.)*
2. **Event bus / routing** — modules emit/consume named events; the Orchestrator routes cross-module. Canonical map seeded from the module replies (sale/till/stock/section21/loyalty ↔ plant/batch/COA/custody/`batch.released`).
3. **Cross-module context (read model)** — a platform-wide, tenant-scoped read API so any module or unified dashboard can query state it doesn't own, **without cross-tenant access**.
4. **Agent orchestration** — a **registry of module agents** (`O_RETAIL_AGENT`, `O_TNT_AGENT`, … extensible per module/tenant). The Orchestrator dispatches a task to the correct agent, enforces boundaries ("coordinate via shared tenant, don't absorb"), and aggregates results. This is where the platform's AI coordination lives.
5. **Coexistence governance** — the authoritative **port registry** (loopback remap), nginx rules (no `default_server`), capacity ledger, the **SQL-write gate**, and the security sign-off record. One source of truth instead of per-deploy memory.
6. **Observability** — unified audit/event stream + health, tenant-scoped.

## How modules plug in (keep autonomy)
| Module keeps | Module gets from the Orchestrator |
|---|---|
| Own DB (Origin=Mongo, TnT=Postgres), own deploy, own agent | service-token identity, event in/out, cross-module context, assigned ports, unified dashboard slot |

Thin contract, not a framework — modules don't rewrite to "fit" FLOCORE; they register and emit.

## Agent layer (the new part)
We've created per-module agents on our side (`.claude/agents/O_RETAIL_AGENT.md`, `O_TNT_AGENT.md`). Recommendation: the Orchestrator maintains the **agent registry + routing** so a task ("reconcile the till", "release a batch") is dispatched to the right module agent by tenant+module, with the FLOCORE platform agent as the top-level router. Agents stay scoped; the Orchestrator composes them.

## What we need from FLOCORE to wire this
1. The **service-token** contract (issue/verify) for module↔Orchestrator calls.
2. The **event envelope** schema (tenant, module, name, payload, idempotency key) + the publish/subscribe endpoints at `127.0.0.1:8000`.
3. The **cross-module context** read API shape (tenant-scoped).
4. Assigned **loopback ports** for both modules (per our replies) + the agent-registry interface.

## Open decisions (owner — Floris)
- **D1 — Auth:** modules keep own end-user auth + consume Orchestrator service-token for platform calls (our recommendation), or full FLOCORE identity for end-users too.
- **D2 — Security sign-off owner** for the Origin/ILCO tenant (equivalent of KCS/Raymond).

_Secrets stay server-side (`.env`, chmod 600, never committed)._
