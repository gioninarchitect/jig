import { prisma } from '../config/db';
import { eventBus } from './eventBus';

// ── TASK TEMPLATES ──

export async function listTemplates(tenantId: string, category?: string) {
  const where: any = { tenantId, active: true };
  if (category) where.category = category;
  return prisma.taskTemplate.findMany({ where, orderBy: { title: 'asc' } });
}

export async function createTemplate(data: {
  title: string; description?: string; sopId?: string; roleRequired: string;
  frequency: string; category: string; checklist: any[]; autoCreate?: boolean;
  triggerEvent?: string; tenantId: string;
}) {
  return prisma.taskTemplate.create({ data });
}

// QA edits a form template — title, checklist items, category, active. (The form/checklist editor.)
export async function updateTemplate(id: string, tenantId: string, data: { title?: string; checklist?: any; category?: string; active?: boolean }) {
  const tpl = await prisma.taskTemplate.findFirst({ where: { id, tenantId } });
  if (!tpl) throw Object.assign(new Error('Template not found'), { status: 404 });
  const updates: any = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.checklist !== undefined) updates.checklist = data.checklist;
  if (data.category !== undefined) updates.category = data.category;
  if (data.active !== undefined) updates.active = data.active;
  return prisma.taskTemplate.update({ where: { id }, data: updates });
}

// ── TASKS ──

export async function listTasks(query: { tenantId: string; assignedToId?: string; status?: string; batchId?: string }) {
  const where: any = { tenantId: query.tenantId };
  if (query.assignedToId) where.assignedToId = query.assignedToId;
  if (query.status) where.status = query.status;
  if (query.batchId) where.batchId = query.batchId;
  return prisma.task.findMany({
    where,
    include: {
      template: { select: { title: true, category: true, checklist: true } },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });
}

export async function getTask(id: string, tenantId: string) {
  return prisma.task.findFirst({
    where: { id, tenantId },
    include: { template: true },
  });
}

export async function createTask(data: {
  title: string; templateId?: string; assignedToId: string; dueDate?: string;
  priority?: string; category?: string;
  batchId?: string; greenhouseId?: string; bayId?: string; zoneId?: string;
  assignerId?: string;
  tenantId: string; userId: string;
}) {
  const task = await prisma.task.create({
    data: {
      title: data.title,
      templateId: data.templateId,
      assignedToId: data.assignedToId,
      // If the client didn't send an explicit assigner, fall back to the caller.
      assignerId: data.assignerId ?? data.userId,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      priority: data.priority || 'MEDIUM',
      category: data.category,
      batchId: data.batchId,
      greenhouseId: data.greenhouseId,
      bayId: data.bayId,
      zoneId: data.zoneId,
      tenantId: data.tenantId,
    },
  });
  eventBus.emit('TASK_CREATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'Task', entityId: task.id });
  return task;
}

export async function completeTask(id: string, data: { checklistDone?: any[]; photo?: string; notes?: string; userId: string }) {
  const task = await prisma.task.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      checklistDone: data.checklistDone || undefined,
      photo: data.photo,
      notes: data.notes,
    },
  });
  eventBus.emit('TASK_COMPLETED', { userId: data.userId, entityType: 'Task', entityId: id });
  // Processing quality deviation — a signed-off QA/processing form recording an explicit
  // FAIL (not approved / out of spec / invoice mismatch / rejected) auto-raises a
  // documented deviation to the Processing Manager + FM + QA. Non-fatal.
  try { await raiseProcessingDeviationIfFailed(id, data.checklistDone, data.userId); } catch { /* non-fatal */ }
  return task;
}

