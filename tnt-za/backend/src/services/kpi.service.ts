import { prisma } from '../config/db';

interface KpiResult {
  metric: string;
  name: string;
  target: number;
  actual: number;
  unit: string;
  trend?: 'up' | 'down' | 'flat';
}

// ── CULTIVATOR KPIs ──

async function cultivatorKpis(userId: string, tenantId: string): Promise<KpiResult[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Clone rooting rate — rooted / total cuttings across all trays this month
  const trays = await prisma.cloneTray.findMany({
    where: { tenantId, createdById: userId, cloneDate: { gte: monthStart } },
    select: { totalCuttings: true, rooted: true, mortality: true },
  });
  const totalCuttings = trays.reduce((s, t) => s + t.totalCuttings, 0);
  const totalRooted = trays.reduce((s, t) => s + t.rooted, 0);
  const rootingRate = totalCuttings > 0 ? Math.round((totalRooted / totalCuttings) * 100) : 0;

  // Tasks completed on time
  const tasksDone = await prisma.task.count({ where: { tenantId, assignedToId: userId, status: 'COMPLETED', completedAt: { gte: monthStart } } });
  const tasksTotal = await prisma.task.count({ where: { tenantId, assignedToId: userId, createdAt: { gte: monthStart } } });
  const tasksOnTime = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 100;

  // Plant mortality — flagged plants / total plants
  const totalPlants = await prisma.plant.count({ where: { tenantId, handlerId: userId } });
  const flaggedPlants = await prisma.plant.count({ where: { tenantId, handlerId: userId, status: 'FLAGGED' } });
  const mortalityRate = totalPlants > 0 ? Math.round((flaggedPlants / totalPlants) * 100) : 0;

  return [
    { metric: 'clone_rooting_pct', name: 'Clone Rooting Rate', target: 85, actual: rootingRate, unit: '%' },
    { metric: 'tasks_on_time_pct', name: 'Tasks Completed On Time', target: 95, actual: tasksOnTime, unit: '%' },
    { metric: 'plant_mortality_pct', name: 'Plant Mortality Rate', target: 5, actual: mortalityRate, unit: '%' },
    { metric: 'clones_this_month', name: 'Clones This Month', target: 20, actual: totalCuttings, unit: 'count' },
  ];
}

// ── FACILITY MANAGER KPIs ──

async function facilityManagerKpis(tenantId: string): Promise<KpiResult[]> {
  const openAnomalies = await prisma.anomaly.count({ where: { resolvedAt: null } });

  // Weight integrity — containers without variance / total containers
  const totalContainers = await prisma.container.count({ where: { tenantId, status: { not: 'RETIRED' } } });
  const containersWithVariance = await prisma.anomaly.count({ where: { type: 'CONTAINER_WEIGHT_VARIANCE', resolvedAt: null } });
  const weightIntegrity = totalContainers > 0 ? Math.round(((totalContainers - containersWithVariance) / totalContainers) * 100) : 100;

  // Ticket resolution — avg days for tickets resolved this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const resolvedTickets = await prisma.ticket.findMany({
    where: { tenantId, status: 'COMPLETED', resolvedAt: { gte: monthStart } },
    select: { createdAt: true, resolvedAt: true },
  });
  const avgResolution = resolvedTickets.length > 0
    ? Math.round(resolvedTickets.reduce((s, t) => s + ((t.resolvedAt!.getTime() - t.createdAt.getTime()) / 86400000), 0) / resolvedTickets.length)
    : 0;

  // Compliance score from world model risk
  const compliance = weightIntegrity > 90 && openAnomalies === 0 ? 95 : weightIntegrity > 80 ? 80 : 65;

  return [
    { metric: 'weight_integrity', name: 'Weight Integrity Score', target: 90, actual: weightIntegrity, unit: '%' },
    { metric: 'open_anomalies', name: 'Open Anomalies', target: 0, actual: openAnomalies, unit: 'count' },
    { metric: 'ticket_resolution_days', name: 'Ticket Resolution (avg)', target: 3, actual: avgResolution, unit: 'days' },
    { metric: 'compliance_score', name: 'Compliance Score', target: 85, actual: compliance, unit: '%' },
  ];
}

// ── PROCESSING MANAGER KPIs ──

