import { prisma } from '../config/db';
import { BayStatus, MotherStatus, CloneTrayStatus } from '@prisma/client';
import { eventBus } from './eventBus';
import { createIndividualClones } from './clone.service';

// ── GREENHOUSES ──

export async function listGreenhouses(tenantId: string) {
  return prisma.greenhouse.findMany({
    where: { tenantId, active: true },
    include: {
      bays: {
        orderBy: { name: 'asc' },
        include: { _count: { select: { allocations: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createGreenhouse(data: {
  name: string; type: string; totalBays: number;
  rows?: number; spotsPerRow?: number;
  facilityId: string; tenantId: string; userId: string;
}) {
  const rows = Math.max(1, Math.min(20, Number(data.rows) || 4));
  const spotsPerRow = Math.max(1, Math.min(500, Number(data.spotsPerRow) || 130));
  const capacity = rows * spotsPerRow;

  const gh = await prisma.greenhouse.create({
    data: { name: data.name, type: data.type as any, totalBays: data.totalBays, facilityId: data.facilityId, tenantId: data.tenantId },
  });

  for (let i = 1; i <= data.totalBays; i++) {
    const bay = await prisma.bay.create({
      data: { name: `Bay ${i}`, greenhouseId: gh.id, lines: rows, capacity },
    });

    for (let row = 1; row <= rows; row++) {
      for (let pos = 1; pos <= spotsPerRow; pos++) {
        await prisma.baySpot.create({
          data: {
            spotId: `B${i}-R${row}P${pos}`,
            row, position: pos, bayId: bay.id,
          },
        });
      }
    }
  }

  eventBus.emit('GREENHOUSE_CREATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'Greenhouse', entityId: gh.id });
  return gh;
}

export async function updateGreenhouse(id: string, data: {
  name?: string; type?: string; totalBays?: number;
  tenantId: string; userId: string;
}) {
  const gh = await prisma.greenhouse.findFirst({
    where: { id, tenantId: data.tenantId },
    include: { bays: { include: { _count: { select: { allocations: true, spots: true } } } } },
  });
  if (!gh) throw Object.assign(new Error('Greenhouse not found'), { status: 404 });

  const patch: any = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.type !== undefined) patch.type = data.type;

  // Handle bay count change, preserving existing bays and their data
  if (data.totalBays !== undefined && data.totalBays !== gh.totalBays) {
    const delta = data.totalBays - gh.totalBays;
    if (delta > 0) {
      // Expand — add new bays matching existing layout (pull lines/capacity from first bay if possible)
      const ref = gh.bays[0];
      const rows = ref?.lines ?? 4;
      const capacity = ref?.capacity ?? rows * 130;
      const spotsPerRow = rows > 0 ? Math.round(capacity / rows) : 1;

      for (let i = gh.bays.length + 1; i <= data.totalBays; i++) {
        const newBay = await prisma.bay.create({
          data: { name: `Bay ${i}`, greenhouseId: gh.id, lines: rows, capacity },
        });
        for (let row = 1; row <= rows; row++) {
          for (let pos = 1; pos <= spotsPerRow; pos++) {
            await prisma.baySpot.create({
              data: { spotId: `B${i}-R${row}P${pos}`, row, position: pos, bayId: newBay.id },
            });
          }
        }
      }
    } else {
      // Shrink — only allow if the bays being dropped are empty.
      const dropCount = Math.abs(delta);
      const dropTargets = [...gh.bays].sort((a, b) => b.name.localeCompare(a.name)).slice(0, dropCount);
      const dirty = dropTargets.find(b => b._count.allocations > 0);
      if (dirty) {
        throw Object.assign(
          new Error(`Cannot shrink: ${dirty.name} still holds plants. Harvest / clear it first.`),
          { status: 409 },
        );
      }
      for (const b of dropTargets) {
        await prisma.baySpot.deleteMany({ where: { bayId: b.id } });
        await prisma.bay.delete({ where: { id: b.id } });
      }
    }
    patch.totalBays = data.totalBays;
  }

  const updated = await prisma.greenhouse.update({ where: { id }, data: patch });
  eventBus.emit('GREENHOUSE_UPDATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'Greenhouse', entityId: id });
  return updated;
}

export async function deleteGreenhouse(id: string, tenantId: string, userId: string) {
  const gh = await prisma.greenhouse.findFirst({
    where: { id, tenantId },
    include: { bays: { include: { _count: { select: { allocations: true } } } } },
  });
  if (!gh) throw Object.assign(new Error('Greenhouse not found'), { status: 404 });

  const activeAllocations = gh.bays.reduce((sum, b) => sum + b._count.allocations, 0);
  if (activeAllocations > 0) {
    // Soft-archive — preserves referential integrity for historical plant/batch lookups
    const archived = await prisma.greenhouse.update({ where: { id }, data: { active: false } });
    eventBus.emit('GREENHOUSE_ARCHIVED', { userId, tenantId, entityType: 'Greenhouse', entityId: id });
    return { ...archived, archived: true, reason: 'Still has active plant allocations — archived instead of deleted.' };
  }

  // Hard delete — empty greenhouse, cascade bays + spots
  for (const b of gh.bays) {
    await prisma.baySpot.deleteMany({ where: { bayId: b.id } });
    await prisma.bayAllocation.deleteMany({ where: { bayId: b.id } });
    await prisma.bay.delete({ where: { id: b.id } });
  }
  await prisma.greenhouse.delete({ where: { id } });
  eventBus.emit('GREENHOUSE_DELETED', { userId, tenantId, entityType: 'Greenhouse', entityId: id });
  return { id, deleted: true };
}

// ── BAYS ──

export async function getBays(greenhouseId: string) {
  return prisma.bay.findMany({
    where: { greenhouseId },
    include: {
      allocations: {
        where: { removedAt: null },
        orderBy: [{ lineNumber: 'asc' }, { position: 'asc' }],
      },
      _count: { select: { allocations: true, spots: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getBayDetail(bayId: string) {
  return prisma.bay.findUnique({
    where: { id: bayId },
    include: {
      greenhouse: true,
      spots: { orderBy: [{ row: 'asc' }, { position: 'asc' }] },
      allocations: {
        where: { removedAt: null },
        orderBy: [{ lineNumber: 'asc' }, { position: 'asc' }],
      },
    },
  });
}

export async function allocateBay(data: {
  bayId: string; plantIds: string[]; strain: string; batchId?: string;
  tenantId: string; userId: string;
}) {
  const bay = await prisma.bay.findUnique({ where: { id: data.bayId } });
  if (!bay) throw Object.assign(new Error('Bay not found'), { status: 404 });

  const allocations = [];
  let line = 1, pos = 1;
  for (const plantId of data.plantIds) {
    const alloc = await prisma.bayAllocation.create({
      data: {
        bayId: data.bayId, plantId, strain: data.strain,
        lineNumber: line, position: pos, allocatedBy: data.userId,
      },
    });
    allocations.push(alloc);
    pos++;
    if (pos > 2) { pos = 1; line++; }
  }

  // Update bay status
  const count = data.plantIds.length;
  await prisma.bay.update({
    where: { id: data.bayId },
    data: {
      status: count >= bay.capacity ? BayStatus.FULL : BayStatus.PARTIAL,
      currentStrain: data.strain,
      currentBatchId: data.batchId || null,
      allocatedAt: new Date(),
      daysInPhase: 0,
    },
  });

  eventBus.emit('BAY_ALLOCATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'Bay', entityId: data.bayId, plantCount: count });
  return allocations;
}

export async function clearBay(bayId: string, userId: string, tenantId: string) {
  const bay = await prisma.bay.findUnique({
    where: { id: bayId },
    include: { greenhouse: { select: { name: true, id: true } } },
  });
  if (!bay) throw Object.assign(new Error('Bay not found'), { status: 404 });

  await prisma.bayAllocation.updateMany({
    where: { bayId, removedAt: null },
    data: { removedAt: new Date() },
  });
  await prisma.bay.update({
    where: { id: bayId },
    data: { status: BayStatus.EMPTY, currentStrain: null, currentBatchId: null, currentPhase: null, daysInPhase: 0 },
  });

  // Post-harvest deep-clean task — GACP requirement before the bay can be repopulated.
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 2);
  await prisma.task.create({
    data: {
      title: `Deep clean ${bay.greenhouse?.name ?? ''} · ${bay.name} (post-harvest)`,
      category: 'DEEP_CLEAN',
      priority: 'HIGH',
      status: 'PENDING',
      assignedToId: userId,      // defaults to the person who cleared — can be reassigned
      assignerId: userId,
      bayId: bay.id,
      greenhouseId: bay.greenhouseId,
      dueDate,
      notes: 'Auto-generated on bay clear. SOP 8-CLN · post-harvest room turnaround (wash down, sanitise, biosecurity check, sign-off by QA before repopulation).',
      tenantId,
    },
  });

  eventBus.emit('BAY_CLEARED', { userId, tenantId, entityType: 'Bay', entityId: bayId });
  eventBus.emit('DEEP_CLEAN_DUE', { userId, tenantId, entityType: 'Bay', entityId: bayId });
}

// Triggered when the Cultivation Manager flags a bay as ready to harvest —
// auto-generates the paper-equivalent Harvest Request pre-populated from bay state.
export async function requestHarvestForBay(bayId: string, data: {
  reasonForHarvest?: string;
  expectedHarvestDate?: string;
  expectedYieldPerPlantG?: number;
  tenantId: string;
  userId: string;
  userName?: string;
}) {
  const bay = await prisma.bay.findUnique({
    where: { id: bayId },
    include: {
      greenhouse: { select: { name: true } },
      allocations: { where: { removedAt: null } },
    },
  });
  if (!bay) throw Object.assign(new Error('Bay not found'), { status: 404 });
  if (bay.status === BayStatus.EMPTY) {
    throw Object.assign(new Error('Bay is empty — nothing to harvest'), { status: 400 });
  }

  // Pull strain baseline if we can resolve the strain by name
  let strainId: string | null = null;
  let strainBaselineG: number | null = null;
  if (bay.currentStrain) {
    const strain = await prisma.strain.findFirst({
      where: { tenantId: data.tenantId, name: bay.currentStrain },
      select: { id: true, expectedYield: true },
    });
    if (strain) {
      strainId = strain.id;
      strainBaselineG = strain.expectedYield ?? null;
    }
  }

  const perPlantG = data.expectedYieldPerPlantG ?? strainBaselineG ?? undefined;
  const plants = bay.allocations.length || 0;
  const expectedYieldKg = perPlantG && plants ? (perPlantG * plants) / 1000 : undefined;

  const existing = await prisma.harvestRequest.findFirst({
    where: { tenantId: data.tenantId, bay: bay.name, status: { in: ['REQUESTED', 'APPROVED'] } },
  });
  if (existing) {
    throw Object.assign(new Error(`Harvest request already open for ${bay.name} (${existing.status})`), { status: 409 });
  }

  const request = await prisma.harvestRequest.create({
    data: {
      batchNo: bay.currentBatchId?.slice(0, 8) ?? `${bay.name}-${Date.now().toString(36).slice(-4)}`,
      strainId: strainId ?? 'UNKNOWN',
      floweringStartDate: bay.allocatedAt ?? new Date(),
      batchSizePlants: plants,
      greenhouse: bay.greenhouse?.name ?? '',
      bay: bay.name,
      reasonForHarvest: data.reasonForHarvest ?? 'Ready for harvest — auto-triggered from BayGrid',
      requestedBy: data.userId,
      requestedByName: data.userName,
      requestedDate: new Date(),
      expectedYieldPerPlantG: perPlantG,
      expectedYieldKg: expectedYieldKg as any,
      expectedHarvestDate: data.expectedHarvestDate ? new Date(data.expectedHarvestDate) : undefined,
      tenantId: data.tenantId,
    },
  });

  eventBus.emit('HARVEST_REQUESTED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'HarvestRequest', entityId: request.id,
  });
  return request;
}

// ── MOTHER PLANTS ──

export async function listMothers(tenantId: string) {
  return prisma.motherPlant.findMany({
    where: { tenantId },
    include: { cloneTrays: { orderBy: { cloneDate: 'desc' }, take: 5 } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMother(id: string, tenantId: string) {
  const mother = await prisma.motherPlant.findFirst({
    where: { id, tenantId },
    include: {
      cloneTrays: { orderBy: { cloneDate: 'desc' } },
    },
  });
  if (!mother) throw Object.assign(new Error('Mother plant not found'), { status: 404 });
  return mother;
}

export async function createMother(data: {
  identifier: string; strain: string; source: string; breeder?: string;
  facilityId: string; tenantId: string; userId: string;
}) {
  const mother = await prisma.motherPlant.create({
    data: {
      identifier: data.identifier, strain: data.strain, source: data.source,
      breeder: data.breeder, facilityId: data.facilityId, tenantId: data.tenantId,
    },
  });
  eventBus.emit('MOTHER_REGISTERED', { userId: data.userId, tenantId: data.tenantId, entityType: 'MotherPlant', entityId: mother.id });
  return mother;
}

export async function updateMotherStatus(id: string, status: MotherStatus, userId: string, tenantId: string) {
  const mother = await prisma.motherPlant.update({ where: { id }, data: { status } });
  eventBus.emit('MOTHER_STATUS_CHANGED', { userId, tenantId, entityType: 'MotherPlant', entityId: id, status });
  return mother;
}

// ── CLONE TRAYS ──

export async function createCloneTray(data: {
  motherPlantId: string; strain: string; totalCuttings: number;
  tenantId: string; userId: string;
}) {
  const count = await prisma.cloneTray.count({ where: { tenantId: data.tenantId } });
  const trayNumber = `CT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

  const tray = await prisma.cloneTray.create({
    data: {
      trayNumber, strain: data.strain, totalCuttings: data.totalCuttings,
      motherPlantId: data.motherPlantId, createdById: data.userId, tenantId: data.tenantId,
    },
  });

  // Update mother clone count
  await prisma.motherPlant.update({
    where: { id: data.motherPlantId },
    data: { totalClones: { increment: data.totalCuttings } },
  });

  // Auto-create individual clone records (M01-01, M01-02, etc.)
  const mother = await prisma.motherPlant.findUnique({ where: { id: data.motherPlantId } });
  if (mother) {
    await createIndividualClones({
      cloneTrayId: tray.id, motherIdentifier: mother.identifier,
      strain: data.strain, totalCuttings: data.totalCuttings,
      tenantId: data.tenantId,
    });
  }

  eventBus.emit('CLONE_TRAY_CREATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'CloneTray', entityId: tray.id });
  return tray;
}

export async function updateCloneTray(id: string, data: { rooted?: number; mortality?: number; status?: CloneTrayStatus; userId: string }) {
  const updates: any = {};
  if (data.rooted !== undefined) updates.rooted = data.rooted;
  if (data.mortality !== undefined) updates.mortality = data.mortality;
  if (data.status) {
    updates.status = data.status;
    if (data.status === 'ROOTED') updates.rootedDate = new Date();
    if (data.status === 'TRANSPLANTED') updates.transplantDate = new Date();
  }
  return prisma.cloneTray.update({ where: { id }, data: updates });
}

export async function listCloneTrays(tenantId: string) {
  return prisma.cloneTray.findMany({
    where: { tenantId },
    include: {
      motherPlant: { select: { identifier: true, strain: true, status: true } },
      _count: { select: { clones: true } },
    },
    orderBy: { cloneDate: 'desc' },
  });
}

// ── TICKETS ──

// Role → which workflow stages they see
const ROLE_STAGES: Record<string, string[]> = {
  CULTIVATOR: ['PROPAGATION', 'VEGETATIVE', 'FLOWERING', 'HARVEST'],
  // NURSERY_MANAGER — see management chain below (all stages)
  IRRIGATION_TECH: ['VEGETATIVE', 'FLOWERING'],
  PROCESSING_MANAGER: ['WET_RECEIVING', 'DRYING', 'DEBUC', 'TRIM', 'CURE', 'STORE_QA'],
  TRIMMER: ['TRIM'],
  LAB_TECH: ['STORE_QA'],
  QA_INSPECTOR: ['STORE_QA', 'CURE', 'DRYING'],
  RESPONSIBLE_PHARMACIST: ['WET_RECEIVING', 'DRYING', 'DEBUC', 'TRIM', 'CURE', 'STORE_QA', 'SALE'],
  PROCESSING_SUPERVISOR: ['WET_RECEIVING', 'DRYING', 'DEBUC', 'TRIM', 'CURE', 'STORE_QA'],
  SECURITY_OFFICER: ['DISPATCH', 'FACILITY'],
  DELIVERY_DRIVER: ['DISPATCH'],
  MAINTENANCE_MANAGER: ['FACILITY'],
  HOUSEKEEPING: ['FACILITY'],
  LAUNDRY: ['FACILITY'],
  GENERAL_WORKER: ['PROPAGATION', 'VEGETATIVE', 'FLOWERING', 'FACILITY'],
  // These roles see ALL stages — management chain
  HEAD_OF_CULTIVATION: [],
  NURSERY_MANAGER: [],
  FACILITY_SUPERVISOR: [],
  FACILITY_MANAGER: [],
  TENANT_ADMIN: [],
  SUPER_ADMIN: [],
};

export async function createTicket(data: {
  title: string; description: string; priority?: string; category?: string;
  ticketType?: string; workflowStage?: string;
  greenhouseId?: string; bayId?: string; plantId?: string; batchId?: string; taskId?: string;
  estimatedCost?: number; quantity?: number; supplier?: string;
  photos?: string[];
  assignedToId?: string;        // specific user
  assignedToRole?: string;      // OR a role/department (any of that role can pick up)
  tenantId: string; userId: string;
}) {
  const ticket = await prisma.ticket.create({
    data: {
      title: data.title, description: data.description,
      priority: (data.priority || 'MEDIUM') as any,
      category: data.category || 'GENERAL',
      ticketType: data.ticketType || 'ISSUE',
      workflowStage: data.workflowStage,
      greenhouseId: data.greenhouseId, bayId: data.bayId,
      plantId: data.plantId, batchId: data.batchId, taskId: data.taskId,
      estimatedCost: data.estimatedCost, quantity: data.quantity, supplier: data.supplier,
      photos: data.photos || [],
      assignedToId: data.assignedToId,
      assignedToRole: data.assignedToRole,
      reportedById: data.userId, tenantId: data.tenantId,
    },
  });
  eventBus.emit('TICKET_CREATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'Ticket', entityId: ticket.id });

  // Skip auto-route if the creator already chose an assignee or department
  if (!data.assignedToId && !data.assignedToRole) {
    try {
      const smartService = require('./smart-tickets.service');
      await smartService.autoRouteTicket(ticket.id, data.tenantId);
    } catch (e) { /* non-critical */ }
  }

  return ticket;
}

export async function listTickets(query: {
  tenantId: string; status?: string; priority?: string;
  ticketType?: string; workflowStage?: string;
  role?: string; userId?: string;
}) {
  const where: any = { tenantId: query.tenantId };
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.ticketType) where.ticketType = query.ticketType;
  if (query.workflowStage) where.workflowStage = query.workflowStage;

  // Role-based filtering: only show tickets from relevant stages
  if (query.role) {
    const stages = ROLE_STAGES[query.role];
    if (stages && stages.length > 0) {
      // Show tickets from their stages OR tickets they created OR tickets assigned to them
      where.OR = [
        { workflowStage: { in: stages } },
        { workflowStage: null }, // untagged tickets visible to all
        { reportedById: query.userId },
        { assignedToId: query.userId },
      ];
    }
    // RP sees only RP_SIGNOFF tickets + their own
    if (query.role === 'RESPONSIBLE_PHARMACIST') {
      where.OR = [
        { ticketType: 'RP_SIGNOFF' },
        { ticketType: 'APPROVAL', workflowStage: 'STORE_QA' },
        { reportedById: query.userId },
      ];
    }
  }

  return prisma.ticket.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getTicket(id: string, tenantId: string) {
  return prisma.ticket.findFirst({
    where: { id, tenantId },
    include: { comments: { orderBy: { createdAt: 'asc' } } },
  });
}

export async function updateTicket(id: string, data: {
  status?: string; assignedToId?: string; assignedToRole?: string; resolution?: string;
  rpSignedById?: string; rpNotes?: string;
  approvedById?: string; approvalNotes?: string;
  reopen?: boolean;
  actorId?: string;  // userId of the person performing the update — used for closedBy / reopenedBy audit
}) {
  const updates: any = {};
  if (data.status) updates.status = data.status;
  if (data.assignedToId !== undefined) updates.assignedToId = data.assignedToId || null;
  if (data.assignedToRole !== undefined) updates.assignedToRole = data.assignedToRole || null;
  if (data.resolution) {
    updates.resolution = data.resolution;
    updates.resolvedAt = new Date();
    if (data.actorId) updates.resolvedById = data.actorId;  // audit: who closed it
  }
  // RP sign-off
  if (data.rpSignedById) { updates.rpSignedById = data.rpSignedById; updates.rpSignedAt = new Date(); updates.rpNotes = data.rpNotes; }
  // Tenant Admin approval
  if (data.approvedById) {
    updates.approvedById = data.approvedById;
    updates.approvedAt = new Date();
    updates.approvalNotes = data.approvalNotes;
    updates.status = 'COMPLETED';
    updates.resolvedAt = new Date();
    updates.resolvedById = data.approvedById;
  }
  // Reopen path — undo a close
  if (data.reopen) {
    updates.status = 'OPEN';
    updates.resolvedAt = null;
    updates.resolvedById = null;
    updates.resolution = null;
    if (data.actorId) {
      updates.reopenedById = data.actorId;
      updates.reopenedAt = new Date();
    }
  }
  return prisma.ticket.update({ where: { id }, data: updates });
}

export async function addTicketComment(data: { ticketId: string; content: string; photo?: string; userId: string }) {
  return prisma.ticketComment.create({
    data: { ticketId: data.ticketId, content: data.content, photo: data.photo, authorId: data.userId },
  });
}

// ── GROW SCHEDULE ──

export async function listSchedules(tenantId: string) {
  return prisma.growSchedule.findMany({
    where: { tenantId, status: 'ACTIVE' },
    orderBy: { startDate: 'asc' },
  });
}

export async function createSchedule(data: {
  title: string; strain: string; startDate: string; phases: any[];
  greenhouseId: string; tenantId: string; userId: string;
}) {
  return prisma.growSchedule.create({
    data: {
      title: data.title, strain: data.strain, startDate: new Date(data.startDate),
      phases: data.phases, greenhouseId: data.greenhouseId,
      tenantId: data.tenantId, createdById: data.userId,
    },
  });
}
