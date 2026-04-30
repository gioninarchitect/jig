# TnT-ZA — Cannabis Track & Trace

> **This file is the persistent context for Claude Code. Read it before every prompt.**

## Project Identity

- **Name**: TnT-ZA
- **Repo**: `tnt-za/`
- **What**: White-label Cannabis Track & Trace platform
- **First tenant**: ILCO Farms / Origin by ILCO Farming
- **Facility**: Single cultivation farm
- **Retail**: Origin store (Potchefstroom) + Origin online store
- **Regulatory**: SAHPRA Section 22C(1)(b) — the guideline, not the client
- **Standalone**: Own codebase, own PostgreSQL DB, own repo. NOT inside Origin platform.
- **Integration**: Connects to Origin POS/stock via REST API later (v1.1)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (dark mode first) |
| State | Zustand (client) + TanStack Query (server) |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma (PostgreSQL) |
| Auth | Custom PIN-to-email + JWT |
| Email | Nodemailer (Ethereal in dev) |
| PDF | pdfkit (COA generation) |
| Validation | Zod |
| Upload | Multer (destruction/container photos) |
| Database | PostgreSQL 16 |
| Deploy | Docker Compose + Nginx |

## ABSOLUTE BUILD RULES

### 1. ZERO FAKE DATA
**No mock, fake, hardcoded, or placeholder data in the frontend. Ever.**
- Every number, table, chart, stat, and count comes from the database via API
- Use `useQuery()` from TanStack Query for ALL data fetching
- Loading state = skeleton component
- Empty state = "No data yet" with CTA
- If you're tempted to write `const stats = { plants: 4200, ... }` — DON'T. Fetch it.
- Seed script (`prisma/seed.ts`) is the ONLY source of test data

### 2. CONTAINER TRACKING (Farm Manager Requirement)
- **v1.0 containers**: harvest bins, drying racks, trimmed bags, curing jars
- **LATER (v2.0)**: processing containers, packaging containers
- Weight recorded at EVERY zone transition
- Different person per zone with handover at phase transitions
- **CRITICAL**: Any weight variance → alert ALL senior roles (TENANT_ADMIN + FACILITY_MANAGER + SUPER_ADMIN) immediately via in-app notification + email

### 3. WHITE-LABEL / MULTI-TENANT
- Tenant model with tenantId FK on every other model
- Per-tenant user pools, branding, configuration
- First tenant = ILCO Farms

## RBAC (7 Tiers)

| Role | Level | Weight Alerts? |
|------|-------|---------------|
| SUPER_ADMIN | 5 | YES — all |
| TENANT_ADMIN | 4 | YES — all |
| FACILITY_MANAGER | 3 | YES — all |
| CULTIVATOR | 2 | No (creates events) |
| LAB_TECH | 2 | No |
| SECURITY_OFFICER | 1 | No |
| VIEWER | 0 | No |

## Database Schema (21 Models)

### Core
- **Tenant**: name, slug, branding (JSON), active
- **User**: email, name, role (enum), pinHash, tenantId FK, facilityId FK
- **Facility**: name, location, licenseNumber, status, gmpStatus, quotaAllocated, quotaUsed, tenantId FK
- **Zone**: name, zoneType (GROW/DRY/TRIM/CURE/PROCESS/PACK/STORAGE), capacity, facilityId FK

### Plant Lifecycle
- **Plant**: identifier (ZA-XXXXXX auto-gen), rfidTag, qrCode, strain, phase (enum 8 phases), facilityId, zoneId, motherPlantId (self-ref genealogy), weightsJson, status, handlerId FK, tenantId FK
- **Batch**: batchNumber (B-YYYY-NNN auto-gen), strain, status (enum), coaStatus (enum), totalWeight, facilityId, tenantId FK

### Container Tracking
- **Container**: containerId (BIN-001, RACK-017, BAG-033, JAR-112), qrCode, containerType (enum: BIN, RACK, BAG, JAR, PACKAGE, CUSTOM), batchId FK, currentZoneId FK, status (EMPTY/LOADED/IN_TRANSIT/RETIRED), facilityId, tenantId FK
- **ContainerEvent**: containerId FK, eventType (enum: LOAD, UNLOAD, MOVE, WEIGH, HANDOVER), weight (decimal nullable), weightUnit (g/kg), fromZoneId FK, toZoneId FK, outgoingHandlerId FK, incomingHandlerId FK, timestamp, notes, photoUrl