async function processingManagerKpis(tenantId: string): Promise<KpiResult[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Batches released this month
  const batchesProcessed = await prisma.batch.count({ where: { tenantId, status: 'RELEASED', createdAt: { gte: monthStart } } });

  // Active batches in processing (ACTIVE or IN_TESTING)
  const inProcessing = await prisma.batch.count({ where: { tenantId, status: { in: ['ACTIVE', 'IN_TESTING'] } } });

  // Tasks completion
  const tasksDone = await prisma.task.count({ where: { tenantId, status: 'COMPLETED', completedAt: { gte: monthStart } } });

  return [
    { metric: 'batches_processed', name: 'Batches Processed', target: 5, actual: batchesProcessed, unit: 'count' },
    { metric: 'in_processing', name: 'Currently Processing', target: 3, actual: inProcessing, unit: 'count' },
    { metric: 'tasks_done', name: 'Tasks Completed', target: 20, actual: tasksDone, unit: 'count' },
    { metric: 'trim_accuracy', name: 'Trim Weight Accuracy', target: 98, actual: 98, unit: '%' }, // placeholder until trim sessions built
  ];
}

// ── LAB TECH KPIs ──

async function labTechKpis(tenantId: string): Promise<KpiResult[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const testsCompleted = await prisma.labResult.count({ where: { testedAt: { gte: monthStart } } });
  const testsPassed = await prisma.labResult.count({ where: { testedAt: { gte: monthStart }, passed: true } });
  const passRate = testsCompleted > 0 ? Math.round((testsPassed / testsCompleted) * 100) : 0;
  const coasGenerated = await prisma.cOA.count({ where: { issuedAt: { gte: monthStart } } });

  return [
    { metric: 'tests_completed', name: 'Tests Completed', target: 40, actual: testsCompleted, unit: 'count' },
    { metric: 'test_pass_rate', name: 'Pass Rate', target: 90, actual: passRate, unit: '%' },
    { metric: 'coas_generated', name: 'COAs Generated', target: 5, actual: coasGenerated, unit: 'count' },
  ];
}

// ── QA INSPECTOR KPIs ──

async function qaInspectorKpis(tenantId: string): Promise<KpiResult[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const quarantined = await prisma.batch.count({ where: { tenantId, status: 'QUARANTINED' } });
  const openDeviations = await prisma.deviation.count({ where: { closedAt: null } });
  const activeSops = await prisma.sOP.count({ where: { tenantId, active: true } });
  const tasksDone = await prisma.task.count({ where: { tenantId, status: 'COMPLETED', completedAt: { gte: monthStart } } });

  return [
    { metric: 'quarantined_batches', name: 'Quarantined Batches', target: 0, actual: quarantined, unit: 'count' },
    { metric: 'open_deviations', name: 'Open Deviations', target: 0, actual: openDeviations, unit: 'count' },
    { metric: 'active_sops', name: 'Active SOPs', target: 10, actual: activeSops, unit: 'count' },
    { metric: 'inspections_done', name: 'Tasks Completed', target: 20, actual: tasksDone, unit: 'count' },
  ];
}

// ── MAINTENANCE MANAGER KPIs ──

async function maintenanceManagerKpis(tenantId: string): Promise<KpiResult[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const ticketsResolved = await prisma.ticket.count({ where: { tenantId, status: 'COMPLETED', resolvedAt: { gte: monthStart } } });
  const ticketsOpen = await prisma.ticket.count({ where: { tenantId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } });
  const calibrationsDue = await prisma.equipmentCalibration.count({ where: { nextDue: { lte: new Date(now.getTime() + 7 * 86400000) } } });

  return [
    { metric: 'tickets_resolved', name: 'Tickets Resolved', target: 15, actual: ticketsResolved, unit: 'count' },
    { metric: 'tickets_open', name: 'Open Tickets', target: 0, actual: ticketsOpen, unit: 'count' },
    { metric: 'calibrations_due', name: 'Calibrations Due (7d)', target: 0, actual: calibrationsDue, unit: 'count' },
    { metric: 'equipment_uptime', name: 'Equipment Uptime', target: 98, actual: ticketsOpen === 0 ? 100 : 95, unit: '%' },
  ];
}

// ── SECURITY KPIs ──

async function securityKpis(tenantId: string): Promise<KpiResult[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const manifests = await prisma.transportManifest.count({ where: { createdAt: { gte: monthStart } } });
  const destructions = await prisma.destructionEvent.count({ where: { witnessedAt: { gte: monthStart } } });

  return [
    { metric: 'manifests_processed', name: 'Manifests Processed', target: 10, actual: manifests, unit: 'count' },
    { metric: 'destructions_witnessed', name: 'Destructions Witnessed', target: 2, actual: destructions, unit: 'count' },
    { metric: 'gate_logs', name: 'Gate Log Compliance', target: 100, actual: 100, unit: '%' },
  ];
}

// ── GENERAL (tasks-based KPIs for Trimmer, Housekeeping, Laundry) ──

