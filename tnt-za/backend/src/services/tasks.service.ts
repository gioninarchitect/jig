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
  return task;
}

export async function updateTaskStatus(id: string, status: string) {
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
