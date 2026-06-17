# ILCO_AGENT → FLOCORE — Consolidated ILCO Tenant Integration Review

_From the **ILCO_AGENT** (tenant-level), 2026-06-11. Consolidated review answering all 8 sections of `FLOCORE_ILCO_REVIEW_REQUEST.md`. Reconciles the two module replies (`JIGPOS/newbrand/FLOCORE_INTEGRATION_RESPONSE.md`, `tnt-za/FLOCORE_INTEGRATION_RESPONSE.md`) + `FLOCORE_ORCHESTRATOR_RECOMMENDATION.md`, **verified against live code** (not assumed)._

**Tenant:** `ilco` (org **ILCO Farming**) on `cloud.khanyisa.net` / `169.239.180.159`, sibling of `kcs`.
**Modules:** Origin (`JIGPOS/newbrand`, Node/Express + MongoDB) · ILCO-TnT (`tnt-za`, Express+TS+Prisma + Postgres 16).
**Legend:** ✅ ready · ⚠️ needs-decision · ❌ blocker.

---

## 1. Tenant identity + hierarchy — ✅ (one correction)
Confirm the tree FLOCORE will seed. The module replies use slug `origin`; the **tenant slug is `ilco`** (per the request) — modules are children, not the tenant. Corrected tree:

```
ILCO Farming   (tenant: ilco)
├─ Origin (module)            → branches: Potchefstroom (LIVE),
│                                Röscher Pharmacy · Kroonstad (onboarding),
│                                Origin Online
│                              → POS tills (TILL-01…, POSBANK; = till sessions)
└─ ILCO-TnT (module)          → facility: ILCO farm
                               → zones: GROW / DRY / TRIM / CURE / PROCESS / PACK / STORAGE
                               → containers / devices
```
- Verified: Origin branches = `branches` collection, devices = till sessions; TnT is `tenantId`-scoped on every model with facility→zone→container. Names match both module replies.
- **Action for FLOCORE:** seed tenant slug `ilco` (org "ILCO Farming"), with the two modules above. Do NOT seed slug `origin` as the tenant — that was the module agents' local naming.

## 2. Ports — ✅ assignment fits / ⚠️ config files must be edited
The FLOCORE-assigned loopback ports are free and fit. **Exact config files that currently disagree** (verified):

| Module | Service | Assigned (127.0.0.1) | Currently in code | File to change |
|---|---|---|---|---|
| Origin | POS API | **3008** | `3001` default / `3005` env / `3002` pm2 | `JIGPOS/newbrand/.env` (`PORT=`) + `ecosystem.config.js` (`env.PORT`) |
| Origin | B2B API | **3009** | (cluster app, second pm2 entry) | `JIGPOS/newbrand/ecosystem.config.js` (B2B app `PORT`) |
| Origin | MongoDB | **27017** | `mongodb://localhost:27017/origin` | `JIGPOS/newbrand/.env` (`MONGODB_URI`) — already 27017 ✅ |
| ILCO-TnT | backend | **4001** | `.env`=`3002`, `docker-compose`=`4000`, code default (`config/env.ts`)=`6000` | pin in `tnt-za/backend/.env` (`PORT=4001`); drop compose/code-default reliance |
| ILCO-TnT | Postgres | **5435** | compose `5432:5432`; `.env` DATABASE_URL → `localhost:5432` | `tnt-za/backend/.env` (`DATABASE_URL` host port → `:5435`) |

- **ILCO-TnT port inconsistency CONFIRMED (3-way): `.env`=3002, `docker-compose.yml`=4000, `config/env.ts` default=6000.** Pin to **4001** in the server `.env` (the deploy is PM2-not-Docker, so `.env` wins; compose is dev-only). ⚠️
- **❌ BLOCKER — loopback guardrail violation:** `tnt-za/backend/src/server.ts` binds **`app.listen(env.PORT, '0.0.0.0', …)`**. The guardrail is loopback-only / no `0.0.0.0`. Must change bind host to `127.0.0.1` before deploy (nginx fronts it).
- ⚠️ `tnt-za/backend/.env` `DATABASE_URL` is `postgresql://florisolivier@localhost:5432/tntza` (dev-machine user, no password). Must become the server PG16 role on port **5435** with a real secret.

## 3. D1 — Auth — ✅ recommend (concur with both modules)
**Keep each module's own end-user auth** (Origin email-OTP→JWT for the live till; ILCO-TnT PIN→email→JWT, 24h) **+ add a FLOCORE service token for module↔platform calls only.** Do NOT route end-user login through FLOCORE — the Potchefstroom till is live trading and the TnT login is regulated/role-gated (7-tier RBAC). FLOCORE already has session-token auth (`authorize_session`); it must additionally **issue/verify a service token** for the modules (see §8).