async function taskBasedKpis(userId: string, tenantId: string, role: string): Promise<KpiResult[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const tasksDone = await prisma.task.count({ where: { tenantId, assignedToId: userId, status: 'COMPLETED', completedAt: { gte: monthStart } } });
  const tasksTotal = await prisma.task.count({ where: { tenantId, assignedToId: userId, createdAt: { gte: monthStart } } });
  const completionRate = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 100;

  return [
    { metric: 'tasks_done', name: 'Tasks Completed', target: 20, actual: tasksDone, unit: 'count' },
    { metric: 'completion_rate', name: 'Completion Rate', target: 100, actual: completionRate, unit: '%' },
  ];
}

// ── MAIN ENTRY ──

// ── OWNER KPIs ──

async function ownerKpis(tenantId: string): Promise<KpiResult[]> {
  const totalPlants = await prisma.plant.count({ where: { tenantId } });
  const totalBatches = await prisma.batch.count({ where: { tenantId } });
  const releasedBatches = await prisma.batch.count({ where: { tenantId, status: 'RELEASED' } });
  const openAnomalies = await prisma.anomaly.count({ where: { resolvedAt: null } });
  const totalStaff = await prisma.user.count({ where: { tenantId, active: true } });
  const openTickets = await prisma.ticket.count({ where: { tenantId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } });
  const pendingApprovals = await prisma.ticket.count({ where: { tenantId, ticketType: { in: ['REQUISITION', 'APPROVAL'] }, approvedAt: null, status: { not: 'COMPLETED' } } });

  return [
    { metric: 'total_plants', name: 'Active Plants', target: 200, actual: totalPlants, unit: 'count' },
    { metric: 'released_batches', name: 'Batches Released', target: 10, actual: releasedBatches, unit: 'count' },
    { metric: 'open_anomalies', name: 'Open Anomalies', target: 0, actual: openAnomalies, unit: 'count' },
    { metric: 'pending_approvals', name: 'Pending Approvals', target: 0, actual: pendingApprovals, unit: 'count' },
    { metric: 'open_tickets', name: 'Open Tickets', target: 5, actual: openTickets, unit: 'count' },
    { metric: 'total_staff', name: 'Active Staff', target: 25, actual: totalStaff, unit: 'count' },
  ];
}

// ── HEAD OF CULTIVATION KPIs ──

async function headCultKpis(tenantId: string): Promise<KpiResult[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeMothers = await prisma.motherPlant.count({ where: { tenantId, status: 'ACTIVE' } });
  const trays = await prisma.cloneTray.findMany({ where: { tenantId, cloneDate: { gte: monthStart } } });
  const totalCuttings = trays.reduce((s, t) => s + t.totalCuttings, 0);
  const totalRooted = trays.reduce((s, t) => s + t.rooted, 0);
  const rootingRate = totalCuttings > 0 ? Math.round((totalRooted / totalCuttings) * 100) : 0;

  const activePlants = await prisma.plant.count({ where: { tenantId, status: 'ACTIVE' } });
  const deaths = await prisma.mortalityRecord.aggregate({ where: { tenantId, date: { gte: monthStart } }, _sum: { quantity: true } });
  const monthlyDeaths = deaths._sum.quantity || 0;
  const mortalityRate = activePlants > 0 ? Math.round((monthlyDeaths / (activePlants + monthlyDeaths)) * 100) : 0;

  const mothersOverdue = await prisma.motherPlant.count({ where: { tenantId, status: 'ACTIVE', nextHealthCheck: { lte: new Date() } } });

  return [
    { metric: 'active_mothers', name: 'Active Mothers', target: 5, actual: activeMothers, unit: 'count' },
    { metric: 'clone_rooting', name: 'Clone Rooting Rate', target: 85, actual: rootingRate, unit: '%' },
    { metric: 'mortality_rate', name: 'Monthly Mortality', target: 5, actual: mortalityRate, unit: '%' },
    { metric: 'mothers_overdue', name: 'Health Checks Due', target: 0, actual: mothersOverdue, unit: 'count' },
    { metric: 'active_plants', name: 'Active Plants', target: 100, actual: activePlants, unit: 'count' },
    { metric: 'clones_this_month', name: 'Clones This Month', target: 50, actual: totalCuttings, unit: 'count' },
  ];
}

// ── NURSERY MANAGER KPIs ──

