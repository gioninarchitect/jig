import { prisma } from '../config/db';
import { BatchStatus, COAStatus, AnomalyType, SeverityLevel } from '@prisma/client';
import { eventBus } from './eventBus';
import { ensureBatchCultivationRecord } from './bcr.service';
import { issueLabel } from './label-governance.service';

// Generate batch number: STRAIN-MOTHER-DDMM
// e.g. DP-M01-0103 (Durban Poison, Mother M01, cloned 1 March)
// If duplicate: DP-M01-0103b, DP-M01-0103c
async function generateBatchNumber(strain: string, tenantId: string, cloneDate?: Date, motherIdentifier?: string): Promise<string> {
  const abbrev = strain.split(' ').map(w => w.charAt(0).toUpperCase()).join('').substring(0, 3);
  const mother = motherIdentifier || 'XX';
  const d = cloneDate || new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const base = `${abbrev}-${mother}-${dateStr}`;
  const existing = await prisma.batch.count({ where: { tenantId, batchNumber: { startsWith: base } } });

  return existing === 0 ? base : `${base}${String.fromCharCode(97 + existing)}`; // a, b, c...
}

export async function createBatch(data: {
  plantIds: string[];
  tenantId: string;
  userId: string;
}) {
  if (!data.plantIds.length) throw Object.assign(new Error('At least one plant required'), { status: 400 });

  const plants = await prisma.plant.findMany({
    where: { id: { in: data.plantIds }, tenantId: data.tenantId },
  });

  if (plants.length !== data.plantIds.length) {
    throw Object.assign(new Error('Some plants not found'), { status: 404 });
  }

  // Validate: same strain, same facility, all HARVESTED or later
  const strains = new Set(plants.map(p => p.strain));
  if (strains.size > 1) throw Object.assign(new Error('All plants must be the same strain'), { status: 400 });

  const facilities = new Set(plants.map(p => p.facilityId));
  if (facilities.size > 1) throw Object.assign(new Error('All plants must be from the same facility'), { status: 400 });

  const harvestPhases = ['HARVESTED', 'DRYING', 'CURING', 'PROCESSING', 'PACKAGED'];
  const nonHarvested = plants.filter(p => !harvestPhases.includes(p.phase));
  if (nonHarvested.length > 0) {
    throw Object.assign(new Error(`Plants must be HARVESTED or later. Found: ${nonHarvested.map(p => `${p.identifier}(${p.phase})`).join(', ')}`), { status: 400 });
  }

  const totalWeight = plants.reduce((sum, p) => {
    const w = p.weightsJson as any;
    return sum + (w?.HARVESTED || 0);
  }, 0);

  // Try to find clone date + mother + purpose from the plant's clone record
  let cloneDate: Date | undefined;
  let motherIdentifier: string | undefined;
  const clone = await prisma.clone.findFirst({
    where: { plantId: plants[0].id },
    include: { cloneTray: { select: { cloneDate: true, motherPlant: { select: { identifier: true } } } } },
  });
  if (clone?.cloneTray?.cloneDate) cloneDate = clone.cloneTray.cloneDate;
  if (clone?.motherIdentifier) motherIdentifier = clone.motherIdentifier;

  const batchNumber = await generateBatchNumber(plants[0].strain, data.tenantId, cloneDate, motherIdentifier);

  const batch = await prisma.batch.create({
    data: {
      batchNumber,
      strain: plants[0].strain,
      status: BatchStatus.ACTIVE,
      totalWeight,
      tenantId: data.tenantId,
      facilityId: plants[0].facilityId,
    },
  });

  // Link plants
  await prisma.batchPlant.createMany({
    data: data.plantIds.map(plantId => ({ batchId: batch.id, plantId })),
  });

  // ANOMALY RULE: YIELD_DEVIATION — compare batch yield to strain average
  const strainBatches = await prisma.batch.findMany({
    where: { strain: plants[0].strain, tenantId: data.tenantId, id: { not: batch.id } },
    select: { totalWeight: true },
  });
  if (strainBatches.length >= 2) {
    const avgWeight = strainBatches.reduce((s, b) => s + b.totalWeight, 0) / strainBatches.length;
    const avgPerPlant = avgWeight / (data.plantIds.length || 1);
    const thisPerPlant = totalWeight / data.plantIds.length;
    if (avgPerPlant > 0) {
      const deviation = Math.abs(thisPerPlant - avgPerPlant) / avgPerPlant;
      if (deviation > 0.20) {
        await prisma.anomaly.create({
          data: {
            type: AnomalyType.YIELD_DEVIATION,
            severity: deviation > 0.40 ? SeverityLevel.HIGH : SeverityLevel.MEDIUM,
            description: `Batch ${batch.batchNumber} yield ${(deviation * 100).toFixed(0)}% ${thisPerPlant < avgPerPlant ? 'below' : 'above'} strain average (${thisPerPlant.toFixed(0)}g/plant vs ${avgPerPlant.toFixed(0)}g/plant avg for ${plants[0].strain})`,
            entityType: 'Batch', entityId: batch.id, tenantId: data.tenantId,
          },
        });
        const seniors = await prisma.user.findMany({ where: { tenantId: data.tenantId, role: { in: ['FACILITY_MANAGER'] }, active: true }, select: { id: true } });
        await prisma.notification.createMany({ data: seniors.map(u => ({ userId: u.id, title: `YIELD: ${batch.batchNumber}`, message: `${(deviation * 100).toFixed(0)}% deviation from strain average`, link: `/batches/${batch.id}` })) });
      }
    }
  }

  // ANOMALY RULE: DESTRUCTION_RATE — check facility destruction rate
  const facilityDestructions = await prisma.destructionEvent.count({ where: { facilityId: plants[0].facilityId } });
  const facilityBatches = await prisma.batch.count({ where: { facilityId: plants[0].facilityId } });
  if (facilityBatches > 5) {
    const destructionRate = facilityDestructions / facilityBatches;
    if (destructionRate > 0.3) { // > 30% of batches destroyed = concerning
      const existing = await prisma.anomaly.findFirst({ where: { type: AnomalyType.DESTRUCTION_RATE, tenantId: data.tenantId, resolvedAt: null } });
      if (!existing) {
        await prisma.anomaly.create({
          data: {
            type: AnomalyType.DESTRUCTION_RATE,
            severity: destructionRate > 0.5 ? SeverityLevel.CRITICAL : SeverityLevel.HIGH,
            description: `Facility destruction rate at ${(destructionRate * 100).toFixed(0)}% (${facilityDestructions} destructions / ${facilityBatches} batches)`,
            entityType: 'Facility', entityId: plants[0].facilityId, tenantId: data.tenantId,
          },
        });
      }
    }
  }

  eventBus.emit('BATCH_CREATED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Batch', entityId: batch.id,
    batchId: batch.id, plantIds: data.plantIds, totalWeight,
  });

  await issueLabel({
    labelType: 'BATCH',
    entityType: 'Batch',
    entityId: batch.id,
    entityName: batch.batchNumber,
    batchId: batch.id,
    tenantId: data.tenantId,
    userId: data.userId,
  });

  await ensureBatchCultivationRecord(batch.id, data.tenantId, data.userId);

  return batch;
}