### Lab & Compliance
- **LabResult**: batchId FK, testType (string), resultData (JSON), passed (boolean), testedById FK, testedAt
- **COA**: batchId FK, issuedById FK, pdfUrl, qrCode, valid, issuedAt
- **DestructionEvent**: batchId/plantId FK, weight, reason, sapsOfficerName, sapsOfficerBadge, sapsStation, witnessedAt, photosUrl, facilityManagerId FK
- **TransportManifest**: batchIds, originFacilityId, destFacilityId, transporter, vehicleReg, expectedDuration, actualDuration, gpsRouteJson
- **Permit**: facilityId FK, type (SECTION_22A/SECTION_22C), permitNumber, issuedDate, expiryDate, conditions
- **QuotaTracking**: facilityId FK, year, annualQuota, usedQuota

### QMS
- **SOP**: title, version, content, approvedById FK, facilityId, active, tenantId FK
- **Deviation**: sopId FK, description, severity, rootCause, capa, raisedById FK, closedAt
- **EquipmentCalibration**: equipmentName, facilityId, lastCalibrated, nextDue, calibratedById FK

### System
- **AuditLog**: timestamp, userId FK, action, entityType, entityId, beforeJson, afterJson, ipAddress, deviceId, hashChain (SHA-256). **APPEND-ONLY. NO UPDATE. NO DELETE. EVER.**
- **Anomaly**: type (enum 8 rules), severity, description, entityType, entityId, detectedAt, resolvedAt, resolvedById, falsePositive, investigationNotes
- **Notification**: userId FK, title, message, read, link, createdAt
- **Session**: userId FK, token, ipAddress, deviceInfo, expiresAt

## Anomaly Rules (8)

| # | Rule | Trigger | Alert To |
|---|------|---------|----------|
| 1 | WEIGHT_LOSS | Phase transition weight > 15% loss | FM + TENANT_ADMIN + SUPER_ADMIN |
| 2 | DESTRUCTION_RATE | Facility rate > 2σ above average | FM + TENANT_ADMIN + SUPER_ADMIN |
| 3 | TRANSPORT_TIME | Actual > 130% expected | FM + SECURITY |
| 4 | YIELD_DEVIATION | Batch vs strain avg > 20% | FM |
| 5 | INVENTORY_DISCREPANCY | Physical vs digital > 2% | FM + TENANT_ADMIN + SUPER_ADMIN |
| 6 | CONTAINER_WEIGHT_VARIANCE | Container weight out > expected loss | FM + TENANT_ADMIN + SUPER_ADMIN |
| 7 | CONTAINER_STALE | No events > 24h (configurable) | FM |
| 8 | CONTAINER_ZONE_MISMATCH | Scanned in wrong zone | FM + TENANT_ADMIN |

## World Model Architecture

TnT-ZA uses an event-sourced world model for intelligent state management:

