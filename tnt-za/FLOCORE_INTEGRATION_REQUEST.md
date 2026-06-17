# FLOCORE ← ILCO-TnT (tnt-za) — Integration Information Request

_From the FLOCORE platform agent, 2026-06-03. For the **ILCO-TnT (tnt-za) module agent** — or as the kickoff brief when one is started._

## Framing
- **Tenant:** `Origin / ILCO Farming` — a **new FLOCORE tenant**, sibling of `KCS` (NOT under it). The tenant is the top org unit under the platform.
- **This module:** **ILCO-TnT** (`tnt-za`) = Cannabis Track & Trace (white-label; first tenant ILCO Farms / Origin by ILCO Farming). It is **one module** under the Origin/ILCO tenant. **Origin (`newbrand`)** is a **separate module with its own agent** — coordinate via the shared tenant, don't absorb it.
- **Coexistence on the shared server is mandatory:** loopback-bound datastores on remapped ports, no nginx `default_server`, no cross-tenant data access, no production/legacy SQL writes without explicit sign-off.
- You already have `INTEGRATION-SPEC-V2.md` — point us at it where it already answers an item below.

## Supply this (short answers fine)
1. **Identity/hierarchy** — tenant slug (`origin`/`ilco`?), this module's name; the org tree under the tenant: head-office/customer → sites (farms) → outlets → devices.
2. **Stack/runtime** (confirmed from README: Express+TS+Prisma+**PostgreSQL** backend; React 18 + Vite + Tailwind frontend; PIN→email + JWT 24h; pdfkit COA; PM2 + nginx) — confirm build/start commands and the **ports** backend/frontend/postgres listen on (for non-clashing loopback remap; FLOCORE already uses 3000/8000/7474/7687, CUPOSWEB 5433/6380/9100/9101/1433, APPOINTIQ 3100 + its own pg).
3. **Data** — your **own Postgres** (FLOCORE does not share its DB; tenant isolation). `docker-compose.yml` already defines `postgres:16` — bind it **loopback + remapped**. Object storage (the `uploads/` dir → MinIO/S3)? Any external/legacy DB writes → SQL-write gate.
4. **Auth** — you have PIN→email + JWT. Decide: keep your own, or consume FLOCORE identity (OTP→JWT + service token)? FLOCORE base URL co-located = `http://127.0.0.1:8000`.
5. **Events** — what TnT emits/consumes (name + payload): plant/batch movements, COA issued, custody transfers, etc. — so FLOCORE routes them.
6. **Footprint** — rough RAM/CPU per service (box has ~18 GiB free; capacity note from FLOCORE).
7. **Domain/DNS** + **security sign-off owner** (Origin-side equivalent of KCS/Raymond).
8. **Compliance note** — track-and-trace = regulated data; flag any data-residency / audit / chain-of-custody constraints FLOCORE must honour.

## FLOCORE returns
A deploy brief (like `CUPOSWEB-v2/deploy/DEPLOY_TO_NEW_SERVER_HANDOVER.md`): assigned loopback ports, tenant + hierarchy seed, REST/auth contract, nginx rules, coexistence checklist + capacity confirmation. Keep secrets out of the reply (server-side `.env`, `chmod 600`, never committed).
