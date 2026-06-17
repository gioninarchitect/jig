# FLOCORE → ILCO-TnT (tnt-za) — Integration Response

_From the **ILCO-TnT module agent**, 2026-06-06. Reply to `FLOCORE_INTEGRATION_REQUEST.md`. See also `INTEGRATION-SPEC-V2.md` for deeper detail._

**Tenant:** Origin / ILCO Farming. **Module:** **ILCO-TnT** (`tnt-za`) = Cannabis Track & Trace (white-label; first tenant ILCO Farms). Origin (`newbrand`) is a sibling module (separate agent) — coordinate via the shared tenant.

### 1. Identity / hierarchy
- Tenant slug **`origin`** (org "ILCO Farming"). Module: **ILCO-TnT**.
- Org tree: **ILCO Farming** → **facilities/sites** (ILCO farm) → **zones** (GROW/DRY/TRIM/CURE/PROCESS/PACK/STORAGE) → **devices/containers**. Multi-tenant by design (`tenantId` FK on every model).

### 2. Stack / runtime
- Backend: **Express + TypeScript + Prisma** (Node). Frontend: **React 18 + Vite + Tailwind**. Auth: PIN→email + **JWT (24h)**. COA: pdfkit. **PM2 + nginx** (live).
- **DB: PostgreSQL 16** (`postgres:16-alpine`, db `tntza`, `DATABASE_URL=postgresql://tntza:tntza@…/tntza`).
- **Ports (to be pinned by FLOCORE remap):** backend Node `PORT` is inconsistent across configs — `.env`=**3002**, docker-compose=**4000**, code default=6000 → **pin one**; **Postgres 5432** (docker `5432:5432` → **remap loopback**, mandatory); frontend = Vite static via nginx (docker maps `80`).
- Build/start: backend `npm run build` → `node dist/server.js`; frontend `vite build` → static. `docker-compose.yml` present (postgres + backend + frontend).

### 3. Data
- Own **Postgres** (no shared FLOCORE pg; tenant isolation). `uploads/` (destruction/container photos, COAs) → **MinIO/S3**. **No external/legacy SQL writes.**

### 4. Auth → **decision D1**
- Have own PIN→email + JWT. Decide: keep own, or consume FLOCORE identity (OTP→JWT + service token) at `http://127.0.0.1:8000`.

### 5. Events
- **Emit:** `plant.registered`, `plant.phase_changed`, `container.loaded/unloaded/moved/handover`, `batch.created`, `lab.result_submitted`, `coa.issued`, `custody.transfer`, `destruction.recorded`, `anomaly.detected`, **`batch.released`** (→ Origin retail, seeds branch inventory).
- **Consume:** Origin retail context (e.g. `sale.completed` demand signals) via the shared tenant.

### 6. Footprint
- Backend (Node/Express) ~150–250 MB · Postgres ~200–400 MB · frontend static (negligible runtime). Module total < ~1 GB. (Confirm under load.)

### 7. Domain/DNS + security owner
- Domain: **`tntilco.cleva-ai.co.za`** (live). **Security sign-off owner → decision D2.**

### 8. Compliance note (regulated track-&-trace)
- **Append-only `AuditLog`** (SHA-256 hash chain; NO update/delete). Chain-of-custody + weight reconciliation at every zone transition. SAHPRA **Section 22C(1)(b)** context. SAPS-witnessed destruction records.
- **Data residency: South Africa.** FLOCORE must honour: no cross-tenant access to regulated data, **audit immutability**, SA residency. Flag any FLOCORE cross-border storage/processing so we can gate it.

---
## Decisions for the owner (Floris)
- **D1 — Auth:** keep ILCO-TnT's own PIN→email JWT, or consume FLOCORE identity? *Recommend: keep own; add a FLOCORE **service token** for platform calls.*
- **D2 — Security sign-off owner:** name the Origin-side equivalent of KCS/Raymond.

_Secrets kept out of this reply — server-side `.env`, chmod 600, never committed._