```
┌─────────────────────────────────────────────────────────────┐
│                   TnT-ZA WORLD MODEL                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────┐    ┌───────────────────┐  │
│  │ Domain Events │───▶│ EventBus │───▶│ State Reducer     │  │
│  │ (scan, weigh, │    └──────────┘    │ (update world     │  │
│  │  move, phase) │         │          │  state per tenant) │  │
│  └──────────────┘         ▼          └───────────────────┘  │
│                   ┌──────────────┐           │               │
│                   │  Listeners   │           ▼               │
│                   │ (anomaly,    │   ┌──────────────┐       │
│                   │  notify,     │   │ World State  │       │
│                   │  audit)      │   │ (per tenant) │       │
│                   └──────────────┘   └──────────────┘       │
│                                              │               │
│                    ┌─────────────────────────┼───────────┐   │
│                    ▼                         ▼           ▼   │
│           ┌──────────────┐      ┌───────────────┐ ┌──────┐ │
│           │  Inference   │      │  Computed Vals │ │Hooks │ │
│           │  Engine      │      │  (predictions, │ │      │ │
│           │  (anomaly    │      │   trends,      │ │      │ │
│           │   detection) │      │   risk scores) │ │      │ │
│           └──────────────┘      └───────────────┘ └──────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Domain Events (Cannabis-Specific)

```typescript
type TnTEvent =
  // Plant lifecycle
  | { type: 'PLANT_REGISTERED'; plantId: string; strain: string; facilityId: string }
  | { type: 'PLANT_PHASE_CHANGED'; plantId: string; from: PlantPhase; to: PlantPhase; weight?: number }
  | { type: 'PLANT_FLAGGED'; plantId: string; reason: string }
  | { type: 'PLANT_DESTROYED'; plantId: string; weight: number; sapsWitness: string }
  // Container tracking
  | { type: 'CONTAINER_LOADED'; containerId: string; weight: number; handlerId: string; zoneId: string }
  | { type: 'CONTAINER_UNLOADED'; containerId: string; weight: number; handlerId: string; zoneId: string }
  | { type: 'CONTAINER_MOVED'; containerId: string; fromZone: string; toZone: string; weight: number }
  | { type: 'CONTAINER_HANDOVER'; containerId: string; fromHandler: string; toHandler: string; weight: number }
  // Batch & lab
  | { type: 'BATCH_CREATED'; batchId: string; plantIds: string[]; totalWeight: number }
  | { type: 'LAB_RESULT_SUBMITTED'; batchId: string; testType: string; passed: boolean }
  | { type: 'COA_ISSUED'; batchId: string; coaId: string }
  | { type: 'BATCH_QUARANTINED'; batchId: string; reason: string }
  // Compliance
  | { type: 'QUOTA_UPDATED'; facilityId: string; used: number; allocated: number }
  | { type: 'DESTRUCTION_RECORDED'; weight: number; sapsOfficer: string }
  | { type: 'PERMIT_EXPIRING'; permitId: string; daysRemaining: number }
  // Transport
  | { type: 'TRANSPORT_DEPARTED'; manifestId: string; origin: string; destination: string }
  | { type: 'TRANSPORT_ARRIVED'; manifestId: string; actualDuration: number; expectedDuration: number }
  // Anomaly
  | { type: 'ANOMALY_DETECTED'; anomalyType: AnomalyType; severity: string; entityId: string }
  | { type: 'ANOMALY_RESOLVED'; anomalyId: string; investigationNotes: string }
