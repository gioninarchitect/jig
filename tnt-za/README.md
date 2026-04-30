# TnT-ZA — Cannabis Track & Trace

White-label cannabis track & trace platform. First tenant: **ILCO Farms / Origin by ILCO Farming**.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Express + TypeScript + Prisma + PostgreSQL |
| Frontend | React 18 + TypeScript + Vite + Tailwind + Recharts |
| State | Zustand (client) + TanStack Query (server) |
| Auth | PIN-to-email + JWT (24h) |
| PDF | pdfkit (COA generation) |
| Deploy | PM2 + nginx (production), npm run dev (local) |

## Quick Start (Local Dev)

### 1. PostgreSQL

```bash
# Make sure PostgreSQL is running. Create the database:
createdb tntza
```

### 2. Backend

```bash
cd backend
cp ../.env.example .env
# Edit .env with your DATABASE_URL

npm install
npx prisma db push    # Create tables
npx prisma db seed    # Seed demo data (prints login PINs to console)
npm run dev            # Starts on port 6000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # Starts on port 5173, proxies /api to :6000
```

Open http://localhost:5173

## Demo Credentials

| Email | PIN | Role |
|-------|-----|------|
| super@ilco.co.za | 991122 | SUPER_ADMIN |
| admin@ilco.co.za | 882233 | TENANT_ADMIN |
| fm@ilco.co.za | 773344 | FACILITY_MANAGER |
| grower@ilco.co.za | 664455 | CULTIVATOR |
| lab@ilco.co.za | 555666 | LAB_TECH |
| security@ilco.co.za | 446677 | SECURITY_OFFICER |
| viewer@ilco.co.za | 337788 | VIEWER |

## API Overview

| Domain | Routes | Key Endpoints |
|--------|--------|---------------|
| Auth | `/api/auth/*` | request-pin, verify-pin, logout, me |
| Plants | `/api/plants/*` | CRUD, phase transitions, genealogy, stats |
| Containers | `/api/containers/*` | CRUD, load/unload/move/handover, reconciliation |
| Batches | `/api/batches/*` | CRUD, split/merge, chain-of-custody |
| Lab | `/api/lab/*` | Submit results (8 types), flag retest |
| COA | `/api/coa/*` | Generate PDF, download, revoke |
| Compliance | `/api/compliance/*` | Quota, SAPS destruction, permits |
| Transport | `/api/transport/*` | Manifests, depart, arrive |
| Anomalies | `/api/anomalies/*` | List, resolve, check-stale |
| QMS | `/api/qms/*` | SOPs, deviations, equipment calibration |
| World Model | `/api/world-model/*` | state, risk scores, inferences |
| Notifications | `/api/notifications/*` | List, mark read |
| Facilities | `/api/facilities/*` | List, detail |
| Audit | `/api/audit/*` | Paginated log, verify hash chain, CSV export |
| Health | `/api/health` | Status check |

## Architecture

- **Event Bus**: Every mutation emits a domain event. Audit service subscribes to all events.
- **Audit Trail**: Append-only with SHA-256 hash chain. Tamper-evident. Never updated or deleted.
- **Anomaly Engine**: 8 rules detect weight variance, transport delays, zone mismatches, stale inventory, quota pressure, yield deviations, destruction discrepancies.
- **World Model**: Computes per-tenant state from DB aggregation. Risk scores (diversion, compliance, weight integrity). 5 inference rules for proactive alerts.
- **RBAC**: 7 tiers (SUPER_ADMIN → VIEWER). Sidebar, routes, and API endpoints all gated.
- **Weight Variance**: CRITICAL rule — any container weight loss beyond threshold immediately notifies ALL senior roles.

## Production Deploy

```bash
# On server with PostgreSQL + Node.js + PM2 + nginx:
cd backend && npm ci && npx prisma db push && npx prisma db seed && npm run build
cd frontend && npm ci && npm run build
# Configure nginx to serve frontend/dist and proxy /api to :6000
# pm2 start backend/dist/server.js --name tnt-za
```
