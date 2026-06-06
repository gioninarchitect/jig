# Operations Driver — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the loop — a `driver.service` rules engine reads the signals TnT-ZA already computes (KPIs, anomalies, world-model inferences, overdue SOPs/tasks), upserts idempotent per-role **DriverItems**, surfaced as a read-only "what to do now" feed. No auto-ticketing/allocation yet (Phase 2+). Prove the brain works before it acts.

**Architecture:** Thin glue + one rules engine over existing services. `driver.service.evaluate(tenantId)` fans out to rule functions that each return `DriverInput[]`; the service upserts them as `DriverItem` rows keyed by a unique `dedupeKey` (re-running never duplicates). A scheduler tick + eventBus listeners trigger evaluation. A read-only API + a dashboard card render the queue. Each created item also `eventBus.emit('driver.item.created', …)` so FLOCORE can route it later (full FLOCORE wiring = separate integration doc).

**Tech Stack:** Express + TypeScript, Prisma + PostgreSQL, `tsx` (run scripts/verification), React 18 + Vite + TanStack Query. Reuses: `kpi.service`, `anomaly.service`, `worldModel.service`, `sop-training.service`, `tasks.service`, `eventBus`, `config/db.ts` prisma, `middleware/auth`.

**Conventions:** every model has `tenantId`; services are `*.service.ts`, routes `*.routes.ts` + controllers `*.controller.ts`; zero fake data. No test framework exists in this repo — verification is a runnable `tsx` script that throws on failed assertion (RED) and exits 0 (GREEN), matching how `prisma/seed.ts` is run.

**Roles in scope:** FACILITY_MANAGER, NURSERY_MANAGER, NURSERY_STAFF, HEAD_OF_CULTIVATION (Cultivation Mgr/Head Grower), PROCESSING_MANAGER, QA_INSPECTOR, RESPONSIBLE_PHARMACIST. (GroOS/HoC-owner excluded.)

---

## File map

- Create `backend/prisma/schema.prisma` (append `DriverItem` model) — the queue row.
- Create `backend/src/services/driver.service.ts` — the rules engine (`evaluate`, rule fns, `getQueueForRole`).
- Create `backend/src/services/driver.scheduler.ts` — eventBus listeners + interval tick.
- Modify `backend/src/server.ts` — start the scheduler after `app.listen`.
- Create `backend/src/controllers/driver.controller.ts` — read-only handlers.
- Create `backend/src/routes/driver.routes.ts` — `GET /queue`, `GET /queue/me`.
- Modify `backend/src/routes/index.ts` — mount `/driver`.
- Create `backend/scripts/verify-driver.ts` — the verification harness.
- Create `frontend/src/components/ActionQueueCard.tsx` — the read-only card.
- Modify `frontend/src/pages/dashboard/DashboardPage.tsx` — render the card.

---

### Task 1: `DriverItem` model + migration

**Files:**
- Modify: `backend/prisma/schema.prisma` (append model)

- [ ] **Step 1: Add the model.** Append to `backend/prisma/schema.prisma`:

```prisma
model DriverItem {
  id          String   @id @default(uuid())
  tenantId    String
  role        String                 // target role (e.g. NURSERY_MANAGER)
  severity    String   @default("MEDIUM") // LOW | MEDIUM | HIGH | CRITICAL
  sourceType  String                 // KPI_BREACH | ANOMALY | INFERENCE | SOP_OVERDUE | TASK_OVERDUE
  title       String
  detail      String?
  evidence    Json?                  // { metric, target, actual } | { anomalyId } | { sopId } | { taskId } | { inferenceId }
  linkUrl     String?                // dashboard deep-link (e.g. /tickets, /mothers)
  dedupeKey   String                 // stable key so re-evaluation upserts, never duplicates
  status      String   @default("OPEN") // OPEN | RESOLVED | DISMISSED
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([tenantId, dedupeKey])
  @@index([tenantId, role, status])
}
```

- [ ] **Step 2: Generate the migration + client.**

Run: `cd backend && npx prisma migrate dev --name driver_item`
Expected: "Your database is now in sync with your schema" and the Prisma Client regenerates. A new folder `prisma/migrations/<ts>_driver_item/` appears.

- [ ] **Step 3: Commit.**

```bash
cd /Users/florisolivier/origin/tnt-za
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(driver): add DriverItem model for the operations driver queue"
```

---

### Task 2: `driver.service` rules engine