async function raiseProcessingDeviationIfFailed(taskId: string, checklistDone: any[] | undefined, userId: string) {
  if (!Array.isArray(checklistDone) || !checklistDone.length) return;
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { template: { select: { category: true, title: true } } } });
  if (!task || !task.tenantId) return;
  const cat = task.template?.category;
  if (cat !== 'QA' && cat !== 'PROCESSING') return;
  const failed = checklistDone.find((c: any) => {
    const item = String(c?.item ?? '');
    const val = String(c?.value ?? '').trim().toUpperCase();
    return /approv|within spec|free from|corresponds with invoice/i.test(item)
      && ['NO', 'N', 'FAIL', 'FAILED', 'FALSE', 'REJECT', 'REJECTED'].includes(val);
  });
  if (!failed) return;
  const tenantId = task.tenantId;
  const sop = (await prisma.sOP.findFirst({ where: { tenantId, title: { contains: 'Harvest' } } }))
    || (await prisma.sOP.findFirst({ where: { tenantId } }));
  const editor = await prisma.user.findUnique({ where: { id: userId } });
  const facilityId = editor?.facilityId || (await prisma.facility.findFirst({ where: { tenantId } }))?.id;
  if (!sop || !facilityId) return;
  const deviation = await prisma.deviation.create({
    data: {
      sopId: sop.id,
      description: `PROCESSING QUALITY DEVIATION — form "${task.template?.title}" signed off as FAILED at "${failed.item}" (recorded: ${failed.value}). Logged by ${editor?.name || 'operator'}. Requires root-cause + CAPA + QA sign-off.`,
      severity: 'HIGH' as any, facilityId, raisedById: userId,
    },
  });
  eventBus.emit('DEVIATION_RAISED', { userId, tenantId, entityType: 'Deviation', entityId: deviation.id });
  // QA not onboarded until QA day → QA review redirected to SuperAdmin (Flo), NOT Keke.
  const recipients = await prisma.user.findMany({
    where: { tenantId, active: true, OR: [{ role: 'PROCESSING_MANAGER' as any }, { role: 'FACILITY_MANAGER' as any }, { email: 'florisolivier7@gmail.com' }] },
    select: { id: true },
  });
  if (recipients.length) {
    await prisma.notification.createMany({
      data: recipients.map((u) => ({ userId: u.id, title: `PROCESSING DEVIATION: ${task.template?.title}`, message: `Failed at ${failed.item} — root-cause + CAPA required`, link: '/qms' })),
    });
  }
}

export async function updateTaskStatus(id: string, status: string, tenantId?: string) {
  // Tenant-scope the write so a task id alone can't reach across tenants.
  if (tenantId) {
    const res = await prisma.task.updateMany({ where: { id, tenantId }, data: { status } });
    if (res.count === 0) throw Object.assign(new Error('Task not found'), { status: 404 });
    return prisma.task.findUnique({ where: { id } });
  }
  return prisma.task.update({ where: { id }, data: { status } });
}

// ── AUTO-CREATE QUARANTINE TASKS ──

export async function createQuarantineTasks(batchId: string, tenantId: string, userId: string) {
  // Find all templates that trigger on quarantine
  const templates = await prisma.taskTemplate.findMany({
    where: { tenantId, active: true, triggerEvent: 'BATCH_QUARANTINED' },
  });

  // Also create standard quarantine tasks even if no templates exist
  const standardTasks = [
    { title: 'Isolate quarantined batch — move to quarantine zone', priority: 'CRITICAL', roleRequired: 'CULTIVATOR' },
    { title: 'Notify SAHPRA of quarantine event', priority: 'CRITICAL', roleRequired: 'FACILITY_MANAGER' },
    { title: 'Sample for re-testing — send to lab', priority: 'HIGH', roleRequired: 'LAB_TECH' },
    { title: 'Document quarantine — photos + notes', priority: 'HIGH', roleRequired: 'QA_INSPECTOR' },
    { title: 'Root cause analysis — investigate contamination source', priority: 'HIGH', roleRequired: 'FACILITY_MANAGER' },
    { title: 'Review affected area cleaning schedule', priority: 'MEDIUM', roleRequired: 'HOUSEKEEPING' },
    { title: 'Equipment check — calibrate scales + sensors in affected zone', priority: 'MEDIUM', roleRequired: 'MAINTENANCE_MANAGER' },
  ];

  const created = [];

  // Create from templates
  for (const tmpl of templates) {
    const task = await prisma.task.create({
      data: {
        title: tmpl.title,
        templateId: tmpl.id,
        assignedToId: userId, // will be reassigned by FM
        batchId,
        priority: 'HIGH',
        tenantId,
      },
    });
    created.push(task);
  }

  // Create standard tasks (only if no templates cover them)
  if (templates.length === 0) {
    for (const st of standardTasks) {
      // Find a user with matching role, or assign to the triggering user
      const assignee = await prisma.user.findFirst({
        where: { tenantId, role: st.roleRequired as any, active: true },
        select: { id: true },
      });

      const task = await prisma.task.create({
        data: {
          title: st.title,
          assignedToId: assignee?.id || userId,
          batchId,
          priority: st.priority,
          tenantId,
        },
      });
      created.push(task);
    }
  }

  return created;
}

// ── SAHPRA SOP TEMPLATES (SEED DATA) ──

