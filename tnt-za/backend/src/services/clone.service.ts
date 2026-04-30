import { prisma } from '../config/db';
import { eventBus } from './eventBus';

// Auto-create individual clone records when tray is created (no staff action needed)
export async function createIndividualClones(data: {
  cloneTrayId: string; motherIdentifier: string; strain: string;
  totalCuttings: number; cloneBoxId?: string; tenantId: string;
}) {
  const clones = [];
  for (let i = 1; i <= data.totalCuttings; i++) {
    const cloneId = `${data.motherIdentifier}-${String(i).padStart(2, '0')}`;
    const clone = await prisma.clone.create({
      data: {
        cloneId, motherIdentifier: data.motherIdentifier,
        sequenceNumber: i, strain: data.strain,
        cloneBoxId: data.cloneBoxId, cloneTrayId: data.cloneTrayId,
        tenantId: data.tenantId,
      },
    });
    clones.push(clone);
  }
  return clones;
}

// List clones for a tray
export async function listClonesForTray(cloneTrayId: string) {
  return prisma.clone.findMany({ where: { cloneTrayId }, orderBy: { sequenceNumber: 'asc' } });
}

// List clones by mother
export async function listClonesForMother(motherIdentifier: string, tenantId: string) {
  return prisma.clone.findMany({ where: { motherIdentifier, tenantId }, orderBy: { createdAt: 'desc' } });
}

// SMART: Bulk root check — staff just ticks "day 7 checked" for the whole tray
export async function bulkRootCheck(cloneTrayId: string, day: 7 | 14) {
  const field = day === 7 ? 'rootCheckDay7' : 'rootCheckDay14';
  await prisma.clone.updateMany({ where: { cloneTrayId, status: 'ROOTING' }, data: { [field]: true } });
  return { updated: true, day };
}

// SMART: At transplant, staff enters "X survived, Y died"
// System auto-marks the first X as ROOTED, last Y as CULLED
export async function processTransplantCount(data: {
  cloneTrayId: string; survivedCount: number; deathCause: string;
  tenantId: string; userId: string;
}) {
  const clones = await prisma.clone.findMany({
    where: { cloneTrayId: data.cloneTrayId, status: 'ROOTING' },
    orderBy: { sequenceNumber: 'asc' },
  });

  const survived = clones.slice(0, data.survivedCount);
  const died = clones.slice(data.survivedCount);

  // Mark survivors as ROOTED
  for (const c of survived) {
    await prisma.clone.update({ where: { id: c.id }, data: { status: 'ROOTED', healthStatus: 'HEALTHY', rootsVisible: true } });
  }

  // Mark dead ones as CULLED with cause
  for (const c of died) {
    await prisma.clone.update({
      where: { id: c.id },
      data: { status: 'CULLED', healthStatus: 'DEAD', deathDate: new Date(), deathCause: data.deathCause },
    });
  }

  // Update tray counts
  await prisma.cloneTray.update({
    where: { id: data.cloneTrayId },
    data: { rooted: survived.length, mortality: died.length, status: 'ROOTED', rootedDate: new Date() },
  });

  // Bulk mortality record + destruction ticket for the dead ones
  if (died.length > 0) {
    const tray = await prisma.cloneTray.findUnique({
      where: { id: data.cloneTrayId },
      include: { motherPlant: { select: { identifier: true } } },
    });

    // Mortality record
    await prisma.mortalityRecord.create({
      data: {
        entityType: 'CLONE', cloneTrayId: data.cloneTrayId,
        strain: tray?.strain || '', quantity: died.length,
        causeCategory: data.deathCause,
        causeDetail: `${died.length} clones from tray ${tray?.trayNumber} did not survive rooting`,
        reportedById: data.userId, tenantId: data.tenantId,
      },
    });

    // Auto-create DESTRUCTION ticket — culled clones must go through destruction SOP
    const cloneIds = died.map(c => c.cloneId).join(', ');
    await prisma.ticket.create({
      data: {
        title: `DESTRUCTION REQUIRED — ${died.length} culled clones from ${tray?.trayNumber}`,
        description: `${died.length} clones did not survive rooting and must be destroyed per SOP.\n\nTray: ${tray?.trayNumber}\nMother: ${tray?.motherPlant?.identifier || '?'}\nStrain: ${tray?.strain}\nCause: ${data.deathCause}\nClone IDs: ${cloneIds}\n\nRequires: FM authorization + SAPS witness for destruction.`,
        priority: 'HIGH',
        ticketType: 'APPROVAL',
        category: 'COMPLIANCE_APPROVAL',
        workflowStage: 'PROPAGATION',
        reportedById: data.userId,
        tenantId: data.tenantId,
      },
    });
  }

  return { survived: survived.length, died: died.length, cloneIds: survived.map(c => c.id) };
}