**Files:**
- Create: `backend/src/services/driver.service.ts`
- Create: `backend/scripts/verify-driver.ts`

- [ ] **Step 1: Write the rules engine.** Create `backend/src/services/driver.service.ts`:

```ts
import { prisma } from '../config/db';
import { eventBus } from './eventBus';
import * as kpi from './kpi.service';
import * as anomaly from './anomaly.service';
import * as worldModel from './worldModel.service';
import { getSOPTrainingOverview } from './sop-training.service';
import { listTasks } from './tasks.service';

export const DRIVER_ROLES = [
  'FACILITY_MANAGER', 'NURSERY_MANAGER', 'NURSERY_STAFF',
  'HEAD_OF_CULTIVATION', 'PROCESSING_MANAGER', 'QA_INSPECTOR', 'RESPONSIBLE_PHARMACIST',
] as const;

// Which way is "good" for each KPI metric — needed to decide a breach.
// Anything not listed is treated as higher-is-better.
const LOWER_IS_BETTER = new Set([
  'plant_mortality_pct', 'mortality_rate', 'open_anomalies', 'ticket_resolution_days',
  'quarantined_batches', 'open_deviations', 'tickets_open', 'calibrations_due',
  'mothers_overdue', 'in_processing', 'pending_approvals',
]);

export type DriverInput = {
  role: string; severity: string; sourceType: string; title: string;
  detail?: string; evidence?: any; linkUrl?: string; dedupeKey: string;
};

const sev = (n: number) => (n >= 3 ? 'CRITICAL' : n === 2 ? 'HIGH' : n === 1 ? 'MEDIUM' : 'LOW');

// --- rule: KPI breach (actual worse than target) ---
async function kpiBreaches(tenantId: string): Promise<DriverInput[]> {
  const out: DriverInput[] = [];
  for (const role of DRIVER_ROLES) {
    const kpis = await kpi.getKpisForRole('system', tenantId, role); // userId unused for tenant-level KPIs
    for (const k of kpis) {
      if (k.target == null || k.actual == null) continue;
      const breached = LOWER_IS_BETTER.has(k.metric) ? k.actual > k.target : k.actual < k.target;
      if (!breached) continue;
      out.push({
        role, sourceType: 'KPI_BREACH', severity: 'HIGH',
        title: `${k.name} off target`,
        detail: `${k.name}: ${k.actual}${k.unit ?? ''} vs target ${k.target}${k.unit ?? ''}`,
        evidence: { metric: k.metric, target: k.target, actual: k.actual },
        linkUrl: '/dashboard',
        dedupeKey: `kpi:${role}:${k.metric}`,
      });
    }
  }
  return out;
}

// --- rule: unresolved anomalies → the senior roles ---
async function anomalyDrivers(tenantId: string): Promise<DriverInput[]> {
  const items = await anomaly.listAnomalies({ tenantId, resolved: false });
  return items.map((a: any) => ({
    role: 'FACILITY_MANAGER', sourceType: 'ANOMALY',
    severity: (a.severity || 'HIGH').toUpperCase(),
    title: `Anomaly: ${a.type}`,
    detail: a.description || '',
    evidence: { anomalyId: a.id },
    linkUrl: '/compliance',
    dedupeKey: `anomaly:${a.id}`,
  }));
}

// --- rule: world-model inferences ---
async function inferenceDrivers(tenantId: string): Promise<DriverInput[]> {
  const infs = await worldModel.getInferences(tenantId);
  return (infs || []).map((i: any) => ({
    role: 'FACILITY_MANAGER', sourceType: 'INFERENCE',
    severity: (i.severity || 'warning') === 'critical' ? 'CRITICAL' : 'HIGH',
    title: i.name || i.id,
    detail: i.action || '',
    evidence: { inferenceId: i.id },
    linkUrl: '/compliance',
    dedupeKey: `inference:${i.id}`,
  }));
}

// --- rule: SOP training overdue / incomplete ---
async function sopDrivers(tenantId: string): Promise<DriverInput[]> {
  const ov = await getSOPTrainingOverview(tenantId);
  const out: DriverInput[] = [];
  for (const s of (ov.sopStatus || [])) {
    if (s.compliance >= 100) continue;
    out.push({
      role: 'QA_INSPECTOR', sourceType: 'SOP_OVERDUE', severity: sev(s.compliance < 50 ? 2 : 1),
      title: `SOP training incomplete: ${s.title}`,
      detail: `${s.compliance}% trained (v${s.version})`,
      evidence: { sopId: s.sopId },
      linkUrl: '/sop-library',
      dedupeKey: `sop:${s.sopId}:v${s.version}`,
    });
  }
  return out;
}

// --- rule: overdue tasks (PENDING/IN_PROGRESS past dueDate) ---
async function taskDrivers(tenantId: string): Promise<DriverInput[]> {
  const tasks = await listTasks({ tenantId });
  const now = Date.now();
  return tasks
    .filter((t: any) => t.dueDate && new Date(t.dueDate).getTime() < now && t.status !== 'COMPLETED')
    .map((t: any) => ({
      role: t.assignedRole || 'FACILITY_MANAGER', sourceType: 'TASK_OVERDUE',
      severity: (t.priority || 'MEDIUM').toUpperCase(),
      title: `Overdue: ${t.title}`,
      detail: `Due ${new Date(t.dueDate).toISOString().slice(0, 10)}`,
      evidence: { taskId: t.id },
      linkUrl: '/tasks',
      dedupeKey: `task:${t.id}`,
    }));
}

/** Evaluate one tenant: gather drivers from all rules, upsert idempotently, emit events. */
export async function evaluate(tenantId: string): Promise<{ upserted: number }> {
  const inputs = (await Promise.all([
    kpiBreaches(tenantId), anomalyDrivers(tenantId), inferenceDrivers(tenantId),
    sopDrivers(tenantId), taskDrivers(tenantId),
  ])).flat();

  let upserted = 0;
  for (const d of inputs) {
    const res = await prisma.driverItem.upsert({
      where: { tenantId_dedupeKey: { tenantId, dedupeKey: d.dedupeKey } },
      create: { tenantId, status: 'OPEN', ...d },
      update: { severity: d.severity, title: d.title, detail: d.detail, evidence: d.evidence },
    });
    upserted++;
    if (res.createdAt.getTime() === res.updatedAt.getTime()) {
      eventBus.emit('driver.item.created', { tenantId, role: d.role, sourceType: d.sourceType, dedupeKey: d.dedupeKey });
    }
  }
  return { upserted };
}

export async function getQueueForRole(tenantId: string, role: string) {
  return prisma.driverItem.findMany({
    where: { tenantId, role, status: 'OPEN' },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
  });
}
```