export const SAHPRA_SOP_TEMPLATES = [
  {
    title: 'Daily Facility Inspection',
    category: 'SAHPRA',
    roleRequired: 'FACILITY_SUPERVISOR',
    frequency: 'DAILY',
    checklist: [
      { item: 'Check all entry/exit logs are complete', required: true },
      { item: 'Verify security cameras operational', required: true },
      { item: 'Inspect grow rooms — temperature + humidity within range', required: true },
      { item: 'Check pest traps — record findings', required: true },
      { item: 'Verify all staff wearing correct PPE', required: true },
      { item: 'Check fire extinguishers accessible', required: false },
    ],
  },
  {
    title: 'Spray Application Record',
    category: 'SAHPRA',
    roleRequired: 'CULTIVATOR',
    frequency: 'PER_BATCH',
    checklist: [
      { item: 'Identify chemical/biological agent to be used', required: true },
      { item: 'Record batch number, dilution ratio, volume prepared', required: true },
      { item: 'Wear full PPE — gloves, mask, goggles', required: true },
      { item: 'Apply to all plants in designated greenhouse', required: true },
      { item: 'Record start time, end time, applicator name', required: true },
      { item: 'Log re-entry interval', required: true },
      { item: 'Take post-spray photo', required: false },
    ],
  },
  {
    title: 'Equipment Calibration Check',
    category: 'SAHPRA',
    roleRequired: 'MAINTENANCE_MANAGER',
    frequency: 'WEEKLY',
    checklist: [
      { item: 'Calibrate all weighing scales with reference weights', required: true },
      { item: 'Check temperature/humidity sensor accuracy', required: true },
      { item: 'Verify pH meter calibration', required: true },
      { item: 'Check EC meter calibration', required: true },
      { item: 'Record all readings in calibration log', required: true },
      { item: 'Flag any out-of-spec equipment', required: true },
    ],
  },
  {
    title: 'Cleaning & Sanitization — Grow Room',
    category: 'CLEANING',
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    checklist: [
      { item: 'Sweep and mop all floors', required: true },
      { item: 'Sanitize all work surfaces', required: true },
      { item: 'Clean drain trays and gutters', required: true },
      { item: 'Wipe down doors, handles, switches', required: true },
      { item: 'Empty waste bins — separate organic/non-organic', required: true },
      { item: 'Restock PPE station (gloves, masks, hairnets)', required: true },
    ],
  },
  {
    title: 'Cleaning & Sanitization — Dry Room',
    category: 'CLEANING',
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    checklist: [
      { item: 'Sweep floors — no debris', required: true },
      { item: 'Wipe all drying racks with sanitizer', required: true },
      { item: 'Check humidity/temp sensors clean and readable', required: true },
      { item: 'Inspect for mould — report immediately if found', required: true },
      { item: 'Clean air filters/vents', required: false },
    ],
  },
  {
    title: 'Cleaning & Sanitization — Trim Room',
    category: 'CLEANING',
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    checklist: [
      { item: 'Sanitize all trim trays and scissors', required: true },
      { item: 'Sweep and mop floor', required: true },
      { item: 'Clean all weighing scales', required: true },
      { item: 'Wipe tables with food-grade sanitizer', required: true },
      { item: 'Empty trim waste bins', required: true },
      { item: 'Restock gloves + hairnets', required: true },
    ],
  },
  {
    title: 'Cleaning & Sanitization — Pack Room',
    category: 'CLEANING',
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    checklist: [
      { item: 'Sanitize all packing surfaces', required: true },
      { item: 'Clean heat sealer + label printer', required: true },
      { item: 'Sweep and mop floor', required: true },
      { item: 'Check all packaging material stock levels', required: true },
      { item: 'Verify all scales calibrated before packing', required: true },
    ],
  },
  {
    title: 'Laundry Processing',
    category: 'CLEANING',
    roleRequired: 'LAUNDRY',
    frequency: 'DAILY',
    checklist: [
      { item: 'Collect all used uniforms, coats, towels from each room', required: true },
      { item: 'Separate by contamination level (grow/trim/pack)', required: true },
      { item: 'Wash at correct temperature per fabric type', required: true },
      { item: 'Dry completely — no damp storage', required: true },
      { item: 'Fold and return to correct PPE station', required: true },
      { item: 'Record wash cycle count + chemical used', required: false },
    ],
  },
  {
    title: 'Quarantine Response Protocol',
    category: 'QUARANTINE',
    roleRequired: 'FACILITY_MANAGER',
    frequency: 'ON_QUARANTINE',
    autoCreate: true,
    triggerEvent: 'BATCH_QUARANTINED',
    checklist: [
      { item: 'Immediately isolate affected batch to quarantine zone', required: true },
      { item: 'Secure area — restrict access to authorized personnel only', required: true },
      { item: 'Collect samples for re-testing', required: true },
      { item: 'Notify SAHPRA within 24 hours', required: true },
      { item: 'Document batch details — ID, strain, weight, location', required: true },
      { item: 'Photograph affected material', required: true },
      { item: 'Begin root cause investigation', required: true },
      { item: 'Review all related batches for cross-contamination', required: true },
      { item: 'Schedule CAPA meeting within 48 hours', required: true },
      { item: 'Update compliance log with quarantine event', required: true },
    ],
  },
  {
    title: 'Destruction Event Protocol',
    category: 'SAHPRA',
    roleRequired: 'FACILITY_MANAGER',
    frequency: 'ONE_TIME',
    checklist: [
      { item: 'Notify SAPS — schedule officer attendance', required: true },
      { item: 'Weigh all material to be destroyed — record weights', required: true },
      { item: 'SAPS officer present — record name, badge, station', required: true },
      { item: 'Destroy material per approved method', required: true },
      { item: 'Photograph destruction process', required: true },
      { item: 'Both parties sign destruction certificate', required: true },
      { item: 'File certificate in compliance records', required: true },
      { item: 'Update INCB quota tracking', required: true },
    ],
  },
  {
    title: 'Harvest Processing SOP',
    category: 'PROCESSING',
    roleRequired: 'PROCESSING_MANAGER',
    frequency: 'PER_BATCH',
    checklist: [
      { item: 'Verify harvest date matches grow schedule', required: true },
      { item: 'Cut plants — record wet weight per plant', required: true },
      { item: 'Hang on drying racks — assign rack IDs', required: true },
      { item: 'Record room temp + humidity at time of hang', required: true },
      { item: 'Set drying monitoring schedule (daily checks)', required: true },
      { item: 'Update BayGrid — clear harvested bay', required: true },
    ],
  },
  {
    title: 'Monthly INCB Reconciliation',
    category: 'SAHPRA',
    roleRequired: 'TENANT_ADMIN',
    frequency: 'MONTHLY',
    checklist: [
      { item: 'Export total production weight for the month', required: true },
      { item: 'Export total destruction weight for the month', required: true },
      { item: 'Calculate net inventory change', required: true },
      { item: 'Compare against INCB quota allocation', required: true },
      { item: 'Document any variance > 2%', required: true },
      { item: 'Prepare INCB submission report', required: true },
      { item: 'Submit to SAHPRA before 5th of next month', required: true },
    ],
  },
];