export async function listBatches(query: {
  tenantId: string;
  status?: string;
  coaStatus?: string;
  facilityId?: string;
  strain?: string;
}) {
  const where: any = { tenantId: query.tenantId };
  if (query.status) where.status = query.status;
  if (query.coaStatus) where.coaStatus = query.coaStatus;
  if (query.facilityId) where.facilityId = query.facilityId;
  if (query.strain) where.strain = { contains: query.strain, mode: 'insensitive' };

  return prisma.batch.findMany({
    where,
    include: {
      _count: { select: { batchPlants: true, labResults: true } },
      coas: { where: { valid: true }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBatch(id: string, tenantId: string) {
  const batch = await prisma.batch.findFirst({
    where: { id, tenantId },
    include: {
      facility: true,
      batchPlants: { include: { plant: { select: { id: true, identifier: true, strain: true, phase: true, weightsJson: true } } } },
      labResults: { include: { testedBy: { select: { id: true, name: true } } }, orderBy: { testedAt: 'desc' } },
      coas: true,
      containers: { include: { events: { orderBy: { timestamp: 'desc' }, take: 1 } } },
      childBatches: { select: { id: true, batchNumber: true, status: true, totalWeight: true } },
      parentBatch: { select: { id: true, batchNumber: true } },
      cultivationRecord: true,
      labelRecords: { orderBy: { issuedAt: 'desc' }, take: 50 },
    },
  });
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });
  return batch;
}

export async function getChainOfCustody(id: string, tenantId: string) {
  const batch = await prisma.batch.findFirst({ where: { id, tenantId } });
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

  // All container events for containers linked to this batch
  const events = await prisma.containerEvent.findMany({
    where: { container: { batchId: id } },
    include: {
      container: { select: { containerId: true, containerType: true } },
      fromZone: { select: { name: true } },
      toZone: { select: { name: true } },
      outgoingHandler: { select: { name: true } },
      incomingHandler: { select: { name: true } },
    },
    orderBy: { timestamp: 'asc' },
  });

  return { batch: { id: batch.id, batchNumber: batch.batchNumber, strain: batch.strain }, events };
}

export async function splitBatch(id: string, data: {
  weights: number[];
  tenantId: string;
  userId: string;
}) {
  const batch = await prisma.batch.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

  const totalSplit = data.weights.reduce((a, b) => a + b, 0);
  if (Math.abs(totalSplit - batch.totalWeight) > 0.5) {
    throw Object.assign(new Error(`Split weights (${totalSplit}g) must equal batch weight (${batch.totalWeight}g)`), { status: 400 });
  }

  const children = [];
  for (const weight of data.weights) {
    const child = await prisma.batch.create({
      data: {
        batchNumber: await generateBatchNumber(batch.strain, data.tenantId),
        strain: batch.strain,
        status: batch.status,
        totalWeight: weight,
        parentBatchId: batch.id,
        tenantId: data.tenantId,
        facilityId: batch.facilityId,
      },
    });
    children.push(child);
  }

  eventBus.emit('BATCH_SPLIT', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Batch', entityId: id,
    childIds: children.map(c => c.id),
  });

  return children;
}

export async function mergeBatches(data: {
  batchIds: string[];
  tenantId: string;
  userId: string;
}) {
  const batches = await prisma.batch.findMany({
    where: { id: { in: data.batchIds }, tenantId: data.tenantId },
  });

  if (batches.length !== data.batchIds.length) throw Object.assign(new Error('Some batches not found'), { status: 404 });

  const strains = new Set(batches.map(b => b.strain));
  if (strains.size > 1) throw Object.assign(new Error('Can only merge batches of the same strain'), { status: 400 });

  const facilities = new Set(batches.map(b => b.facilityId));
  if (facilities.size > 1) throw Object.assign(new Error('Can only merge batches from the same facility'), { status: 400 });

  const totalWeight = batches.reduce((sum, b) => sum + b.totalWeight, 0);

  const merged = await prisma.batch.create({
    data: {
      batchNumber: await generateBatchNumber(batches[0].strain, data.tenantId),
      strain: batches[0].strain,
      status: BatchStatus.ACTIVE,
      totalWeight,
      tenantId: data.tenantId,
      facilityId: batches[0].facilityId,
    },
  });

  // Re-parent child batches
  await prisma.batch.updateMany({
    where: { id: { in: data.batchIds } },
    data: { parentBatchId: merged.id },
  });

  eventBus.emit('BATCH_MERGED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Batch', entityId: merged.id,
    sourceIds: data.batchIds,
  });

  return merged;
}

export async function updateStatus(id: string, data: {
  status: BatchStatus;
  tenantId: string;
  userId: string;
}) {
  const batch = await prisma.batch.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

  const updated = await prisma.batch.update({
    where: { id },
    data: { status: data.status },
  });

  eventBus.emit('BATCH_STATUS_CHANGED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Batch', entityId: id,
    before: { status: batch.status }, after: { status: data.status },
  });

  return updated;
}
