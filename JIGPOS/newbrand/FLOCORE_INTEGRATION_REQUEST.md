# FLOCORE ← Origin (newbrand) — Integration Information Request

_From the FLOCORE platform agent, 2026-06-03. For the **Origin (newbrand) module agent**._

## Framing
- **Tenant:** `Origin / ILCO Farming` — a **new FLOCORE tenant**, sibling of `KCS` (NOT under it). The tenant is the top org unit under the platform.
- **This module:** **Origin** (`newbrand`) = "POS & Retail Patient Sales System" + cultivation/loyalty/gamification. It is **one module** under the Origin/ILCO tenant. `tnt-za` (Track & Trace) is a **separate module with its own agent** — coordinate via the shared tenant, don't absorb it.
- `JIGPOS` (old) is legacy — integrate **newbrand** only.
- **Coexistence on the shared server is mandatory:** loopback-bound datastores on remapped ports, no nginx `default_server`, no cross-tenant data access, no production/legacy SQL writes without explicit sign-off.

## Supply this (short answers fine)
1. **Identity/hierarchy** — tenant slug (`origin`/`ilco`?), this module's name; the org tree under the tenant: head-office/customer → sites (farms/branches) → outlets → devices (POS).
2. **Stack/runtime** — confirm Node/Express; **which DB** (MongoDB? + any Postgres?); Bull/Redis queues; build + start commands; PM2 vs Docker; **ports** each service listens on (for non-clashing loopback remap).
3. **Data** — your **own DB** (FLOCORE does not share its Postgres; tenant isolation). Mongo/Redis/object-storage needs. Any external/legacy DB writes (→ SQL-write gate).
4. **AI usage** — you use `@anthropic-ai/sdk` (Claude) + `@google-cloud/vision`. Confirm: interactive AI = Claude (cloud), keys server-side only. FLOCORE's local Ollama is async-only (CPU-throttled).
5. **FLOCORE services to consume** — identity (OTP→JWT + service token), events, cross-module context, dashboards; base URL co-located = `http://127.0.0.1:8000`.
6. **Events** — what Origin emits/consumes (name + payload), e.g. sale, cultivation, loyalty events — so FLOCORE routes them.
7. **Footprint** — rough RAM/CPU per service (capacity planning — current box has ~18 GiB free, see FLOCORE capacity note).
8. **Domain/DNS** + **security sign-off owner** (the Origin-side equivalent of KCS/Raymond).

## FLOCORE returns
A deploy brief (like `CUPOSWEB-v2/deploy/DEPLOY_TO_NEW_SERVER_HANDOVER.md`): assigned loopback ports, tenant + hierarchy seed, REST/auth contract, nginx rules, coexistence checklist + capacity confirmation. Keep secrets out of the reply (server-side `.env`, `chmod 600`, never committed).