- [ ] **Step 2: Write the verification harness (the failing test).** Create `backend/scripts/verify-driver.ts`:

```ts
import { prisma } from '../src/config/db';
import { evaluate, getQueueForRole } from '../src/services/driver.service';

function assert(cond: boolean, msg: string) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } }

async function main() {
  const tenant = await prisma.tenant.findFirst();
  assert(!!tenant, 'a seeded tenant must exist (run npm run seed)');
  const tenantId = tenant!.id;

  const first = await evaluate(tenantId);
  console.log('evaluate #1 upserted:', first.upserted);

  // idempotency: a second run must NOT grow the row count
  const before = await prisma.driverItem.count({ where: { tenantId } });
  await evaluate(tenantId);
  const after = await prisma.driverItem.count({ where: { tenantId } });
  assert(after === before, `idempotent re-run changed count ${before} -> ${after}`);

  // queue shape
  const fmQueue = await getQueueForRole(tenantId, 'FACILITY_MANAGER');
  assert(Array.isArray(fmQueue), 'getQueueForRole must return an array');
  console.log('FM queue size:', fmQueue.length, fmQueue.slice(0, 3).map((d) => d.title));
  console.log('PASS');
  process.exit(0);
}
main();
```

- [ ] **Step 3: Run it to verify it fails first.** (Before Step 1 exists it won't compile; after Step 1, run against the seeded dev DB.)

Run: `cd backend && npm run seed && npx tsx scripts/verify-driver.ts`
Expected on a correct build: prints `evaluate #1 upserted: N`, then `PASS`. If the idempotency assert trips, it prints `FAIL: idempotent re-run changed count …` and exits 1.

- [ ] **Step 4: Fix until GREEN.** Re-run until it prints `PASS`. Common fix: ensure `dedupeKey` is stable (no timestamps/random in it).

- [ ] **Step 5: Commit.**

```bash
git add backend/src/services/driver.service.ts backend/scripts/verify-driver.ts
git commit -m "feat(driver): rules engine evaluating KPIs/anomalies/inferences/SOPs/tasks into idempotent DriverItems"
```

---

### Task 3: Heartbeat — eventBus listeners + scheduler tick

**Files:**
- Create: `backend/src/services/driver.scheduler.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Write the scheduler.** Create `backend/src/services/driver.scheduler.ts`:

```ts
import { prisma } from '../config/db';
import { eventBus } from './eventBus';
import { evaluate } from './driver.service';

const TICK_MS = 15 * 60 * 1000; // 15 min
let running = false;

async function evaluateAllTenants(reason: string) {
  if (running) return;          // never overlap
  running = true;
  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const t of tenants) {
      try { const r = await evaluate(t.id); console.log(`[driver] ${reason} tenant=${t.id} upserted=${r.upserted}`); }
      catch (e: any) { console.error(`[driver] evaluate failed tenant=${t.id}:`, e.message); }
    }
  } finally { running = false; }
}

