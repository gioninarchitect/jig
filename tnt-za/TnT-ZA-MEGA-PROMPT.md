Read the CLAUDE.md file in this directory first. That is your complete context for this project.

Now execute the following 10 phases in order. After each phase, verify the output before moving to the next. If something fails, fix it before proceeding.

---

## PHASE 1: PROJECT SCAFFOLDING

Create the full tnt-za/ project structure:

Backend: Express + TypeScript at backend/src/ with config/, middleware/, controllers/, routes/, services/, utils/, app.ts, server.ts. Prisma init at backend/prisma/schema.prisma (placeholder). backend/package.json, tsconfig.json, Dockerfile.

Frontend: React + TypeScript + Vite at frontend/src/ with components/, layouts/, pages/, hooks/, services/, stores/, types/, App.tsx, main.tsx. frontend/package.json, vite.config.ts, tsconfig.json, tailwind.config.ts, Dockerfile.

Root: docker-compose.yml (postgres + backend + frontend), .env.example, README.md.

Backend deps: express, @prisma/client, prisma, jsonwebtoken, bcryptjs, nodemailer, cors, helmet, express-rate-limit, zod, uuid, pdfkit, multer, qrcode
Frontend deps: react, react-router-dom, @tanstack/react-query, zustand, tailwindcss, recharts, lucide-react, date-fns, axios

All files have placeholder exports only. No business logic yet.

VERIFY: npm install in both backend/ and frontend/ runs clean.

---

## PHASE 2: DATABASE SCHEMA + SEED

Create the full Prisma schema at backend/prisma/schema.prisma with ALL 21 models and enums as defined in CLAUDE.md:

Enums: UserRole (SUPER_ADMIN, TENANT_ADMIN, FACILITY_MANAGER, CULTIVATOR, LAB_TECH, SECURITY_OFFICER, VIEWER), PlantPhase (SEEDLING, VEGETATIVE, FLOWERING, HARVESTED, DRYING, CURING, PROCESSING, PACKAGED, DESTROYED), BatchStatus, COAStatus, ComplianceStatus, AnomalyType (8 types), SeverityLevel, ContainerType (BIN, RACK, BAG, JAR, PACKAGE, CUSTOM), ContainerEventType (LOAD, UNLOAD, MOVE, WEIGH, HANDOVER), ContainerStatus, ZoneType, PermitType.

Models (21): Tenant, User, Facility, Zone, Plant (self-ref motherPlantId for genealogy), Batch, Container, ContainerEvent (with outgoingHandlerId + incomingHandlerId for HANDOVER events), LabResult, COA, DestructionEvent, TransportManifest, AuditLog (append-only), Anomaly (with investigationNotes field), Permit, SOP, Deviation, EquipmentCalibration, Notification, QuotaTracking, Session.

Every model except Tenant has tenantId FK for multi-tenant isolation.