// ── KPI DEFINITIONS PER ROLE ──

export const ROLE_KPI_DEFINITIONS: Record<string, Array<{ name: string; metric: string; target: number; unit: string }>> = {
  CULTIVATOR: [
    { name: 'Clone Rooting Rate', metric: 'clone_rooting_pct', target: 85, unit: '%' },
    { name: 'Tasks Completed On Time', metric: 'tasks_on_time_pct', target: 95, unit: '%' },
    { name: 'Plant Mortality Rate', metric: 'plant_mortality_pct', target: 5, unit: '%' },
    { name: 'Growth Records Logged', metric: 'growth_logs', target: 20, unit: 'count' },
  ],
  FACILITY_MANAGER: [
    { name: 'Weight Integrity Score', metric: 'weight_integrity', target: 90, unit: '%' },
    { name: 'Open Anomalies', metric: 'open_anomalies', target: 0, unit: 'count' },
    { name: 'Ticket Resolution Time', metric: 'ticket_resolution_days', target: 3, unit: 'days' },
    { name: 'Compliance Score', metric: 'compliance_score', target: 85, unit: '%' },
  ],
  PROCESSING_MANAGER: [
    { name: 'Trim Weight Accuracy', metric: 'trim_weight_accuracy', target: 98, unit: '%' },
    { name: 'Drying Loss Rate', metric: 'drying_loss_pct', target: 75, unit: '%' },
    { name: 'Trim Sessions Completed', metric: 'trim_sessions_done', target: 10, unit: 'count' },
    { name: 'Processing Throughput', metric: 'processing_kg', target: 50, unit: 'kg' },
  ],
  LAB_TECH: [
    { name: 'Tests Completed', metric: 'tests_completed', target: 40, unit: 'count' },
    { name: 'Pass Rate', metric: 'test_pass_rate', target: 90, unit: '%' },
    { name: 'COAs Generated', metric: 'coas_generated', target: 5, unit: 'count' },
    { name: 'Avg Turnaround Time', metric: 'lab_turnaround_days', target: 5, unit: 'days' },
  ],
  QA_INSPECTOR: [
    { name: 'Inspections Completed', metric: 'inspections_done', target: 20, unit: 'count' },
    { name: 'Rejection Rate', metric: 'rejection_rate', target: 10, unit: '%' },
    { name: 'SOP Compliance Audits', metric: 'sop_audits', target: 4, unit: 'count' },
    { name: 'Deviation Reports Filed', metric: 'deviations_filed', target: 2, unit: 'count' },
  ],
  MAINTENANCE_MANAGER: [
    { name: 'Equipment Uptime', metric: 'equipment_uptime', target: 98, unit: '%' },
    { name: 'Calibrations On Time', metric: 'calibrations_on_time', target: 100, unit: '%' },
    { name: 'Tickets Resolved', metric: 'tickets_resolved', target: 15, unit: 'count' },
    { name: 'Preventive Maintenance Done', metric: 'preventive_done', target: 8, unit: 'count' },
  ],
  SECURITY_OFFICER: [
    { name: 'Gate Logs Completed', metric: 'gate_logs', target: 100, unit: '%' },
    { name: 'Transport Manifests Processed', metric: 'manifests_processed', target: 10, unit: 'count' },
    { name: 'Destruction Events Witnessed', metric: 'destructions_witnessed', target: 2, unit: 'count' },
  ],
  TRIMMER: [
    { name: 'Weight Accuracy', metric: 'trim_weight_accuracy', target: 98, unit: '%' },
    { name: 'Sessions Completed', metric: 'trim_sessions', target: 20, unit: 'count' },
    { name: 'Avg Trim Speed', metric: 'trim_grams_per_hour', target: 100, unit: 'g/hr' },
  ],
  HOUSEKEEPING: [
    { name: 'Daily Cleaning Tasks Done', metric: 'cleaning_tasks_done', target: 100, unit: '%' },
    { name: 'Inspection Pass Rate', metric: 'cleaning_inspection_pass', target: 95, unit: '%' },
  ],
  LAUNDRY: [
    { name: 'Laundry Cycles Completed', metric: 'laundry_cycles', target: 100, unit: '%' },
    { name: 'PPE Availability', metric: 'ppe_available', target: 100, unit: '%' },
  ],
};