export function startDriver() {
  // event-triggered (debounced): re-evaluate shortly after key domain events
  let debounce: NodeJS.Timeout | null = null;
  const trigger = () => { if (debounce) clearTimeout(debounce); debounce = setTimeout(() => evaluateAllTenants('event'), 5000); };
  ['ANOMALY_RESOLVED', 'TASK_CREATED', 'TASK_COMPLETED', 'SOP_GOVERNANCE_SYNCED', 'BATCH_QUARANTINED']
    .forEach((evt) => eventBus.on(evt, trigger));
  // scheduled heartbeat
  setInterval(() => evaluateAllTenants('tick'), TICK_MS);
  // run once on boot
  evaluateAllTenants('boot');
  console.log('[driver] started — 15m tick + event listeners');
}
```

- [ ] **Step 2: Start it on boot.** Modify `backend/src/server.ts`:

```ts
import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { startDriver } from './services/driver.scheduler';

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`TnT-ZA backend running on http://0.0.0.0:${env.PORT}`);
  startDriver();
});
```

- [ ] **Step 3: Run the dev server, confirm the heartbeat logs.**

Run: `cd backend && npm run dev`
Expected: within a second of boot, logs `[driver] started …` then `[driver] boot tenant=<id> upserted=<N>`. Ctrl-C to stop.

- [ ] **Step 4: Commit.**

```bash
git add backend/src/services/driver.scheduler.ts backend/src/server.ts
git commit -m "feat(driver): heartbeat — boot + 15m tick + event-triggered evaluation"
```

---

### Task 4: Read-only API

**Files:**
- Create: `backend/src/controllers/driver.controller.ts`
- Create: `backend/src/routes/driver.routes.ts`
- Modify: `backend/src/routes/index.ts`

- [ ] **Step 1: Controller.** Create `backend/src/controllers/driver.controller.ts`:

```ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getQueueForRole, DRIVER_ROLES } from '../services/driver.service';