Create backend/prisma/seed.ts with comprehensive demo data:
- 1 tenant: "ILCO Farms" with slug "ilco"
- 1 facility: "ILCO Farm" in South Africa, with 4 zones (GROW, DRY, TRIM, CURE)
- 7 users (one per role) — generate unique 6-digit PINs and PRINT THEM TO CONSOLE in a formatted table during seed
- 50 plants across zones in various phases with realistic weights
- 10 containers (3 BIN, 2 RACK, 3 BAG, 2 JAR) with 25+ container events including at least 1 HANDOVER per zone transition and at least 1 weight variance that would trigger an anomaly
- 4 batches in different statuses (ACTIVE, IN_TESTING, QUARANTINED, RELEASED)
- Lab results for 2 batches (all 8 test types each)
- 1 issued COA, 1 pending
- 2 destruction events with SAPS officer details
- 1 transport manifest
- 25 audit log entries with valid SHA-256 hash chain (each entry's hash = SHA256(prevHash + timestamp + userId + action + entityId))
- 3 anomalies (1 resolved with investigation notes, 2 open including 1 CONTAINER_WEIGHT_VARIANCE)
- 2 SOPs, 1 deviation
- Section 22A + 22C permits for the facility
- Quota tracking record

Add seed script to package.json: "prisma": { "seed": "ts-node prisma/seed.ts" }

VERIFY: npx prisma generate && npx prisma db push && npx prisma db seed — all tables populated, PINs printed to console.

---

## PHASE 3: AUTH + RBAC + AUDIT FOUNDATION

Create:
- backend/src/controllers/auth.controller.ts
- backend/src/routes/auth.routes.ts
- backend/src/services/auth.service.ts
- backend/src/services/email.service.ts
- backend/src/services/audit.service.ts
- backend/src/services/eventBus.ts
- backend/src/middleware/auth.ts
- backend/src/middleware/rbac.ts
- backend/src/middleware/errorHandler.ts
- backend/src/config/env.ts
- backend/src/config/db.ts

Auth endpoints:
- POST /api/auth/request-pin — validate email against User table, generate 6-digit PIN, bcrypt hash, store in Session with 5min expiry, send via Nodemailer (Ethereal for dev, also log PIN to console as fallback)
- POST /api/auth/verify-pin — check email + PIN against Session, return JWT (24h expiry) + user object with role and tenantId
- POST /api/auth/logout — invalidate session
- GET /api/auth/me — return current user from JWT

RBAC middleware:
- requireAuth() — validate JWT, attach user to req
- requireRole(...roles) — user.role must be in list
- requireLevel(minLevel) — SUPER_ADMIN=5, TENANT_ADMIN=4, FM=3, CULT=2, LAB=2, SEC=1, VIEW=0
- requireTenant() — ensure user can only access their own tenant's data (SUPER_ADMIN bypasses)

Security:
- Rate limit: 3 PIN requests per email per 15 minutes
- Account lock after 5 failed PIN attempts in 1 hour
- Helmet, CORS, express-rate-limit on all routes
- JWT secret from env

Audit service (backend/src/services/audit.service.ts):
- logAction(userId, action, entityType, entityId, before, after, ip, device)
- Hash chain: each hash = SHA256(previousHash + timestamp + userId + action + entityId)
- Genesis hash for first entry ("GENESIS")
- NEVER allow UPDATE or DELETE on AuditLog — enforce at service level

Event bus (backend/src/services/eventBus.ts):
- Simple pub/sub: emit(event), on(eventType, handler), off(eventType, handler)
- Every auth event emits to event bus: LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, ACCOUNT_LOCKED
- Audit service subscribes to all events and logs them

Wire auth routes in routes/auth.routes.ts. Create routes/index.ts to mount all route modules. Set up app.ts with middleware and routes.

VERIFY: Using curl or Postman — request PIN for a seeded user, check console for PIN, verify PIN, receive JWT, call GET /api/auth/me with Bearer token, check audit log has entries with valid hash chain.

---

## PHASE 4: PLANT LIFECYCLE + CONTAINER TRACKING

Create:
- backend/src/controllers/plant.controller.ts
- backend/src/services/plant.service.ts
- backend/src/routes/plant.routes.ts
- backend/src/controllers/container.controller.ts
- backend/src/services/container.service.ts
- backend/src/routes/container.routes.ts

Plant endpoints:
- POST /api/plants — Register new plant. Auto-generates ZA-XXXXXX identifier and RFID tag string. Accepts strain, facilityId, zoneId, optional motherPlantId. Checks facility quota before allowing. CULTIVATOR+
- GET /api/plants — List with pagination (page, limit), filtering (phase, strain, facility, zone, status, dateRange), search (by ID, RFID, QR, strain). VIEWER+
- GET /api/plants/:id — Full detail: all fields + genealogy tree (parents and children) + weight history at each phase + handler log. VIEWER+
- PATCH /api/plants/:id/phase — Transition to next phase. MUST validate strictly linear progression (SEEDLING→VEGETATIVE→FLOWERING→HARVESTED→DRYING→CURING→PROCESSING→PACKAGED). Requires weight field at HARVESTED, DRYING, CURING, PACKAGED. Logs handler. CULTIVATOR+
- PATCH /api/plants/:id/flag — Flag as non-compliant with reason string. CULTIVATOR+
- POST /api/plants/:id/scan — Record RFID or QR scan event with zoneId and handlerId. CULTIVATOR+
- GET /api/plants/:id/genealogy — Full family tree (mother plant, all clones/children). VIEWER+
- GET /api/plants/stats — Aggregate counts by phase, facility, strain, compliance status. Used by dashboard. VIEWER+

Container endpoints:
- POST /api/containers — Register new container. Generates containerId (BIN-001, RACK-001 etc auto-increment by type) and QR code string. Accepts containerType, batchId (optional), facilityId. CULTIVATOR+
- GET /api/containers — List with filters (batchId, zoneId, status, containerType). VIEWER+
- GET /api/containers/:id — Detail + full event history timeline. VIEWER+
- POST /api/containers/:id/load — Scan product INTO container. Required: weight, weightUnit, zoneId. Records handlerId from JWT. Sets container status=LOADED. CULTIVATOR+
- POST /api/containers/:id/unload — Scan product OUT of container. Required: weight, weightUnit, zoneId. CRITICAL: compare weight to last LOAD or WEIGH event. If variance exceeds threshold → trigger anomaly (see below). Sets container status=EMPTY. CULTIVATOR+
- POST /api/containers/:id/move — Move container between zones. Required: toZoneId, weight. This is a ZONE TRANSITION so weight is mandatory. Compare to last known weight. CULTIVATOR+
- POST /api/containers/:id/handover — Person-to-person transfer. Required: incomingHandlerId, weight. Records outgoingHandlerId from JWT. Both parties' weights must match. If mismatch → anomaly. CULTIVATOR+
- GET /api/containers/reconciliation/:batchId — Weight reconciliation report: harvest weight vs current total across all containers for this batch. FM+

CRITICAL BUSINESS RULE — WEIGHT VARIANCE ALERTS:
On every UNLOAD, MOVE, or HANDOVER event:
1. Get previous weight from last event on this container
2. Calculate variance percentage
3. If variance > threshold (configurable per container type — default 15% for RACK/drying, 5% for BIN/BAG/JAR):
   a. Create Anomaly record with type CONTAINER_WEIGHT_VARIANCE
   b. Create Notification for ALL of: every user with role TENANT_ADMIN, FACILITY_MANAGER, or SUPER_ADMIN in this tenant
   c. Log to AuditLog
   d. Emit ANOMALY_DETECTED event on event bus
   THIS IS NOT OPTIONAL. ALL SENIOR ROLES MUST BE NOTIFIED SIMULTANEOUSLY.

Also detect:
- CONTAINER_ZONE_MISMATCH: container scanned in zone different from its currentZoneId
- CONTAINER_STALE: container with no events for >24 hours (run as a scheduled check or on-demand)

Every mutation in both plant and container controllers → audit.logAction() with before/after values.
Every mutation emits domain event on event bus.

Mount both route modules in routes/index.ts.

VERIFY: POST a plant, transition through 3 phases with weights, check audit entries. Register a container, LOAD it with 5kg, UNLOAD with 3.5kg (30% loss) → verify anomaly created AND notifications created for all senior-role users.

---

## PHASE 5: BATCH + LAB TESTING + COA

Create:
- backend/src/controllers/batch.controller.ts
- backend/src/services/batch.service.ts
- backend/src/routes/batch.routes.ts
- backend/src/controllers/lab.controller.ts
- backend/src/services/lab.service.ts
- backend/src/routes/lab.routes.ts
- backend/src/controllers/coa.controller.ts
- backend/src/services/coa.service.ts
- backend/src/routes/coa.routes.ts

Batch endpoints:
- POST /api/batches — Create from plant IDs (must be same strain, same facility, phase=HARVESTED). Auto-generates B-YYYY-NNN. Calculates totalWeight from plants. FM+
- GET /api/batches — List with filters (status, coaStatus, facility, strain). VIEWER+
- GET /api/batches/:id — Full detail + plants array + lab results + COA + full chain-of-custody (all container events for containers linked to this batch). VIEWER+
- POST /api/batches/:id/split — Split into sub-batches with weight allocation array. Creates new batch records. Maintains parent batch reference. FM+
- POST /api/batches/:id/merge — Merge multiple batches (same strain, same facility). FM+
- PATCH /api/batches/:id/status — Update status. FM+
- GET /api/batches/:id/chain — Full chain-of-custody: every handler, every container event, every zone change, every weight recording — chronological timeline. VIEWER+

Lab endpoints:
- POST /api/lab/results — Submit test result. Required: batchId, testType (one of: POTENCY, PESTICIDE, HEAVY_METALS, MICROBIAL, MYCOTOXIN, RESIDUAL_SOLVENTS, MOISTURE, FOREIGN_MATTER), resultData (JSON with values and thresholds), passed (boolean). LAB_TECH+
- GET /api/lab/results?batchId=X — All results for a batch. VIEWER+
- POST /api/lab/results/:id/flag — Flag for retest. Auto-sets batch status to QUARANTINED. LAB_TECH+

COA endpoints:
- POST /api/coa/generate/:batchId — Generate COA as PDF ONLY if all 8 test types exist AND all passed. PDF created with pdfkit containing: batch ID, strain, facility name, all 8 test results with values, QR code (using qrcode package) linking to /provenance/:batchId, issued date, lab tech name. Store PDF path. LAB_TECH+
- GET /api/coa/:id — Download the COA PDF file. VIEWER+
- PATCH /api/coa/:id/revoke — Revoke COA with reason string. FM+

Business rules:
- ALL 8 test types must have a result with passed=true before COA can be generated
- If any single test has passed=false, batch status auto-changes to QUARANTINED
- Quarantined batch needs all new passing results + new COA to be released
- Split/merge operations maintain full genealogy — child batches reference parent

Mount all routes.

VERIFY: Create a batch from 5 harvested plants. Submit all 8 lab results (all passing). Generate COA — verify PDF is created and downloadable. Submit one failing result on a different batch — verify batch auto-quarantined.

---

## PHASE 6: COMPLIANCE + DESTRUCTION + ANOMALY ENGINE

Create:
- backend/src/controllers/compliance.controller.ts
- backend/src/services/compliance.service.ts
- backend/src/routes/compliance.routes.ts
- backend/src/controllers/transport.controller.ts
- backend/src/services/transport.service.ts
- backend/src/routes/transport.routes.ts
- backend/src/services/anomaly.service.ts (full implementation)

Quota endpoints:
- GET /api/compliance/quota/:facilityId — Returns: allocated, used, percentage, alertLevel. VIEWER+
- PATCH /api/compliance/quota/:facilityId — Update annualQuota. SUPER_ADMIN only.
- Quota enforcement: plant.service.ts MUST check quota before registering new plants. If used >= allocated → block with 403 and clear message.
- Auto-create notifications at 70%, 85%, 95% thresholds when quota is updated by plant registration.

SAPS Destruction:
- POST /api/compliance/destruction — Required: batchId or plantId, weight, reason, sapsOfficerName, sapsOfficerBadge, sapsStation. Optional: photos (multipart via multer, store in uploads/destruction/). FM+
- GET /api/compliance/destruction — List all events. SECURITY_OFFICER+
- GET /api/compliance/destruction/:id — Detail with photos. SECURITY_OFFICER+
- POST /api/compliance/destruction/:id/confirm — Separate confirmation step. FM+
- After destruction: auto-reconcile inventory — if weight destroyed != recorded weight on batch/plant, create INVENTORY_DISCREPANCY anomaly alerting all senior roles.

Permits:
- GET /api/compliance/permits/:facilityId — List. VIEWER+
- POST /api/compliance/permits — Create. FM+
- PATCH /api/compliance/permits/:id — Update/renew. FM+
- Run expiry check: when any permit has <90 days remaining, create notification. Repeat at 60 and 30 days.

Transport:
- POST /api/transport/manifests — Create manifest. Required: batchIds, originFacilityId, destFacilityId, transporter, vehicleReg, expectedDuration (minutes). FM+
- PATCH /api/transport/manifests/:id/depart — Record departure timestamp. SECURITY_OFFICER+
- PATCH /api/transport/manifests/:id/arrive — Record arrival timestamp. Calculate actualDuration. If actualDuration > expectedDuration * 1.3 → create TRANSPORT_TIME anomaly. SECURITY_OFFICER+
- GET /api/transport/manifests — List. VIEWER+

Anomaly service (full implementation):
Consolidate all 8 anomaly rules into anomaly.service.ts:
1. WEIGHT_LOSS — called from plant phase transition
2. DESTRUCTION_RATE — called after destruction (compare to facility average)
3. TRANSPORT_TIME — called from transport arrival
4. YIELD_DEVIATION — called from batch creation (compare to strain average)
5. INVENTORY_DISCREPANCY — called from destruction reconciliation
6. CONTAINER_WEIGHT_VARIANCE — called from container unload/move/handover (already implemented in Phase 4)
7. CONTAINER_STALE — GET /api/anomaly/check-stale endpoint that checks all containers
8. CONTAINER_ZONE_MISMATCH — called from container events when zone doesn't match

Every anomaly:
- Creates Anomaly record
- Creates Notification for all users at level 3+ (FM, TENANT_ADMIN, SUPER_ADMIN) in the tenant
- Logs to AuditLog with hash chain
- Emits ANOMALY_DETECTED on event bus

Additional endpoints:
- GET /api/anomalies — List all anomalies with filters (type, severity, resolved/open). FM+
- PATCH /api/anomalies/:id/resolve — Resolve with investigationNotes (required). FM+

Mount all routes.

VERIFY: Register a plant when quota is at 100% → blocked. Create destruction → inventory auto-reconciles. Create transport, mark arrived late → TRANSPORT_TIME anomaly created. Run stale check → flags containers with no activity.

---

## PHASE 7: QMS + WORLD MODEL + REMAINING BACKEND

Create:
- backend/src/controllers/qms.controller.ts
- backend/src/services/qms.service.ts
- backend/src/routes/qms.routes.ts
- backend/src/services/worldModel.service.ts
- backend/src/controllers/worldModel.controller.ts
- backend/src/routes/worldModel.routes.ts
- backend/src/controllers/notification.controller.ts
- backend/src/routes/notification.routes.ts
- backend/src/controllers/facility.controller.ts
- backend/src/routes/facility.routes.ts

QMS endpoints:
- POST /api/qms/sops — Create SOP. Required: title, content (text), facilityId. Auto version=1. FM+
- GET /api/qms/sops — List SOPs for user's facility. VIEWER+
- PATCH /api/qms/sops/:id — Create new version (increment version, keep old content in history). FM+
- POST /api/qms/sops/:id/acknowledge — Record that current user has read this SOP version. All authenticated.
- POST /api/qms/deviations — Raise deviation against SOP. Required: sopId, description, severity. CULTIVATOR+
- GET /api/qms/deviations — List with filters (open/closed, severity, sopId). VIEWER+
- PATCH /api/qms/deviations/:id — Update: add rootCause, capa text. FM+
- PATCH /api/qms/deviations/:id/close — Close deviation. FM+
- POST /api/qms/equipment — Register equipment. Required: equipmentName, facilityId. FM+
- PATCH /api/qms/equipment/:id/calibrate — Record calibration. Sets lastCalibrated=now, nextDue=configurable days. FM+
- GET /api/qms/equipment — List sorted by nextDue ascending. VIEWER+
- Auto-notification when calibration due within 7 days.

World Model endpoints:
- GET /api/world-model/state — Returns current TnTWorldState for user's tenant (computed from DB aggregation queries):
  - facility: totalPlants, plantsByPhase, activeBatches, quotaUsedPercent, gmpStatus
  - compliance: openAnomalies, criticalAlerts, pendingDestructions, permitExpiringDays
  - containers: activeContainers, containersWithVariance, staleContainers
  - lab: pendingTests, failedBatches, issuedCOAs, quarantinedBatches
  - risk: diversionRiskScore, complianceScore, weightIntegrityScore (computed 0-100)
- GET /api/world-model/risk — Returns risk scores with explanations
- GET /api/world-model/inferences — Returns active inference alerts based on rules in CLAUDE.md

worldModel.service.ts:
- computeState(tenantId) — runs aggregate queries against all relevant tables
- computeRiskScores(state) — calculates diversion risk (based on anomaly count + variance patterns), compliance score (based on audit completeness + deviation closure rate), weight integrity (based on container variance data)
- runInferences(state) — evaluates the 5 cannabis inference rules from CLAUDE.md and returns active alerts

Notification endpoints:
- GET /api/notifications — Current user's notifications, newest first. Authenticated.
- PATCH /api/notifications/:id/read — Mark single read. Authenticated.
- PATCH /api/notifications/read-all — Mark all read. Authenticated.

Facility endpoints:
- GET /api/facilities — List facilities for user's tenant. VIEWER+
- GET /api/facilities/:id — Facility detail with zones, quota, plant counts. VIEWER+

Audit endpoints (add to existing audit service):
- GET /api/audit — Paginated audit log. Filterable by userId, action, entityType, dateRange. FM+
- GET /api/audit/verify — Verify entire hash chain integrity. Returns { valid, brokenAtIndex, totalEntries }. SUPER_ADMIN+
- GET /api/audit/export — Export as CSV. FM+

Mount ALL remaining routes in routes/index.ts. After this phase, the ENTIRE backend API is complete.

VERIFY: Create SOP, acknowledge it, raise deviation. GET /api/world-model/state returns populated data from seed. GET /api/audit/verify returns { valid: true }. Export audit CSV.

---

## PHASE 8: FRONTEND SHELL + AUTH + RBAC ROUTING

CRITICAL RULE: ZERO hardcoded/mock/fake data anywhere. Every number comes from the API via TanStack Query useQuery(). Loading = skeleton. Empty = empty state. NEVER fake data.

Create auth pages:
- frontend/src/pages/auth/LoginPage.tsx — Two-step: email input, then 4-6 digit PIN input. Dark theme. Brand: primary #0D6B3D. Clean, minimal, professional.
- frontend/src/pages/auth/LogoutPage.tsx — Confirms, clears state, redirects to /login.

Create layouts:
- frontend/src/layouts/DashboardLayout.tsx — Left sidebar (collapsible), top bar (facility name + current time + user avatar + notification bell), main content area scrollable.
- frontend/src/layouts/AuthLayout.tsx — Centered card on dark background.

Create routing in frontend/src/App.tsx using react-router-dom v6:
- /login → AuthLayout + LoginPage
- /dashboard → DashboardLayout + DashboardPage (placeholder for now)
- /plants → DashboardLayout + PlantsPage (placeholder)
- /plants/:id → DashboardLayout + PlantDetailPage (placeholder)
- /containers → DashboardLayout + ContainersPage (placeholder)
- /containers/:id → DashboardLayout + ContainerDetailPage (placeholder)
- /batches → DashboardLayout + BatchesPage (placeholder)
- /facilities → DashboardLayout + FacilitiesPage (placeholder)
- /audit → DashboardLayout + AuditPage (placeholder)
- /lab → DashboardLayout + LabPage (placeholder)
- /compliance → DashboardLayout + CompliancePage (placeholder)
- /security → DashboardLayout + SecurityPage (placeholder)
- /qms → DashboardLayout + QMSPage (placeholder)
- /users → DashboardLayout + UsersPage (placeholder)
- /provenance/:batchId → NO layout, NO auth — public page (placeholder)

All authenticated routes wrapped in auth guard that redirects to /login if no JWT.

Create hooks:
- frontend/src/hooks/useAuth.ts — requestPin(email), verifyPin(email, pin), logout(), user state, isAuthenticated
- frontend/src/hooks/useRBAC.ts — hasRole(role), hasMinLevel(level), canAccess(route)

Create API client:
- frontend/src/services/api.ts — Axios instance, baseURL from env, JWT Bearer interceptor, auto-redirect to /login on 401

Create stores:
- frontend/src/stores/authStore.ts — Zustand: user, token, login, logout
- frontend/src/stores/toastStore.ts — Zustand: toasts array, addToast, removeToast

Sidebar navigation gated by RBAC level:
- Dashboard (0+), Plants (0+), Containers (0+), Batches (0+), Facilities (1+), Audit (0+), Lab (2+), Compliance (2+), QMS (2+), Security (1+), Users (3+)

Responsive:
- Mobile (<768px): hamburger button, sidebar slides over as overlay, touch targets 44px+
- Tablet (768-1024px): sidebar collapsed to icons only
- Desktop (1024px+): full sidebar with labels

Tailwind config: dark mode class strategy. CSS variables: --color-primary: #0D6B3D, --color-dark: #1A1A2E.
Fonts: import JetBrains Mono (data) + Outfit (UI) from Google Fonts.

VERIFY: npm run dev, open browser, /login renders, enter email and PIN for seeded user, JWT stored, redirected to /dashboard, sidebar shows correct items for the user's role level. Navigate to all routes. Test at 375px width in Chrome DevTools. Inspect network tab — no API calls returning fake data.

---

## PHASE 9: DASHBOARD + ALL PAGES + CONSUMER QR PAGE

REPEAT: ZERO mock data. Every stat, chart, table, and number comes from the API.

Dashboard (frontend/src/pages/dashboard/DashboardPage.tsx):
Top row — 4 stat cards fetched from GET /api/world-model/state:
1. Total Active Plants (number) — from state.facility.totalPlants
2. Active Batches (number + COA breakdown) — from state.facility.activeBatches + state.lab
3. Compliance Flags (number, red background if > 0) — from state.compliance.openAnomalies
4. INCB Quota (percentage + donut chart) — from state.facility.quotaUsedPercent

Middle row — 2 panels:
Left: Plant Phase Distribution — horizontal bar chart (recharts BarChart) from GET /api/plants/stats (plantsByPhase)
Right: Recent Activity Feed — last 10 entries from GET /api/audit?limit=10 with severity color badges

Bottom row — Weight Variance Alert Panel:
PROMINENT RED SECTION. Fetches GET /api/anomalies?type=CONTAINER_WEIGHT_VARIANCE&resolved=false. Shows each open variance with container ID, weight in/out, percentage loss, who, when. CANNOT be dismissed from dashboard — must be resolved via /anomalies/:id/resolve endpoint with investigation notes.

Below: Facility overview table from GET /api/facilities.

Risk scores from GET /api/world-model/risk — 3 gauge indicators: Diversion Risk, Compliance Score, Weight Integrity.

All data via useQuery with proper loading skeletons.

Plants page (frontend/src/pages/plants/PlantsPage.tsx):
- Search bar (searches ID, RFID, strain, facility via GET /api/plants?search=X)
- Data table: Plant ID (monospace, green), RFID (truncated), Strain, Phase (visual dots timeline), Zone, Status badge
- Click row → navigate to /plants/:id
- "Register Plant" button visible to CULTIVATOR+ only
- Pagination controls
- Mobile (<768px): collapse table to card view

Plant detail page (frontend/src/pages/plants/PlantDetailPage.tsx):
- Fetches GET /api/plants/:id
- Header: ZA-ID + RFID + strain name
- Grid of key data fields
- Phase timeline (8 dots connected by lines, current highlighted)
- Genealogy section (mother, children/clones)
- Weight history at each phase
- Action buttons gated by role: Update Phase, Flag Issue
- Audit log entries for this plant

Containers page (frontend/src/pages/containers/ContainersPage.tsx):
- List all containers from GET /api/containers
- Table: Container ID, Type, Batch, Current Zone, Status, Last Weight, Last Event
- Containers with open anomalies highlighted red
- Click → /containers/:id

Container detail page (frontend/src/pages/containers/ContainerDetailPage.tsx):
- Full event timeline (LOAD, UNLOAD, MOVE, WEIGH, HANDOVER) from GET /api/containers/:id
- Each event shows: timestamp, type, weight, handler(s), zone, any anomaly flagged
- Weight chart showing weight over time for this container

Batches page: Card grid from GET /api/batches. Each card: batch ID, strain, plant count, status badge, COA status badge. Actions: View Chain, Download COA (if issued).

Facilities page: Cards from GET /api/facilities. Each: name, location, quota donut, zone list, plant count.

Audit page: Filterable table from GET /api/audit with columns: timestamp, user, action, entity, severity badge. Export CSV button.

Lab page: Pending tests (batches without full 8 results), completed tests, protocol checklist showing 8 required types.

Compliance page: Quota gauge, permit expiry timeline, anomaly alerts list, destruction log.

Security page: Open anomalies, destruction records, transport manifests with status.

QMS page: SOP list with version + acknowledgement count, deviation tracker (open/closed), equipment calibration schedule sorted by next-due.

Users page: User cards showing name, role badge, facility, email. "Add User" button visible to FM+ only.

Public QR provenance page (frontend/src/pages/public/ProvenancePage.tsx):
- Route: /provenance/:batchId — NO AUTH REQUIRED, no DashboardLayout
- Fetches GET /api/batches/:id (public endpoint, read-only, limited fields)
- Displays: tenant brand/logo, farm name, strain, batch number, harvest date, COA summary (8 tests with pass/fail), handler chain timeline
- Branded with tenant's colours
- Works on any smartphone browser
- This is what customers see when they scan the QR on a product

VERIFY: Dashboard loads with real data from seeded DB. All stat numbers match seed data. Plant table paginates. Container list shows correct statuses. Weight alert panel shows the seeded anomaly. Mobile layout works at 375px. Public QR page at /provenance/:batchId renders without login. Delete seed data → dashboard shows zeros and empty states, not fake numbers.

---

## PHASE 10: POLISH + ERROR HANDLING + DOCKER DEPLOY

Error handling:
- Frontend: Create ErrorBoundary component wrapping all routes in App.tsx. Shows friendly error message with "Report Issue" link. Never shows stack trace.
- Backend: Global error handler middleware (already created in Phase 3, verify it's wired up). Returns { success: false, error: string, code: number }. Never leaks stack traces in production (check NODE_ENV).
- API client: Axios interceptor catches all errors → shows toast notification via toastStore.

Loading states:
- Create skeleton components for: stat cards, data tables, card grids, detail pages
- Use Tailwind animate-pulse on rectangular placeholder blocks
- Every page that fetches data shows skeleton during isLoading state

Empty states:
- Every list page: centered illustration/icon + "No [items] yet" text + CTA button if user has permission to create
- Dashboard with no data: shows zeros (from API), not "no data" — because the API returns 0 counts
- Audit page empty: "No activity recorded yet"

Toast notifications:
- toastStore already created in Phase 8
- Create ToastContainer component rendered in App.tsx (position: fixed, bottom-right desktop, top on mobile)
- Toast types: success (green), error (red), warning (amber), info (blue)
- Auto-dismiss after 5 seconds
- Fire toasts on: successful plant registration, phase transition, container scan, COA generation, login success, logout, all errors

Seed data verification:
- Review prisma/seed.ts — ensure it's comprehensive per CLAUDE.md specs
- Seed must include at least 1 open CONTAINER_WEIGHT_VARIANCE anomaly so the dashboard alert panel has data
- All 7 users with unique PINs printed to console
- Run: npx prisma migrate reset --force && npx prisma db seed
- Verify every dashboard number matches what seed.ts creates

Docker Compose (production):
- docker-compose.yml with 3 services:
  1. postgres:16-alpine — with named volume for persistence, healthcheck
  2. backend — builds from backend/Dockerfile, depends_on postgres healthy, exposes internal port, env from .env
  3. frontend — builds from frontend/Dockerfile (multi-stage: build React, serve with nginx)
- .env.example with all required variables documented

Nginx config (in frontend/nginx.conf):
- Serve React SPA with try_files $uri $uri/ /index.html (history mode)
- Proxy /api/* to backend service
- Gzip compression on
- Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- Cache static assets (js/css/images) for 1 year with hash filenames

README.md:
- Project: TnT-ZA — White-label Cannabis Track & Trace
- First tenant: ILCO Farms / Origin by ILCO Farming
- Tech stack summary
- Setup: dev mode (npm run dev in both dirs) + Docker mode (docker compose up)
- Demo credentials: table with email and PIN for each role
- API overview: list of domain endpoints
- Architecture: brief description of event bus, world model, anomaly engine, audit trail

VERIFY: 
1. docker compose up -d — wait for all 3 services healthy
2. Open http://localhost — login page renders
3. Login as each of the 7 roles — verify sidebar shows correct nav items
4. Dashboard shows real numbers from seed data
5. Weight alert panel shows the open container variance anomaly
6. Register a plant → toast notification "Plant registered"
7. Navigate to /provenance/:batchId without login — public page works
8. Test at 375px mobile width — all pages responsive
9. Run GET /api/audit/verify — returns { valid: true }
10. Export audit CSV — file downloads