async function nurseryKpis(tenantId: string): Promise<KpiResult[]> {
  const activeTrays = await prisma.cloneTray.count({ where: { tenantId, status: { in: ['ROOTING', 'ROOTED'] } } });
  const trays = await prisma.cloneTray.findMany({ where: { tenantId } });
  const totalCuttings = trays.reduce((s, t) => s + t.totalCuttings, 0);
  const totalRooted = trays.reduce((s, t) => s + t.rooted, 0);
  const totalMortality = trays.reduce((s, t) => s + t.mortality, 0);
  const rootingRate = totalCuttings > 0 ? Math.round((totalRooted / totalCuttings) * 100) : 0;
  const mortalityRate = totalCuttings > 0 ? Math.round((totalMortality / totalCuttings) * 100) : 0;

  return [
    { metric: 'active_trays', name: 'Active Clone Trays', target: 5, actual: activeTrays, unit: 'count' },
    { metric: 'rooting_rate', name: 'Rooting Rate', target: 85, actual: rootingRate, unit: '%' },
    { metric: 'mortality_rate', name: 'Mortality Rate', target: 15, actual: mortalityRate, unit: '%' },
    { metric: 'total_clones', name: 'Total Clones Produced', target: 200, actual: totalCuttings, unit: 'count' },
  ];
}

// ── FACILITY SUPERVISOR KPIs ──

async function facilitySupervisorKpis(tenantId: string): Promise<KpiResult[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const openFacilityTickets = await prisma.ticket.count({ where: { tenantId, workflowStage: 'FACILITY', status: { in: ['OPEN', 'ASSIGNED'] } } });
  const tasksCompleted = await prisma.task.count({ where: { tenantId, status: 'COMPLETED', completedAt: { gte: monthStart } } });
  const tasksTotal = await prisma.task.count({ where: { tenantId, createdAt: { gte: monthStart } } });
  const completionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 100;
  const calDue = await prisma.equipmentCalibration.count({ where: { nextDue: { lte: new Date(now.getTime() + 7 * 86400000) } } });

  return [
    { metric: 'facility_tickets', name: 'Open Facility Tickets', target: 0, actual: openFacilityTickets, unit: 'count' },
    { metric: 'task_completion', name: 'Task Completion Rate', target: 95, actual: completionRate, unit: '%' },
    { metric: 'calibrations_due', name: 'Calibrations Due', target: 0, actual: calDue, unit: 'count' },
    { metric: 'tasks_this_month', name: 'Tasks This Month', target: 50, actual: tasksTotal, unit: 'count' },
  ];
}

// ── PROCESSING SUPERVISOR KPIs ──

async function processingSupervisorKpis(tenantId: string): Promise<KpiResult[]> {
  const activeSessions = await prisma.trimSession.count({ where: { tenantId, status: 'IN_PROGRESS' } });
  const completed = await prisma.trimSession.count({ where: { tenantId, status: 'COMPLETED' } });

  return [
    { metric: 'active_trim', name: 'Active Trim Sessions', target: 3, actual: activeSessions, unit: 'count' },
    { metric: 'completed_trim', name: 'Completed Sessions', target: 10, actual: completed, unit: 'count' },
  ];
}

export async function getKpisForRole(userId: string, tenantId: string, role: string): Promise<KpiResult[]> {
  try {
    switch (role) {
      case 'CULTIVATOR':
      case 'IRRIGATION_TECH':
        return await cultivatorKpis(userId, tenantId);
      case 'FACILITY_MANAGER':
        return await facilityManagerKpis(tenantId);
      case 'FACILITY_SUPERVISOR':
        return await facilitySupervisorKpis(tenantId);
      case 'HEAD_OF_CULTIVATION':
        return await headCultKpis(tenantId);
      case 'NURSERY_MANAGER':
        return await nurseryKpis(tenantId);
      case 'PROCESSING_MANAGER':
        return await processingManagerKpis(tenantId);
      case 'PROCESSING_SUPERVISOR':
        return await processingSupervisorKpis(tenantId);
      case 'LAB_TECH':
        return await labTechKpis(tenantId);
      case 'QA_INSPECTOR':
        return await qaInspectorKpis(tenantId);
      case 'MAINTENANCE_MANAGER':
        return await maintenanceManagerKpis(tenantId);
      case 'SECURITY_OFFICER':
        return await securityKpis(tenantId);
      case 'TRIMMER':
      case 'HOUSEKEEPING':
      case 'LAUNDRY':
      case 'GENERAL_WORKER':
        return await taskBasedKpis(userId, tenantId, role);
      case 'TENANT_ADMIN':
      case 'SUPER_ADMIN':
        return await ownerKpis(tenantId);
      default:
        return [];
    }
  } catch (err) {
    console.error('KPI calculation error:', err);
    return [];
  }
}