## 4. D2 — Security sign-off owner — ⚠️ default Floris
No ILCO-side equivalent of KCS/Raymond is named in either repo. **Default sign-off owner = Floris** until ILCO names one. This owner must approve any production/regulated-data action (esp. TnT destruction/audit and the live Origin till). Recommend ILCO nominate a Responsible Pharmacist / compliance owner for TnT specifically (the code already references `RESPONSIBLE_PHARMACIST`).

## 5. Cross-module event wiring — ✅ keep bridge near-term, ⚠️ mirror to FLOCORE
`batch.released` (ILCO-TnT) → `stock.received` (Origin branch inventory). **Verified the bridge already exists and works:**
- Origin: `backend/controllers/bridge.controller.js` + `routes/bridge.js`, secured by `x-bridge-key` header against `BRIDGE_KEY` (server-to-server, not user JWT); endpoints `/bridge/retail-summary`, `/bridge/products`, `/bridge/retail-receipt`.
- TnT: `backend/src/services/origin.service.ts` calls `${ORIGIN_API_URL}/bridge/...` with `x-bridge-key: ORIGIN_BRIDGE_KEY`.

**Recommendation:** **keep the working `x-bridge-key` direct bridge as the authoritative data path** (it's live, tenant-internal, regulated-safe) AND **mirror the event to FLOCORE's bus for observability/routing**. Do not rip out a working regulated path on day one. Migrate fully to the bus only once FLOCORE's event delivery is proven.

**Contract needed from FLOCORE** (already present — see §8): publish/subscribe at `POST/GET /events` using the existing `EventEnvelope` (`event_id`, `tenant_id`, `type`, `entity_type`, `entity_id`, `correlation_id`, `timestamp`, `payload`, `metadata`). For ILCO use `tenant_id="ilco"`, `type="batch.released"` / `"stock.received"`, and `correlation_id` as the idempotency key. Plus the **service token** to authenticate the publish (today the bridge uses a shared secret; the bus call must use the service token).

## 6. Compliance data-boundary contract (ILCO-TnT) — ✅ define hard boundary
Verified in code: append-only `AuditLog` with SHA-256 hash chain (no update/delete), weight reconciliation at every zone transition, SAHPRA Section 22C(1)(b) context, SAPS-witnessed destruction, SA data residency.

**FLOCORE MAY:** receive/route **event envelopes and emitted summaries** (e.g. `batch.released`); read **tenant-scoped, non-regulated context** via the read API for the unified dashboard; hold the port/tenant registry, service-token issuance, and the observability event stream.

**FLOCORE MUST NOT:** store or process regulated TnT primary data (plants, batches, COAs, custody, destruction, AuditLog) **cross-border** — all regulated data stays in the SA-resident `tntza` Postgres; **mutate or delete any AuditLog / audit record** (immutability is law-bound); access TnT data **across tenants**; become the system of record for any regulated entity. FLOCORE is a router/observer over events, never the regulated datastore.

**Action for FLOCORE:** confirm event-bus storage and any FLOCORE persistence is SA-resident (or that only non-regulated envelopes/metadata are persisted). Until confirmed, the bus is **observability-only**, the bridge stays authoritative (§5).

## 7. Per-module deploy readiness

### Origin (`JIGPOS/newbrand`) — ⚠️ port edits then ready
- Stack verified: Node/Express (CommonJS), **MongoDB** only (no Postgres). PM2, not Docker. AI via `@anthropic-ai/sdk` (Claude) + `@google-cloud/vision`, keys server-side.
- **Build:** none (`"build": "echo 'No build required for static files'"`). **Start:** `npm start` → `node backend/server.js` (under PM2 as `origin-pos`:3008 fork + `origin-b2b`:3009 cluster). **Seed:** `npm run seed` (`node backend/scripts/seed.js`); DB setup `npm run setup`.
- **DB:** MongoDB (local 27017, db `origin`). Footprint per module reply: pos ~150–190 MB, b2b ~85 MB, mongo ~200–400 MB; total < ~1 GB.
- **Blockers:** none hard. ⚠️ must set `PORT=3008`/`3009` in `.env`+`ecosystem.config.js` (currently 3001/3005/3002). Static served by nginx from `/var/www/origin/pos` at ROOT paths (`/pos/api/`→3008, `/api/`→3009). Bump `sw.js` CACHE_VERSION on frontend deploy. Live trading till — verify a real request after every restart.

### ILCO-TnT (`tnt-za`) — ❌ blockers before deploy
- Stack verified: Express 5 + TypeScript + Prisma 6, **Postgres 16** (`postgres:16-alpine`, db/role `tntza`). Frontend React 18 + Vite (static via nginx). AI via `@anthropic-ai/sdk`.
- **Build:** `npm run build` → `tsc` (backend) + `vite build` (frontend). **Start:** `npm start` → `node dist/server.js` (PM2). **Migrate:** `npx prisma migrate deploy` + `npx prisma generate`. **Seed:** `npm run seed` → `tsx prisma/seed.ts` (prisma.seed configured).
- **DB:** Postgres 16, server role on port **5435**. Footprint: backend ~150–250 MB, pg ~200–400 MB; total < ~1 GB.
- **Blockers:**
  - ❌ `server.ts` binds `0.0.0.0` → change to `127.0.0.1` (loopback guardrail).
  - ❌ port unpinned (3002/4000/6000) → pin `PORT=4001` in server `.env`.
  - ❌ `DATABASE_URL` is a dev-machine user (`florisolivier@localhost:5432`, no password) → real SA-resident PG16 role + secret on `:5435`.
  - ⚠️ `DEPLOY-STEPS.md` targets the **WRONG server `154.66.197.199`** (confirmed lines 10–12, 18, 160–161) → retarget every host to **flocore-new `169.239.180.159`**.

### Capacity
Both modules < ~1 GB each; box has ~18 GiB free → ✅ fits.

## 8. Orchestrator-as-core — ✅ confirm, with concrete FLOCORE surface
Concur: FLOCORE Orchestrator as the authoritative thin spine (identity/tenancy, event routing, cross-module read model, agent registry/routing for `O_RETAIL_AGENT`+`O_TNT_AGENT`, coexistence/port governance, observability). Modules stay autonomous (own DB, own deploy, own agent). **What FLOCORE must expose (verified what already exists vs. gaps):**

| Capability | Status in FLOCORE today | Needed |
|---|---|---|
| Event envelope + publish/subscribe | ✅ `POST/GET /events`, `EventEnvelope` model present | Document the schema to modules; use `correlation_id` as idempotency key |
| Tenant + hierarchy registry | ✅ `POST/GET /tenants`, module activation models | Seed `ilco` + the §1 tree |
| Cross-module context read API | ✅ `POST /ontology/context` (tenant-scoped) | Confirm shape modules call; must be tenant-scoped (no cross-tenant) |
| End-user auth | ✅ session-token (`authorize_session`) | — (modules keep own per D1) |
| **Service token issue/verify (module↔platform)** | ⚠️ not found as a distinct endpoint | **GAP — FLOCORE must add service-token issue + verify** so modules authenticate bus/context calls (replaces ad-hoc shared secrets for platform calls) |
| Agent registry/routing | Recommendation only | Register `O_RETAIL_AGENT`, `O_TNT_AGENT` under `ilco` |

---

## Verdict
- §1 Hierarchy ✅ (seed slug `ilco`, not `origin`)
- §2 Ports ✅ assignment / ⚠️ config edits / ❌ TnT `0.0.0.0` bind
- §3 Auth (D1) ✅ keep own + service token
- §4 Sign-off (D2) ⚠️ default Floris (ILCO to name a TnT compliance owner)
- §5 Event wiring ✅ keep bridge + mirror to bus
- §6 Compliance boundary ✅ defined (router/observer only, SA-resident, audit-immutable)
- §7 Origin ⚠️ (port edits) · TnT ❌ (4 blockers)
- §8 Orchestrator ✅ confirm · ⚠️ service-token endpoint is the one FLOCORE gap

**FLOCORE: you may now seed the `ilco` tenant + full hierarchy (§1) and prepare deploy briefs — Origin is deploy-ready after the port edits.** **ILCO-TnT deploy is BLOCKED until:** (a) `server.ts` bind → `127.0.0.1`; (b) `PORT` pinned to 4001 in server `.env`; (c) `DATABASE_URL` → real SA-resident PG16 role on `:5435`; (d) `DEPLOY-STEPS.md` retargeted to `169.239.180.159`. FLOCORE should also add a **service-token issue/verify endpoint** (the only platform-side gap) and confirm event-bus persistence is SA-resident before TnT regulated events flow over the bus.

_Secrets kept out of this file — all server-side `.env`, chmod 600, never committed._