export async function queue(req: AuthRequest, res: Response) {
  try {
    const role = String(req.query.role || req.user!.role);
    const items = await getQueueForRole(req.user!.tenantId, role);
    res.json({ success: true, role, items });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
}

export async function myQueue(req: AuthRequest, res: Response) {
  try {
    const items = await getQueueForRole(req.user!.tenantId, req.user!.role);
    res.json({ success: true, role: req.user!.role, items });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
}

export async function roles(_req: AuthRequest, res: Response) {
  res.json({ success: true, roles: DRIVER_ROLES });
}
```

- [ ] **Step 2: Routes.** Create `backend/src/routes/driver.routes.ts`:

```ts
import { Router } from 'express';
import { requireAuth, requireLevel } from '../middleware/auth';
import * as driver from '../controllers/driver.controller';

const router = Router();
router.use(requireAuth);
router.get('/queue', requireLevel(0), driver.queue);
router.get('/queue/me', requireLevel(0), driver.myQueue);
router.get('/roles', requireLevel(0), driver.roles);

export default router;
```

- [ ] **Step 3: Mount it.** In `backend/src/routes/index.ts`, add the import alongside the others and `router.use('/driver', driverRoutes);` (match the file's existing import + mount style, e.g. next to `worldModel`):

```ts
import driverRoutes from './driver.routes';
// ...
router.use('/driver', driverRoutes);
```

- [ ] **Step 4: Verify the endpoint (real request).** With `npm run dev` running, get a token via the app's PIN→email login (or reuse a dev JWT), then:

Run: `curl -s http://127.0.0.1:$PORT/api/driver/queue/me -H "Authorization: Bearer $TOKEN" | head -c 300`
Expected: `{"success":true,"role":"…","items":[ … ]}` (401 if no/!valid token = route mounted + gated).

- [ ] **Step 5: Commit.**

```bash
git add backend/src/controllers/driver.controller.ts backend/src/routes/driver.routes.ts backend/src/routes/index.ts
git commit -m "feat(driver): read-only queue API (/api/driver/queue, /queue/me, /roles)"
```

---

### Task 5: Frontend Action Queue card (read-only)

**Files:**
- Create: `frontend/src/components/ActionQueueCard.tsx`
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`

- [ ] **Step 1: The card.** Create `frontend/src/components/ActionQueueCard.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const SEV = { CRITICAL: 'text-red-400', HIGH: 'text-amber-300', MEDIUM: 'text-primary', LOW: 'text-white/50' } as const;

export default function ActionQueueCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['driver-queue-me'],
    queryFn: () => api.get('/driver/queue/me').then((r) => r.data),
    refetchInterval: 60_000,
  });
  const items = data?.items ?? [];
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/70">Your shift — what to do now</h2>
        <span className="text-xs text-white/40">{items.length} open</span>
      </div>
      {isLoading ? <p className="text-white/30 text-sm">Loading…</p>
        : items.length === 0 ? <p className="text-white/30 text-sm">Nothing outstanding. You're clear.</p>
        : <ul className="space-y-2">
            {items.map((d: any) => (
              <li key={d.id} className="flex items-start gap-3 py-2 border-b border-white/5">
                <span className={`text-[10px] font-bold uppercase ${SEV[d.severity as keyof typeof SEV] ?? 'text-white/50'}`}>{d.severity}</span>
                <div className="flex-1">
                  <a href={d.linkUrl || '#'} className="text-sm text-white hover:text-primary">{d.title}</a>
                  {d.detail && <div className="text-xs text-white/40">{d.detail}</div>}
                </div>
              </li>
            ))}
          </ul>}
    </div>
  );
}
```

- [ ] **Step 2: Render it on the dashboard.** In `frontend/src/pages/dashboard/DashboardPage.tsx`, add the import and place `<ActionQueueCard />` near the top of the dashboard grid:

```tsx
import ActionQueueCard from '../../components/ActionQueueCard';
// ...inside the returned layout, as the first card:
<ActionQueueCard />
```

- [ ] **Step 3: Verify rendered (REQUIRED SUB-SKILL: shipping-verified-frontend).** Run the frontend (`cd frontend && npm run dev`), log in, open the dashboard, and confirm the "Your shift — what to do now" card renders with the seeded tenant's items (or the empty state). Don't claim done without looking.

- [ ] **Step 4: Commit.**

```bash
git add frontend/src/components/ActionQueueCard.tsx frontend/src/pages/dashboard/DashboardPage.tsx
git commit -m "feat(driver): read-only Action Queue card on the dashboard"
```

---

## FLOCORE note (do NOT build here — separate doc)
Each created DriverItem already `eventBus.emit('driver.item.created', …)`. That is the **only** FLOCORE touch-point Phase 1 needs: the event is ready to be forwarded once the FLOCORE event envelope + service-token contract land. **Full FLOCORE wiring is a separate integration document** (review the FLOCORE folder + `FLOCORE_INTEGRATION_RESPONSE.md`). Do not add FLOCORE HTTP calls in Phase 1.

## Self-review (done)
- **Spec coverage:** DriverItem model ✓(T1), rules engine reusing kpi/anomaly/worldModel/sop/tasks ✓(T2), idempotent dedupeKey ✓(T2), eventBus listeners + tick ✓(T3), read-only `/queue` + `/queue/me` ✓(T4), per-role card ✓(T5). No auto-ticketing/allocation (correctly deferred). ✓
- **Placeholders:** none — real code, paths, commands, expected output.
- **Type consistency:** `DriverInput`/`getQueueForRole`/`evaluate`/`DRIVER_ROLES` names match across service, controller, scheduler. `KpiResult` fields (`metric,name,target,actual,unit`) match `kpi.service`. ⚠ At execution, confirm the exact field names on Task/SOP-overview objects (`assignedRole`, `dueDate`, `sopStatus[].compliance/version/sopId/title`) against the live types and adjust the two filters if the seed uses different names — the only runtime-shape risk.
