import { prisma } from '../config/db';
import { eventBus } from './eventBus';

const BCR_CONTROLS = [
  'EU_GMP_VOL4_CH4_DOCUMENTATION',
  'EU_GMP_VOL4_CH5_PRODUCTION',
  'EU_GMP_VOL4_ANNEX15',
  'EU_GMP_VOL4_PARTIII_Q9',
];

export async function ensureBatchCultivationRecord(batchId: string, tenantId: string, userId: string) {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, tenantId },
    include: {
      batchPlants: { include: { plant: true } },
      labelRecords: true,
      cultivationRecord: true,
    },
  });
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

  const checklistTemplates = await prisma.taskTemplate.findMany({
    where: {
      tenantId,
      active: true,
      OR: [
        { category: { in: ['GENERAL', 'SAHPRA', 'CULTIVATION', 'PROCESSING', 'QA', 'CLEANING', 'MAINTENANCE', 'QUARANTINE'] } },
        { sopId: { not: null } },
      ],
    },
    select: { id: true, title: true, category: true, roleRequired: true, checklist: true },
    take: 50,
  });

  const mortality = await prisma.mortalityRecord.findMany({
    where: {
      tenantId,
      OR: [
        { entityId: { in: batch.batchPlants.map(bp => bp.plantId) } },
        { strain: batch.strain },
      ],
    },
    select: { id: true, entityType: true, strain: true, quantity: true, causeCategory: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const deviations = await prisma.deviation.findMany({
    where: { facilityId: batch.facilityId, closedAt: null },
    select: { id: true, description: true, severity: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const sourceSummary = {
    batchNumber: batch.batchNumber,
    strain: batch.strain,
    plantCount: batch.batchPlants.length,
    plantIdentifiers: batch.batchPlants.map(bp => bp.plant.identifier),
    sourceWeightG: batch.totalWeight,
  };

  const checklistSummary = checklistTemplates.map(t => ({
    id: t.id,
    title: t.title,
    category: t.category,
    roleRequired: t.roleRequired,
    checklistItems: Array.isArray(t.checklist) ? t.checklist.length : 0,
  }));

  const data = {
    recordNumber: `BCR-${batch.batchNumber}`,
    euGmpControls: BCR_CONTROLS,
    sourceSummary,
    checklistSummary,
    dailyChecks: { required: true, source: 'cultivation SOP forms', status: 'PENDING_EVIDENCE' },
    environmentalLogs: { required: true, source: 'temperature/humidity checks', status: 'PENDING_EVIDENCE' },
    deviations: deviations.map(d => ({ id: d.id, description: d.description, severity: d.severity })),
    signatures: [],
    batchId: batch.id,
    tenantId,
    facilityId: batch.facilityId,
    createdById: userId,
  };

  const record = batch.cultivationRecord
    ? await prisma.batchCultivationRecord.update({ where: { id: batch.cultivationRecord.id }, data })
    : await prisma.batchCultivationRecord.create({ data });

  const openTicket = await prisma.ticket.findFirst({
    where: {
      tenantId,
      batchId: batch.id,
      ticketType: 'BCR_REVIEW',
      status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
    },
  });

  if (!openTicket) {
    await prisma.ticket.create({
      data: {
        title: `BCR review required: ${batch.batchNumber}`,
        description: [
          `Batch Cultivation Record created for ${batch.batchNumber}.`,
          `EU GMP controls: ${BCR_CONTROLS.join(', ')}`,
          `Linked checklists: ${checklistSummary.length}`,
          `Open deviations: ${deviations.length}`,
          `Mortality records in scope: ${mortality.length}`,
          `Labels in scope: ${batch.labelRecords.length}`,
        ].join('\n'),
        priority: deviations.length || mortality.length ? 'HIGH' : 'MEDIUM',
        ticketType: 'BCR_REVIEW',
        category: 'COMPLIANCE_APPROVAL',
        workflowStage: 'STORE_QA',
        batchId: batch.id,
        reportedById: userId,
        assignedToRole: 'QA_INSPECTOR',
        tenantId,
      },
    });
  }

  eventBus.emit('BCR_SYNCED', {
    userId,
    tenantId,
    entityType: 'BatchCultivationRecord',
    entityId: record.id,
    batchId: batch.id,
    mortalityCount: mortality.length,
    deviationsCount: deviations.length,
  });

  return { ...record, mortalitySummary: mortality };
}