// Daily auto-materializer — turns active recurring TaskTemplates into dated Task
// instances assigned to the right role, so every recurring form self-appears for
// sign-off. Idempotent: one task per template per day (safe to run every tick).
// No event emit (avoids driver feedback loop).
export async function materializeRecurringForms(tenantId: string) {
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const dow = now.getDay();   // 0 Sun .. 1 Mon
  const dom = now.getDate();
  const templates = await prisma.taskTemplate.findMany({
    where: { tenantId, active: true, frequency: { in: ['DAILY', 'WEEKLY', 'MONTHLY'] } },
  });
  let created = 0;
  const byAssignee = new Map<string, number>();   // userId → how many new checklists landed on them
  for (const t of templates) {
    // ILCO is closed over weekends — daily checklists run Mon–Fri only (Loraine).
    // (Weekly already targets Monday; monthly targets the 1st, so those are unaffected.)
    if (t.frequency === 'DAILY' && (dow === 0 || dow === 6)) continue;   // Sun (0) / Sat (6)
    if (t.frequency === 'WEEKLY' && dow !== 1) continue;   // Mondays
    if (t.frequency === 'MONTHLY' && dom !== 1) continue;   // 1st of month
    const exists = await prisma.task.findFirst({ where: { templateId: t.id, createdAt: { gte: dayStart } }, select: { id: true } });
    if (exists) continue;
    // Commissioning gate: a form only generates a task when its role has a REAL, active
    // owner. No cross-role fallback — an unstaffed role must NOT dump phantom tasks onto
    // the Facility Manager (or anyone). When that role's person is commissioned, their
    // forms start flowing automatically. Real owners only — no demo/misrouted data.
    const assignee = await prisma.user.findFirst({
      where: { tenantId, role: t.roleRequired as any, active: true },
    });
    if (!assignee) continue;
    await prisma.task.create({
      data: { title: t.title, templateId: t.id, assignedToId: assignee.id, assignerId: assignee.id, dueDate: now, priority: 'MEDIUM', category: t.category, tenantId },
    });
    created++;
    byAssignee.set(assignee.id, (byAssignee.get(assignee.id) || 0) + 1);
  }
  // One bell ping per responsible person summarising the checklists that just landed on
  // their board (a summary, not one-per-task — keeps the bell useful, not noisy).
  for (const [userId, count] of byAssignee) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: `${count} checklist${count > 1 ? 's' : ''} due today`,
          message: 'Your daily checklists are on your board — tap to complete + sign off.',
          link: '/tasks',
        },
      });
    } catch (e: any) { console.error('[materialize] notify failed:', e.message); }
  }
  return { created };
}