// SMART: Transplant to bay — auto-activates clone IDs + creates plant records
export async function transplantToBay(data: {
  cloneTrayId: string; bayId: string; greenhouseId: string;
  tenantId: string; userId: string; facilityId: string;
}) {
  const rooted = await prisma.clone.findMany({
    where: { cloneTrayId: data.cloneTrayId, status: 'ROOTED' },
    orderBy: { sequenceNumber: 'asc' },
  });

  const transplanted = [];
  for (const clone of rooted) {
    // Create plant record — clone ID becomes active
    const plantCount = await prisma.plant.count({ where: { tenantId: data.tenantId } });
    const identifier = `ZA-${String(plantCount + 1).padStart(6, '0')}`;

    // Find a grow zone for the facility
    const zone = await prisma.zone.findFirst({ where: { facilityId: data.facilityId, zoneType: 'GROW' } });
    const plant = await prisma.plant.create({
      data: {
        identifier, strain: clone.strain, phase: 'VEGETATIVE', status: 'ACTIVE',
        tenantId: data.tenantId, facilityId: data.facilityId, zoneId: zone?.id || '', handlerId: data.userId,
      },
    });

    await prisma.clone.update({
      where: { id: clone.id },
      data: { status: 'TRANSPLANTED', transplantDate: new Date(), bayId: data.bayId, greenhouseId: data.greenhouseId, plantId: plant.id },
    });

    transplanted.push({ cloneId: clone.cloneId, plantId: plant.identifier });
  }

  // Update tray
  const tray = await prisma.cloneTray.findUnique({
    where: { id: data.cloneTrayId },
    include: { motherPlant: { select: { identifier: true } } },
  });
  await prisma.cloneTray.update({
    where: { id: data.cloneTrayId },
    data: { status: 'TRANSPLANTED', transplantDate: new Date() },
  });

  // AUTO-CREATE BATCH — survivors from this clone tray = the batch
  // Batch number: STRAIN-MOTHER-CLONEDATE
  const strain = tray?.strain || '';
  const abbrev = strain.split(' ').map((w: string) => w.charAt(0).toUpperCase()).join('').substring(0, 3);
  const mother = tray?.motherPlant?.identifier || 'XX';
  const cd = tray?.cloneDate || new Date();
  const dateStr = `${cd.getFullYear()}${String(cd.getMonth() + 1).padStart(2, '0')}${String(cd.getDate()).padStart(2, '0')}`;
  const batchPrefix = `${abbrev}-${mother}-${dateStr}`;
  const existingBatches = await prisma.batch.count({ where: { tenantId: data.tenantId, batchNumber: { startsWith: batchPrefix } } });
  const batchNumber = existingBatches === 0 ? batchPrefix : `${batchPrefix}${String.fromCharCode(97 + existingBatches)}`;

  const batch = await prisma.batch.create({
    data: {
      batchNumber,
      strain,
      status: 'ACTIVE',
      totalWeight: 0, // weight added at harvest
      tenantId: data.tenantId,
      facilityId: data.facilityId,
    },
  });

  // Link all transplanted plants to the batch
  await prisma.batchPlant.createMany({
    data: transplanted.map(t => ({ batchId: batch.id, plantId: t.plantId })),
  });

  // Update bay with batch ID
  await prisma.bay.update({
    where: { id: data.bayId },
    data: { currentBatchId: batch.id },
  });

  // Allocate bay
  for (let i = 0; i < transplanted.length; i++) {
    const line = Math.floor(i / 2) + 1;
    const pos = (i % 2) + 1;
    await prisma.bayAllocation.create({
      data: {
        bayId: data.bayId, plantId: transplanted[i].plantId,
        strain: tray?.strain || '', lineNumber: line, position: pos,
        allocatedBy: data.userId,
      },
    });
  }

  // Update bay status
  const bay = await prisma.bay.findUnique({ where: { id: data.bayId } });
  await prisma.bay.update({
    where: { id: data.bayId },
    data: {
      status: transplanted.length >= (bay?.capacity || 8) ? 'FULL' : 'PARTIAL',
      currentStrain: tray?.strain, allocatedAt: new Date(), daysInPhase: 0,
    },
  });

  eventBus.emit('CLONES_TRANSPLANTED', { userId: data.userId, tenantId: data.tenantId, count: transplanted.length, bayId: data.bayId, batchId: batch.id });
  return { transplanted: transplanted.length, plants: transplanted, batch: { id: batch.id, batchNumber: batch.batchNumber } };
}

// Stats
export async function getCloneStats(cloneTrayId: string) {
  const clones = await prisma.clone.findMany({ where: { cloneTrayId } });
  return {
    total: clones.length,
    rooting: clones.filter(c => c.status === 'ROOTING').length,
    rooted: clones.filter(c => c.status === 'ROOTED').length,
    transplanted: clones.filter(c => c.status === 'TRANSPLANTED').length,
    culled: clones.filter(c => c.status === 'CULLED' || c.status === 'DEAD').length,
    deathCauses: clones.filter(c => c.deathCause).reduce((acc, c) => {
      acc[c.deathCause!] = (acc[c.deathCause!] || 0) + 1; return acc;
    }, {} as Record<string, number>),
  };
}
