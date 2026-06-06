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
// Anything not listed is higher-is-better.
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
// CORRECTION: listAnomalies treats `resolved` as a STRING ('false'), not a boolean.
async function anomalyDrivers(tenantId: string): Promise<DriverInput[]> {
  const items: any[] = await anomaly.listAnomalies({ tenantId, resolved: 'false' } as any);
  return items.map((a) => ({
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
// CORRECTION: getInferences() returns { id, name, severity, message } — use `message`, not `action`.
async function inferenceDrivers(tenantId: string): Promise<DriverInput[]> {
  const infs: any[] = await worldModel.getInferences(tenantId);
  return (infs || []).map((i) => ({
    role: 'FACILITY_MANAGER', sourceType: 'INFERENCE',
    severity: (i.severity || 'warning') === 'critical' ? 'CRITICAL' : 'HIGH',
    title: i.name || i.id,
    detail: i.message || '',
    evidence: { inferenceId: i.id },
    linkUrl: '/compliance',
    dedupeKey: `inference:${i.id}`,
  }));
}

// --- rule: SOP training overdue / incomplete ---
// CORRECTION: sopStatus[] items expose `sopTitle`, not `title`.
async function sopDrivers(tenantId: string): Promise<DriverInput[]> {
  const ov: any = await getSOPTrainingOverview(tenantId);
  const out: DriverInput[] = [];
  for (const s of (ov.sopStatus || [])) {
    if (s.compliance >= 100) continue;
    out.push({
      role: 'QA_INSPECTOR', sourceType: 'SOP_OVERDUE', severity: sev(s.compliance < 50 ? 2 : 1),
      title: `SOP training incomplete: ${s.sopTitle}`,
      detail: `${s.compliance}% trained (v${s.version})`,
      evidence: { sopId: s.sopId },
      linkUrl: '/sop-library',
      dedupeKey: `sop:${s.sopId}:v${s.version}`,
    });
  }
  return out;
}

// --- rule: overdue tasks (PENDING/IN_PROGRESS past dueDate) ---
// CORRECTION: Task has no role field — resolve role from assignedToId via a userId->role map.
async function taskDrivers(tenantId: string): Promise<DriverInput[]> {
  const tasks: any[] = await listTasks({ tenantId });
  const users = await prisma.user.findMany({ where: { tenantId }, select: { id: true, role: true } });
  const roleOf = new Map(users.map((u) => [u.id, u.role]));
  const now = Date.now();
  return tasks
    .filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now && t.status !== 'COMPLETED')
    .map((t) => ({
      role: (t.assignedToId && roleOf.get(t.assignedToId)) || 'FACILITY_MANAGER',
      sourceType: 'TASK_OVERDUE',
      severity: (t.priority || 'MEDIUM').toUpperCase(),
      title: `Overdue: ${t.title}`,
      detail: `Due ${new Date(t.dueDate).toISOString().slice(0, 10)}`,
      evidence: { taskId: t.id },
      linkUrl: '/tasks',
      dedupeKey: `task:${t.id}`,
    }));
}

/** Evaluate one tenant: gather drivers, upsert idempotently, emit FLOCORE handoff events. */
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
    // FLOCORE drives the ACTION from this event (we only sense/evaluate/surface).
    if (res.createdAt.getTime() === res.updatedAt.getTime()) {
      eventBus.emit('driver.item.created', {
        tenant_slug: 'origin', module_id: 'ilco-tnt', tenantId,
        role: d.role, severity: d.severity, sourceType: d.sourceType, dedupeKey: d.dedupeKey,
      });
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