```

### World State Shape (Per Tenant)

```typescript
interface TnTWorldState {
  facility: {
    totalPlants: number;
    plantsByPhase: Record<PlantPhase, number>;
    activeBatches: number;
    quotaUsedPercent: number;
    gmpStatus: string;
  };
  compliance: {
    openAnomalies: number;
    criticalAlerts: number;
    pendingDestructions: number;
    permitExpiringDays: number | null;
    lastInspectionDate: string | null;
  };
  containers: {
    activeContainers: number;
    containersWithVariance: number;
    staleContainers: number;
    avgWeightLossPercent: Record<string, number>; // per container type
  };
  lab: {
    pendingTests: number;
    failedBatches: number;
    issuedCOAs: number;
    quarantinedBatches: number;
  };
  risk: {
    diversionRiskScore: number; // 0-100 computed from anomaly patterns
    complianceScore: number;    // 0-100 computed from audit/deviation data
    weightIntegrityScore: number; // 0-100 computed from container variance data
  };
}
```

### Inference Rules (Cannabis Domain)

```typescript
const CANNABIS_INFERENCE_RULES = [
  {
    id: 'diversion_pattern',
    name: 'Potential Diversion Pattern',
    condition: (state) => state.containers.containersWithVariance > 3 && state.compliance.openAnomalies > 2,
    severity: 'critical',
    action: 'Alert all senior roles + flag for investigation',
  },
  {
    id: 'declining_weight_integrity',
    name: 'Declining Weight Integrity',
    condition: (state) => state.risk.weightIntegrityScore < 70,
    severity: 'warning',
    action: 'Recommend increased spot-checks',
  },
  {
    id: 'quota_pressure',
    name: 'Approaching Quota Limit',
    condition: (state) => state.facility.quotaUsedPercent > 85,
    severity: 'warning',
    action: 'Alert tenant admin, recommend harvest planning review',
  },
  {
    id: 'lab_bottleneck',
    name: 'Lab Testing Bottleneck',
    condition: (state) => state.lab.pendingTests > 5 && state.lab.quarantinedBatches > 0,
    severity: 'info',
    action: 'Recommend prioritizing quarantined batch retests',
  },
  {
    id: 'stale_inventory',
    name: 'Stale Container Alert',
    condition: (state) => state.containers.staleContainers > 0,
    severity: 'warning',
    action: 'Containers not moving — check curing schedule or flag for review',
  },
];
```

### Implementation in TnT-ZA

The world model is implemented as:
1. **Backend**: `src/services/worldModel.service.ts` — event reducer, state computation, inference engine
2. **Backend**: `src/services/eventBus.ts` — pub/sub for domain events (every controller emits events)
3. **Frontend**: `src/stores/worldModelStore.ts` — Zustand store consuming world state via API
4. **Frontend**: `src/hooks/useWorldModel.ts` — computed values, risk scores, trend data for dashboard
5. **API**: `GET /api/world-model/state` — returns current tenant world state
6. **API**: `GET /api/world-model/risk` — returns computed risk scores
7. **API**: `GET /api/world-model/inferences` — returns active inference alerts

The world model powers:
- Dashboard risk gauges and trend indicators
- Anomaly detection (beyond simple threshold rules)
- Proactive compliance recommendations
- Weight integrity scoring across the facility
- Predictive alerts (e.g., "quota will be exceeded in 3 weeks at current rate")

## Naming Conventions

| Entity | Format | Example |
|--------|--------|---------|
| Plant ID | ZA-XXXXXX | ZA-000142 |
| RFID tag | RFID-[12 alphanum] | RFID-A3F8B2C9D1E4 |
| Batch | B-YYYY-NNN | B-2026-012 |
| Container | TYPE-NNN | BIN-001, RACK-017, BAG-033, JAR-112 |
| Lot | LOT-YYYY-NNN | LOT-2026-088 |
| API routes | /api/[domain]/[resource] | /api/plants, /api/containers |
| Controllers | [domain].controller.ts | plant.controller.ts |
| Services | [domain].service.ts | container.service.ts |
| Routes | [domain].routes.ts | compliance.routes.ts |
| Pages | [Domain]Page.tsx | PlantsPage.tsx |

## Directory Structure

```
tnt-za/
├── backend/
│   ├── src/
│   │   ├── config/          # db.ts, env.ts, constants.ts
│   │   ├── middleware/       # auth.ts, rbac.ts, validate.ts, errorHandler.ts
│   │   ├── controllers/     # per domain
│   │   ├── routes/          # per domain + index.ts
│   │   ├── services/        # per domain + worldModel.service.ts + eventBus.ts + anomaly.service.ts + audit.service.ts
│   │   ├── utils/           # email.ts, hash.ts, pdf.ts, qr.ts
│   │   └── app.ts + server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # shared UI
│   │   ├── layouts/         # AuthLayout, DashboardLayout
│   │   ├── pages/           # folder per domain
│   │   ├── hooks/           # useAuth, useRBAC, useWorldModel, useOffline
│   │   ├── services/        # api client
│   │   ├── stores/          # zustand (auth, worldModel, notifications, toast)
│   │   ├── types/           # shared TS types
│   │   └── App.tsx + main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── CLAUDE.md               # THIS FILE
└── README.md
```

## Brand

- Primary: `#0D6B3D` (ILCO green)
- Secondary: `#1A1A2E` (dark navy)
- Accent: `#16213E` (steel blue)
- Danger: `#DC3545` / Warning: `#E8A317` / Success: `#198754`
- Dark mode primary, light mode option
- Data font: JetBrains Mono
- UI font: Outfit
- Mobile-first: 320px → 768px → 1024px
- Touch targets: 44px minimum
