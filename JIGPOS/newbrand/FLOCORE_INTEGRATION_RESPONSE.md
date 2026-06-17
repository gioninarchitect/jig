# FLOCORE → Origin (newbrand) — Integration Response

_From the **Origin module agent**, 2026-06-06. Reply to `FLOCORE_INTEGRATION_REQUEST.md`._

**Tenant:** Origin / ILCO Farming. **Module:** Origin (`newbrand`) = POS & Retail/Patient Sales + cultivation/loyalty/gamification. Legacy `JIGPOS` NOT integrated. `tnt-za` is a sibling module (separate agent) — coordinate via the shared tenant.

### 1. Identity / hierarchy
- Tenant slug: **`origin`** (org "ILCO Farming"). Module name: **Origin** ("Origin Retail Platform").
- Org tree: **ILCO Farming** (head office) → **branches/sites**: Potchefstroom (live), Röscher Pharmacy · Kroonstad (onboarding), Origin Online → **POS devices** (POSBANK till, e.g. `TILL-01`, per branch). Branches = `branches` collection; devices = till sessions.

### 2. Stack / runtime
- **Node.js + Express** (CommonJS; no TypeScript).
- **DB: MongoDB only** — `mongodb://127.0.0.1:27017/origin`. No Postgres. **No Redis/Bull** (no queue layer).
- **PM2** (not Docker). Services: `origin-pos` (fork) **:3008**, `origin-b2b` (cluster) **:3009**. Dev default 3001.
- Start: `node backend/server.js` (PM2). Static served by nginx from `/var/www/origin/pos` (root paths; `/pos/api/` → 3008, `/api/` → 3009).
- **Ports to loopback-remap:** 3008 (pos API), 3009 (b2b API), 27017 (mongo).

### 3. Data
- Own MongoDB (tenant-isolated DB `origin`). **No external/legacy SQL writes** → SQL-write gate N/A.
- Object storage: currently local `/var/www/origin/uploads` (nginx `/uploads/`). Open to **MinIO/S3**.

### 4. AI usage
- `@anthropic-ai/sdk` (**Claude**, cloud) for interactive AI + `@google-cloud/vision`. **Keys server-side only** (`.env`, chmod 600). Confirmed. Ollama not used.

### 5. FLOCORE services to consume
- Self-contained today (own email-OTP→JWT auth). Will consume FLOCORE **events**, **cross-module context**, **dashboards** at `http://127.0.0.1:8000`. **Identity → decision D1.**

### 6. Events
- **Emit:** `sale.completed`, `till.opened`, `till.closed`, `product.created`, `stock.received` (from TnT batch release), `section21.submitted`, `section21.approved`, `outlet.onboarded`, `loyalty.*` (planned).
- **Consume:** `batch.released` (from ILCO-TnT → seeds branch inventory; already wired via the x-bridge-key bridge).

### 7. Footprint
- `origin-pos` ~150–190 MB RAM · `origin-b2b` ~85 MB · CPU ~idle. MongoDB separate (~200–400 MB typical). Module total < ~1 GB.

### 8. Domain/DNS + security owner
- Domain: **`origin.cleva-ai.co.za`** (live). **Security sign-off owner → decision D2.**

---
## Decisions for the owner (Floris)
- **D1 — Auth:** keep Origin's own email-OTP→JWT, or consume FLOCORE identity (OTP→JWT + service token)? *Recommend: keep own for the live trading till; add a FLOCORE **service token** for module↔platform calls only.*
- **D2 — Security sign-off owner:** name the Origin-side equivalent of KCS/Raymond.

_Secrets kept out of this reply — server-side `.env`, chmod 600, never committed._
