import { prisma } from '../config/db';
import { BayStatus, MotherStatus, CloneTrayStatus } from '@prisma/client';
import { eventBus } from './eventBus';
import { createIndividualClones } from './clone.service';
import { logAction } from './audit.service';
import { syncCalendarTickets } from './calendar-tickets.service';

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
  rows?: number; subrows?: number; spotsPerSubrow?: number; spotsPerRow?: number; bayStart?: number;
  facilityId: string; tenantId: string; userId: string;
}) {
  const rows = Math.max(1, Math.min(50, Number(data.rows) || 4));
  const subrows = Math.max(1, Math.min(20, Number(data.subrows) || 4));
  // spotsPerSubrow is the new granularity; fall back to old spotsPerRow/subrows for compat.
  const spotsPerSubrow = Math.max(1, Math.min(2000,
    Number(data.spotsPerSubrow) || (Number(data.spotsPerRow) ? Math.round(Number(data.spotsPerRow) / subrows) : 130)));
  const capacity = rows * subrows * spotsPerSubrow;
  const bayStart = Number(data.bayStart) || 1; // so GH2 bays can start at "Bay 4" etc.

  const gh = await prisma.greenhouse.create({
    data: { name: data.name, type: data.type as any, totalBays: data.totalBays, facilityId: data.facilityId, tenantId: data.tenantId },
  });

  for (let b = 0; b < data.totalBays; b++) {
    const bayNo = bayStart + b;
    const bay = await prisma.bay.create({
      data: { name: `Bay ${bayNo}`, greenhouseId: gh.id, lines: rows, capacity },
    });
    // Bay = rows × subrows × spotsPerSubrow. Subrow is the strain-controlled lane.
    const spots = [];
    for (let row = 1; row <= rows; row++) {
      for (let sub = 1; sub <= subrows; sub++) {
        for (let pos = 1; pos <= spotsPerSubrow; pos++) {
          spots.push({ spotId: `${data.name}-B${bayNo}-R${row}-S${sub}-P${pos}`, row, subrow: sub, position: pos, bayId: bay.id });
        }
      }
    }
    await prisma.baySpot.createMany({ data: spots });
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
  const mothers = await prisma.motherPlant.findMany({
    where: { tenantId },
    include: { cloneTrays: { orderBy: { cloneDate: 'desc' }, take: 5 } },
  });
  // Loraine: mothers in natural order (M1, M2 … M10, not M1, M10, M2).
  return mothers.sort((a, b) => (a.identifier || '').localeCompare(b.identifier || '', undefined, { numeric: true }));
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
  identifier: string; strain: string; source?: string; breeder?: string;
  room?: string; quantity?: number; inceptionDate?: string | Date;
  lifecycleDays?: number; cullDate?: string | Date;
  facilityId: string; tenantId: string; userId: string;
}) {
  const lifecycleDays = Number(data.lifecycleDays) > 0 ? Number(data.lifecycleDays) : 180;
  const inception = data.inceptionDate ? new Date(data.inceptionDate) : null;
  // cull date = explicit override, else inception + lifecycle
  let cull: Date | null = data.cullDate ? new Date(data.cullDate) : null;
  if (!cull && inception) {
    cull = new Date(inception);
    cull.setDate(cull.getDate() + lifecycleDays);
  }
  const mother = await prisma.motherPlant.create({
    data: {
      identifier: data.identifier, strain: data.strain, source: data.source || 'CLONED',
      breeder: data.breeder, room: data.room || null,
      quantity: Number(data.quantity) > 0 ? Number(data.quantity) : 1,
      inceptionDate: inception, lifecycleDays, cullDate: cull,
      facilityId: data.facilityId, tenantId: data.tenantId,
    },
  });
  eventBus.emit('MOTHER_REGISTERED', { userId: data.userId, tenantId: data.tenantId, entityType: 'MotherPlant', entityId: mother.id });
  return mother;
}

// Full mother edit (identifier / strain / room / quantity / inception / lifecycle).
export async function updateMother(id: string, data: {
  identifier?: string; strain?: string; breeder?: string; room?: string;
  quantity?: number; inceptionDate?: string; lifecycleDays?: number;
}, userId: string, tenantId: string) {
  const m = await prisma.motherPlant.findFirst({ where: { id, tenantId } });
  if (!m) throw Object.assign(new Error('Mother not found'), { status: 404 });
  const lifecycleDays = data.lifecycleDays !== undefined ? Number(data.lifecycleDays) : m.lifecycleDays;
  const inception = data.inceptionDate !== undefined ? (data.inceptionDate ? new Date(data.inceptionDate) : null) : m.inceptionDate;
  let cull = m.cullDate;
  if (inception) { cull = new Date(inception); cull.setDate(cull.getDate() + (lifecycleDays || 180)); }
  const updated = await prisma.motherPlant.update({
    where: { id },
    data: {
      ...(data.identifier !== undefined ? { identifier: data.identifier } : {}),
      ...(data.strain !== undefined ? { strain: data.strain } : {}),
      ...(data.breeder !== undefined ? { breeder: data.breeder } : {}),
      ...(data.room !== undefined ? { room: data.room || null } : {}),
      ...(data.quantity !== undefined ? { quantity: Number(data.quantity) > 0 ? Number(data.quantity) : 1 } : {}),
      inceptionDate: inception, lifecycleDays, cullDate: cull,
    },
  });
  eventBus.emit('MOTHER_UPDATED', { userId, tenantId, entityType: 'MotherPlant', entityId: id });
  await logAction({ userId, tenantId, action: 'MOTHER_UPDATED', entityType: 'MotherPlant', entityId: id, after: data as any }).catch(() => {});
  return updated;
}

// Delete a mother — retire (not hard-delete) if it has clone history, for traceability.
export async function deleteMother(id: string, tenantId: string, userId: string) {
  const m = await prisma.motherPlant.findFirst({ where: { id, tenantId } });
  if (!m) throw Object.assign(new Error('Mother not found'), { status: 404 });
  const clones = await prisma.cloneTray.count({ where: { motherPlantId: id } });
  if (clones > 0) {
    const archived = await prisma.motherPlant.update({ where: { id }, data: { status: 'RETIRED' } });
    eventBus.emit('MOTHER_RETIRED', { userId, tenantId, entityType: 'MotherPlant', entityId: id });
    await logAction({ userId, tenantId, action: 'MOTHER_RETIRED', entityType: 'MotherPlant', entityId: id }).catch(() => {});
    return { ...archived, archived: true, reason: 'Has clone history — retired instead of deleted.' };
  }
  await prisma.motherPlant.delete({ where: { id } });
  eventBus.emit('MOTHER_DELETED', { userId, tenantId, entityType: 'MotherPlant', entityId: id });
  await logAction({ userId, tenantId, action: 'MOTHER_DELETED', entityType: 'MotherPlant', entityId: id }).catch(() => {});
  return { deleted: true };
}

export async function updateMotherStatus(id: string, status: MotherStatus, userId: string, tenantId: string) {
  const before = await prisma.motherPlant.findUnique({ where: { id } });
  const mother = await prisma.motherPlant.update({ where: { id }, data: { status } });
  eventBus.emit('MOTHER_STATUS_CHANGED', { userId, tenantId, entityType: 'MotherPlant', entityId: id, status });
  await logAction({ userId, tenantId, action: 'MOTHER_STATUS_' + status, entityType: 'MotherPlant', entityId: id, after: { status } }).catch(() => {});
  // Culling a mother = genetics loss → record mortality + cascade to a change-control deviation
  if (status === 'CULLED' && before?.status !== 'CULLED') {
    const qty = mother.quantity || 1;
    await prisma.mortalityRecord.create({
      data: { entityType: 'PLANT', strain: mother.strain, quantity: qty, causeCategory: 'UNKNOWN',
        plantTag: mother.identifier, zone: mother.room || null, reportedById: userId, tenantId,
        notes: `Mother plant culled (${mother.identifier}, ${mother.room || 'mother room'})` },
    }).catch(() => {});
    await raisePlantChangeDeviation(tenantId, userId, `Mother plant CULLED — ${mother.identifier} (${mother.strain}, ${mother.room || 'mother room'}): ${qty} plant(s) — genetics loss`, qty).catch(() => {});
  }
  return mother;
}

// ── CLONE TRAYS ──

export async function createCloneTray(data: {
  motherPlantId: string; strain: string; totalCuttings: number;
  purpose?: string; clientName?: string; rootingDays?: number; cloneDate?: string | Date;
  batchNumber?: string; motherUnit?: number; motherLabel?: string;
  tenantId: string; userId: string;
}) {
  // Manual batch number override (Lou/Loraine) — else auto CT-YYYY-NNN
  let trayNumber: string;
  if (data.batchNumber?.trim()) {
    trayNumber = data.batchNumber.trim();
    const clash = await prisma.cloneTray.findUnique({ where: { trayNumber } });
    if (clash) throw Object.assign(new Error(`Batch number ${trayNumber} already exists`), { status: 409 });
  } else {
    const count = await prisma.cloneTray.count({ where: { tenantId: data.tenantId } });
    trayNumber = `CT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  }
  const rootingDays = Number(data.rootingDays) > 0 ? Number(data.rootingDays) : 14;
  const cloneDate = data.cloneDate ? new Date(data.cloneDate) : new Date();

  const tray = await prisma.cloneTray.create({
    data: {
      trayNumber, strain: data.strain, totalCuttings: data.totalCuttings,
      motherPlantId: data.motherPlantId, createdById: data.userId, tenantId: data.tenantId,
      purpose: data.purpose || 'PRODUCTION', clientName: data.clientName || null,
      rootingDays, cloneDate,
      motherUnit: data.motherUnit ?? null, motherLabel: data.motherLabel || null,
    },
  });

  // Update mother clone count
  await prisma.motherPlant.update({
    where: { id: data.motherPlantId },
    data: { totalClones: { increment: data.totalCuttings } },
  });

  // Auto-schedule the W1/W2/W3 mortality checks + transplant (SOP 3-CUL-7) so they
  // appear on the calendar for sign-off — no manual scheduling by the nursery team.
  const assignee = await prisma.user.findFirst({ where: { tenantId: data.tenantId, role: 'NURSERY_MANAGER' } })
    || await prisma.user.findFirst({ where: { tenantId: data.tenantId, role: 'CULTIVATOR' } })
    || { id: data.userId };
  const due = (days: number) => { const d = new Date(cloneDate); d.setDate(d.getDate() + days); return d; };
  const followUps = [
    { title: `Mortality Check W1 — ${trayNumber} (${data.strain})`, dueDate: due(7), category: 'MORTALITY' },
    { title: `Mortality Check W2 — ${trayNumber} (${data.strain})`, dueDate: due(14), category: 'MORTALITY' },
    { title: `Mortality Check W3 — ${trayNumber} (${data.strain})`, dueDate: due(21), category: 'MORTALITY' },
    { title: `Transplant — ${trayNumber} (${data.strain})`, dueDate: due(rootingDays), category: 'CULTIVATION' },
  ];
  const days = Math.min(rootingDays, 21); // used in the kickoff message below
  // Lou: cuttings events were over-noisy — a separate task per rooting day. Collapse to ONE
  // aggregated clone-room T&H task per tray; the daily readings are captured on the clone-room
  // daily check sheet, this is just the tray anchor.
  followUps.push({
    title: `Clone-room Temp & Humidity — ${trayNumber} (${rootingDays}-day rooting)`,
    dueDate: cloneDate, category: 'ENVIRONMENT',
  });
  // Create the milestone tasks in ONE write with NO per-task event — the single CLONE_TRAY_CREATED
  // event (below) is the aggregate tray signal, so the board/activity feed stays quiet.
  await prisma.task.createMany({
    data: followUps.map((f) => ({
      title: f.title, assignedToId: assignee.id, assignerId: data.userId,
      dueDate: f.dueDate, priority: 'MEDIUM', category: f.category, tenantId: data.tenantId,
    })),
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

  // ── Batch kickoff — alert the whole cultivation chain so nobody waits on a silent board ──
  try {
    const transplantDate = due(rootingDays);
    const fmt = transplantDate.toISOString().slice(0, 10);
    // HoC (Lou) — ONE actionable "build grow calendar" ticket at a time. He builds a single grow
    // calendar per cycle, not one per tray. Suppress duplicates while an unresolved one is already
    // on his board (root cause of the spam: genesis cloned ~16 trays → 16 identical nudges).
    const openCalendarTicket = await prisma.ticket.findFirst({
      where: {
        tenantId: data.tenantId, assignedToRole: 'HEAD_OF_CULTIVATION',
        title: { startsWith: 'Build grow calendar' }, resolvedAt: null,
      },
      select: { id: true },
    });
    if (!openCalendarTicket) {
      await createTicket({
        title: `Build grow calendar — batch ${trayNumber} (${data.strain})`,
        description: `Cloning batch ${trayNumber} — ${data.totalCuttings} ${data.strain} cuttings from ${data.motherLabel || 'mother'}, cloned ${cloneDate.toISOString().slice(0, 10)}. Build the grow calendar / playbook for this cycle (clone → veg → flip → flower → harvest). Transplant due ~${fmt}.`,
        priority: 'HIGH', category: 'CULTIVATION', ticketType: 'ISSUE',
        workflowStage: 'PROPAGATION', assignedToRole: 'HEAD_OF_CULTIVATION',
        tenantId: data.tenantId, userId: data.userId,
      });
    }
    // Ping the rest of the chain (NM already holds the task board; Loraine oversees;
    // cultivators get a heads-up to prep the GH bays for transplant in ~rootingDays).
    const chain = await prisma.user.findMany({
      where: { tenantId: data.tenantId, active: true, role: { in: ['NURSERY_MANAGER', 'FACILITY_SUPERVISOR', 'CULTIVATOR'] as any } },
      select: { id: true, role: true },
    });
    const msgFor = (role: string) =>
      role === 'NURSERY_MANAGER' ? `Clone-room monitoring + mortality + transplant tasks queued on your board (${days}-day schedule).`
      : role === 'FACILITY_SUPERVISOR' ? `Oversee the clone room — daily checks + mortality due over the rooting period. Deviations route to you.`
      : `Transplant to the greenhouse in ~${rootingDays} days (≈${fmt}) — prepare the GH bays.`;
    if (chain.length) {
      await prisma.notification.createMany({
        data: chain.map((u) => ({
          userId: u.id,
          title: `Batch ${trayNumber} cloned (${data.totalCuttings} ${data.strain})`,
          message: msgFor(u.role),
          link: u.role === 'CULTIVATOR' ? '/baygrid' : '/tasks',
        })),
      });
    }
  } catch (e: any) { console.error('[clone] batch-kickoff notify failed:', e.message); }

  eventBus.emit('CLONE_TRAY_CREATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'CloneTray', entityId: tray.id });
  return tray;
}

export async function updateCloneTray(id: string, data: { rooted?: number; mortality?: number; status?: CloneTrayStatus; photos?: string[]; notes?: string; userId: string }) {
  const updates: any = {};
  if (data.rooted !== undefined) updates.rooted = data.rooted;
  if (data.mortality !== undefined) updates.mortality = data.mortality;
  if (data.photos !== undefined) updates.photos = data.photos;       // photo + short-video proof
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.status) {
    updates.status = data.status;
    if (data.status === 'ROOTED') updates.rootedDate = new Date();
    if (data.status === 'TRANSPLANTED') updates.transplantDate = new Date();
  }
  return prisma.cloneTray.update({ where: { id }, data: updates });
}

// Delete a clone tray (the whole tray, not individual clones). Blocked once transplanted —
// those cuttings are already placed as plants in the bays. Removes the tray + its cutting rows. Audited.
export async function deleteCloneTray(id: string, tenantId: string, userId: string) {
  const tray = await prisma.cloneTray.findFirst({ where: { id, tenantId }, include: { _count: { select: { clones: true } } } });
  if (!tray) { const e: any = new Error('Clone tray not found'); e.status = 404; throw e; }
  if (tray.status === 'TRANSPLANTED') {
    const e: any = new Error('Cannot delete a transplanted tray — its clones are already placed in the bays. Re-strain or clear the bay pots instead.');
    e.status = 409; throw e;
  }
  await prisma.$transaction([
    prisma.clone.deleteMany({ where: { cloneTrayId: id } }),
    prisma.cloneTray.delete({ where: { id } }),
  ]);
  // Fix the double-count: re-derive the mother's totalClones from her REMAINING trays. Deleting a
  // tray to redo it now SUBTRACTS those clones instead of leaving the mother inflated (e.g. 237 vs 119).
  if (tray.motherPlantId) {
    const agg = await prisma.cloneTray.aggregate({ where: { motherPlantId: tray.motherPlantId }, _sum: { totalCuttings: true } });
    await prisma.motherPlant.update({ where: { id: tray.motherPlantId }, data: { totalClones: agg._sum.totalCuttings || 0 } }).catch(() => {});
  }
  await logAction({ userId, tenantId, action: 'CLONE_TRAY_DELETED', entityType: 'CloneTray', entityId: id, after: { trayNumber: tray.trayNumber, strain: tray.strain, totalCuttings: tray.totalCuttings, clonesRemoved: tray._count.clones } as any }).catch(() => {});
  return { deleted: true, trayNumber: tray.trayNumber, clonesRemoved: tray._count.clones };
}

export async function listCloneTrays(tenantId: string) {
  const trays = await prisma.cloneTray.findMany({
    where: { tenantId },
    include: {
      motherPlant: { select: { identifier: true, strain: true, status: true } },
      _count: { select: { clones: true } },
    },
  });
  // Loraine: trays in tray-number order (T1 → T49), not clone date — so a missed tray is obvious.
  const trayNo = (t: string) => { const m = /T(\d+)/i.exec(t || ''); return m ? parseInt(m[1], 10) : 0; };
  return trays.sort((a, b) => trayNo(a.trayNumber) - trayNo(b.trayNumber)
    || (a.trayNumber || '').localeCompare(b.trayNumber || '', undefined, { numeric: true }));
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

  // If the creator already assigned it (person or role), notify that owner now.
  if (ticket.assignedToId || ticket.assignedToRole) {
    try { await notifyTicketAssignees(ticket); } catch (e: any) { console.error('[ticket] create-assign notify failed:', e.message); }
  }

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
  // 'OPEN' is the umbrella for un-finished work — a reassigned ticket is ASSIGNED,
  // not OPEN, so without this it would vanish from the Open filter + counts.
  if (query.status === 'OPEN') where.status = { in: ['OPEN', 'ASSIGNED'] };
  else if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.ticketType) where.ticketType = query.ticketType;
  if (query.workflowStage) where.workflowStage = query.workflowStage;

  // Role-based filtering: scope each person's board to THEIR work.
  // Admins + the Facility Manager get the full facility view (oversight);
  // everyone else sees only tickets that are theirs by one of four routes:
  //   • assigned to them personally (assignedToId)
  //   • assigned to their role/department (assignedToRole)  ← was missing → role-assigned tickets were invisible
  //   • reported by them (reportedById)
  //   • sitting in a workflow stage their role owns (ROLE_STAGES)
  // Without this, roles with no ROLE_STAGES (HoC, NM, …) fell through and saw EVERY ticket.
  const SEES_ALL = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'FACILITY_MANAGER']);
  if (query.role && !SEES_ALL.has(query.role)) {
    // RP sees only RP_SIGNOFF / STORE_QA approvals + their own
    if (query.role === 'RESPONSIBLE_PHARMACIST') {
      where.OR = [
        { ticketType: 'RP_SIGNOFF' },
        { ticketType: 'APPROVAL', workflowStage: 'STORE_QA' },
        { reportedById: query.userId },
        { assignedToId: query.userId },
      ];
    } else {
      const stages = ROLE_STAGES[query.role] || [];
      const or: any[] = [
        { assignedToId: query.userId },
        { assignedToRole: query.role },
        { reportedById: query.userId },
      ];
      if (stages.length > 0) or.push({ workflowStage: { in: stages } });
      where.OR = or;
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
  // ── Sign-off rail-guard ──────────────────────────────────────────────────
  // Compliance tickets cannot reach CLOSED/COMPLETED without the enforced
  // sign-off chain: evidence (resolution), RP review, AR approval where the
  // type needs it, in order, signed by people who actually hold the role.
  const COMPLIANCE_TICKET_TYPES = new Set([
    'QMS_GOVERNANCE', 'RP_SIGNOFF', 'BCR_REVIEW', 'GMP_FINDING', 'LABEL_CONTROL', 'APPROVAL', 'COMPLIANCE_APPROVAL',
  ]);
  const NEED_AR_APPROVAL = new Set(['RP_SIGNOFF', 'BCR_REVIEW', 'APPROVAL', 'COMPLIANCE_APPROVAL']);
  const AR_ROLES = new Set(['TENANT_ADMIN', 'SUPER_ADMIN']);
  const guardFail = (status: number, message: string): never => {
    throw Object.assign(new Error(message), { status });
  };

  const existing = await prisma.ticket.findUnique({
    where: { id },
    select: { ticketType: true, rpSignedById: true, approvedById: true, resolution: true },
  });
  if (!existing) guardFail(404, 'Ticket not found');

  const isClosing = !data.reopen && (
    (!!data.status && ['CLOSED', 'COMPLETED'].includes(data.status)) || !!data.approvedById
  );

  if (isClosing && COMPLIANCE_TICKET_TYPES.has(existing!.ticketType)) {
    const postRp = data.rpSignedById || existing!.rpSignedById;
    const postAr = data.approvedById || existing!.approvedById;
    const postResolution = data.resolution || existing!.resolution;
    if (!postResolution) guardFail(400, 'A resolution / evidence note is required to close a compliance ticket.');
    if (!postRp) guardFail(403, 'Responsible Pharmacist sign-off is required before this compliance ticket can close.');
    if (NEED_AR_APPROVAL.has(existing!.ticketType) && !postAr) guardFail(403, 'Authorised Representative (Tenant Admin) approval is required to release this ticket.');
    if (data.approvedById && !postRp) guardFail(400, 'RP review must be recorded before AR approval.');
  }

  // Signer authority — the sign-off must be by someone who actually holds the role.
  if (data.rpSignedById) {
    const signer = await prisma.user.findUnique({ where: { id: data.rpSignedById }, select: { role: true } });
    if (!signer || signer.role !== 'RESPONSIBLE_PHARMACIST') guardFail(403, 'Only the Responsible Pharmacist can record the RP sign-off.');
  }
  if (data.approvedById) {
    const approver = await prisma.user.findUnique({ where: { id: data.approvedById }, select: { role: true } });
    if (!approver || !AR_ROLES.has(approver.role)) guardFail(403, 'Only an Authorised Representative (Tenant Admin) can approve release.');
  }
  // ─────────────────────────────────────────────────────────────────────────

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
  const saved = await prisma.ticket.update({ where: { id }, data: updates });

  // [W7.4] Audit every compliance-relevant transition — append-only, hash-chained.
  if (data.actorId) {
    const actions: string[] = [];
    if (updates.status && ['CLOSED', 'COMPLETED'].includes(updates.status)) actions.push('TICKET_CLOSED');
    if (data.rpSignedById) actions.push('TICKET_RP_SIGNED');
    if (data.approvedById) actions.push('TICKET_AR_APPROVED');
    if (data.reopen) actions.push('TICKET_REOPENED');
    for (const action of actions) {
      try {
        await logAction({
          userId: data.actorId, tenantId: saved.tenantId, action,
          entityType: 'Ticket', entityId: saved.id,
          after: { status: saved.status, ticketType: saved.ticketType, rpSignedById: saved.rpSignedById, approvedById: saved.approvedById },
        });
      } catch (e: any) { console.error('[audit] ticket transition log failed:', e.message); }
    }
  }

  // Notify the new owner on (re)assignment — without this, a ticket routed to a person
  // or a whole role lands silently and nobody knows to action it.
  if (data.assignedToId !== undefined || data.assignedToRole !== undefined) {
    try {
      await notifyTicketAssignees(saved);
      if (data.actorId) {
        await logAction({
          userId: data.actorId, tenantId: saved.tenantId, action: 'TICKET_ASSIGNED',
          entityType: 'Ticket', entityId: saved.id,
          after: { assignedToId: saved.assignedToId, assignedToRole: saved.assignedToRole },
        });
      }
    } catch (e: any) { console.error('[ticket] assignment notify failed:', e.message); }
  }
  return saved;
}

// Notify whoever a ticket is now assigned to — a specific person, or every active
// member of the assigned role/department. Best-effort; never throws into the caller.
async function notifyTicketAssignees(ticket: { id: string; title: string; priority: string; tenantId: string; assignedToId: string | null; assignedToRole: string | null }) {
  let recipientIds: string[] = [];
  if (ticket.assignedToId) {
    recipientIds = [ticket.assignedToId];
  } else if (ticket.assignedToRole) {
    const roleUsers = await prisma.user.findMany({
      where: { tenantId: ticket.tenantId, role: ticket.assignedToRole as any, active: true },
      select: { id: true },
    });
    recipientIds = roleUsers.map((u) => u.id);
  }
  if (recipientIds.length === 0) return;
  await prisma.notification.createMany({
    data: recipientIds.map((uid) => ({
      userId: uid,
      title: `Ticket assigned: ${ticket.title}`,
      message: `Priority ${ticket.priority}. Open the Tickets board to action or reassign it.`,
      link: '/tickets',
    })),
  });
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

// ── SCHEDULE CHANGE CONTROL ───────────────────────────────────────────────
// When the Head of Cultivation alters an approved grow schedule (e.g. pulls
// harvest earlier), GMP requires a documented deviation/change-control. This:
//   1. applies the schedule edit,
//   2. detects a material change (harvest date moved EARLIER),
//   3. auto-raises a Deviation (anchored to the Harvest SOP) routed to the
//      Facility Manager (Loraine) + QA for root-cause/CAPA sign-off,
//   4. cascades — re-derives downstream tickets from the new plan.
// Reuses the existing Deviation + Notification + calendar-ticket rails.

function harvestDateOf(start: Date, phases: any): Date | null {
  if (!Array.isArray(phases)) return null;
  const h = phases.find((p: any) => /harvest/i.test(String(p?.phase ?? p?.name ?? '')));
  if (!h) return null;
  if (h.date) return new Date(h.date);
  const day = h.startDay ?? h.start ?? h.day ?? null;
  if (day == null) return null;
  return new Date(start.getTime() + Number(day) * 86400000);
}

export async function updateScheduleWithChangeControl(
  id: string,
  patch: { title?: string; strain?: string; startDate?: string; phases?: any[]; reason?: string },
  ctx: { tenantId: string; userId: string },
) {
  const existing = await prisma.growSchedule.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!existing) { const e: any = new Error('Schedule not found'); e.status = 404; throw e; }

  const oldHarvest = harvestDateOf(existing.startDate, existing.phases);
  const newStart = patch.startDate ? new Date(patch.startDate) : existing.startDate;
  const newPhases = patch.phases ?? (existing.phases as any);
  const newHarvest = harvestDateOf(newStart, newPhases);

  const schedule = await prisma.growSchedule.update({
    where: { id },
    data: {
      title: patch.title ?? existing.title,
      strain: patch.strain ?? existing.strain,
      startDate: newStart,
      phases: newPhases,
    },
  });

  let deviation: any = null;
  const deltaDays = oldHarvest && newHarvest
    ? Math.round((oldHarvest.getTime() - newHarvest.getTime()) / 86400000)
    : 0;

  // material change = harvest pulled EARLIER
  if (deltaDays > 0) {
    const severity = deltaDays >= 14 ? 'HIGH' : deltaDays >= 7 ? 'MEDIUM' : 'LOW';
    const sop = await prisma.sOP.findFirst({ where: { tenantId: ctx.tenantId, title: { contains: 'Harvest' } } });
    const editor = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const facilityId = editor?.facilityId
      || (await prisma.facility.findFirst({ where: { tenantId: ctx.tenantId } }))?.id;

    if (sop && facilityId) {
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const description =
        `CHANGE CONTROL — Grow schedule "${schedule.title}" (${schedule.strain}): ` +
        `HARVEST PULLED EARLIER by ${deltaDays} day(s) — was ${fmt(oldHarvest!)}, now ${fmt(newHarvest!)}. ` +
        `Altered by ${editor?.name || 'Head of Cultivation'}.` +
        (patch.reason ? ` Reason: ${patch.reason}.` : '') +
        ` Downstream tasks re-derived from the new plan. Requires root-cause + CAPA + QA sign-off.`;

      deviation = await prisma.deviation.create({
        data: { sopId: sop.id, description, severity: severity as any, facilityId, raisedById: ctx.userId },
      });
      eventBus.emit('DEVIATION_RAISED', { userId: ctx.userId, tenantId: ctx.tenantId, entityType: 'Deviation', entityId: deviation.id });

      // route to the FM (Ray) + Cultivation Supervisor (Loraine) + QA reviewer. QA is not
      // onboarded until QA day — until then QA review is redirected to the SuperAdmin (Flo),
      // NOT Keke (LAB_TECH).
      const recipients = await prisma.user.findMany({
        where: {
          tenantId: ctx.tenantId, active: true,
          OR: [
          { role: 'FACILITY_MANAGER' as any },
          { role: 'FACILITY_SUPERVISOR' as any }, // Cultivation Supervisor (Loraine) — floor oversight
          { role: 'PROCESSING_MANAGER' as any }, // earlier harvest = earlier processing — cascade to PM
          { email: 'florisolivier7@gmail.com' },
        ],
        },
        select: { id: true },
      });
      if (recipients.length) {
        await prisma.notification.createMany({
          data: recipients.map((u) => ({
            userId: u.id,
            title: `DEVIATION (${severity}): harvest pulled ${deltaDays}d earlier`,
            message: `${schedule.title} (${schedule.strain}) — change control raised, root-cause + CAPA required`,
            link: '/qms',
          })),
        });
      }

      // cascade: re-derive downstream tickets from the new schedule
      try { await syncCalendarTickets(ctx.tenantId); } catch { /* non-fatal */ }

      await logAction({
        userId: ctx.userId, tenantId: ctx.tenantId, action: 'SCHEDULE_CHANGE_CONTROL',
        entityType: 'GrowSchedule', entityId: schedule.id,
        after: { deviationId: deviation.id, deltaDays, severity },
      });
    }
  }

  return { schedule, deviation, harvestPulledEarlierDays: deltaDays > 0 ? deltaDays : 0 };
}

// ── Drill-down layout (GH → Bay → Row → Subrow) ──
export async function getFacilityLayout(tenantId: string) {
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT g.id gid, g.name gname, g.type::text gtype, g."totalBays" totalbays,
           b.id bid, b.name bname, s.row, s.subrow,
           max(s.strain) strain,
           count(*)::int spots,
           count(*) filter (where s.status = 'OCCUPIED')::int occupied
    FROM "Greenhouse" g
    JOIN "Bay" b ON b."greenhouseId" = g.id
    JOIN "BaySpot" s ON s."bayId" = b.id
    WHERE g."tenantId" = $1
    GROUP BY g.id, g.name, g.type, g."totalBays", b.id, b.name, s.row, s.subrow
    ORDER BY g.name, b.name, s.row, s.subrow`, tenantId);
  const ghMap = new Map<string, any>();
  for (const r of rows) {
    if (!ghMap.has(r.gid)) ghMap.set(r.gid, { id: r.gid, name: r.gname, type: r.gtype, totalBays: r.totalbays, bays: new Map() });
    const gh = ghMap.get(r.gid);
    if (!gh.bays.has(r.bid)) gh.bays.set(r.bid, { id: r.bid, name: r.bname, rows: new Map() });
    const bay = gh.bays.get(r.bid);
    if (!bay.rows.has(r.row)) bay.rows.set(r.row, { row: r.row, subrows: [] });
    bay.rows.get(r.row).subrows.push({ subrow: r.subrow, strain: r.strain, spots: r.spots, occupied: r.occupied });
  }
  return Array.from(ghMap.values()).map((gh: any) => ({
    ...gh,
    bays: Array.from(gh.bays.values()).map((b: any) => ({ ...b, rows: Array.from(b.rows.values()) })),
  }));
}

export async function getSubrowSpots(bayId: string, row: number, subrow: number) {
  return prisma.baySpot.findMany({
    where: { bayId, row, subrow },
    select: { id: true, spotId: true, position: true, status: true, strain: true, plantId: true, allocatedAt: true },
    orderBy: { position: 'asc' },
  });
}

// All pots in a bay (every row/subrow) — for the portrait Bay view's live plant grid,
// so each pot's status colour shows at a glance (culled = red, etc.).
export async function getBaySpots(bayId: string) {
  return prisma.baySpot.findMany({
    where: { bayId },
    select: { id: true, row: true, subrow: true, position: true, status: true, strain: true, plantId: true },
    orderBy: [{ row: 'asc' }, { subrow: 'asc' }, { position: 'asc' }],
  });
}

// Set/change a subrow's strain (strain-controlled lane). CFS-setup: change allowed;
// once plants are placed it locks (must clear first). Audited via BAY_ALLOCATED.
export async function setSubrowStrain(bayId: string, row: number, subrow: number, strain: string | null, userId: string, tenantId: string) {
  // strain-lock: block change if any spot in the subrow already holds a real plant
  const withPlants = await prisma.baySpot.count({ where: { bayId, row, subrow, plantId: { not: null } } });
  if (withPlants > 0 && strain) {
    throw Object.assign(new Error('Subrow holds plants — clear it before changing strain (strain-lock).'), { status: 409 });
  }
  const res = await prisma.baySpot.updateMany({
    where: { bayId, row, subrow },
    data: { strain: strain || null, status: strain ? 'OCCUPIED' : 'EMPTY', allocatedAt: new Date(), allocatedBy: userId },
  });
  const distinct = await prisma.baySpot.findMany({ where: { bayId, strain: { not: null } }, distinct: ['strain'], select: { strain: true } });
  await prisma.bay.update({ where: { id: bayId }, data: { currentStrain: distinct.length === 1 ? distinct[0].strain : distinct.length > 1 ? 'MIXED' : null } });
  eventBus.emit('BAY_ALLOCATED', { userId, tenantId, entityType: 'Bay', entityId: bayId, plantCount: res.count });
  return { updated: res.count, strain };
}

// Bulk re-strain a subrow in ONE action: clear every spot (recording a mortality for each
// occupied pot for traceability) then set the new strain — for when an FM/grower changes
// the strain of a whole row. Bypasses the strain-lock deliberately (the clear is explicit).
export async function restrainSubrow(bayId: string, row: number, subrow: number, strain: string, userId: string, tenantId: string) {
  if (!strain) throw Object.assign(new Error('New strain is required'), { status: 400 });
  const spots = await prisma.baySpot.findMany({ where: { bayId, row, subrow }, include: { bay: { include: { greenhouse: true } } } });
  let cleared = 0;
  for (const s of spots) {
    if (s.plantId && s.strain) {
      await prisma.mortalityRecord.create({
        data: { entityType: 'PLANT', strain: s.strain, quantity: 1, causeCategory: 'UNKNOWN',
          greenhouseId: s.bay?.greenhouseId || null, bayId, plantTag: s.spotId,
          zone: s.bay?.greenhouse?.name || null, reportedById: userId, tenantId,
          notes: `Cleared on bulk re-strain of row ${row}.${subrow} → ${strain}` },
      });
      cleared++;
    }
  }
  const res = await prisma.baySpot.updateMany({
    where: { bayId, row, subrow },
    data: { plantId: null, strain, status: 'OCCUPIED', allocatedAt: new Date(), allocatedBy: userId, clearedAt: new Date(), clearedBy: userId },
  });
  const distinct = await prisma.baySpot.findMany({ where: { bayId, strain: { not: null } }, distinct: ['strain'], select: { strain: true } });
  await prisma.bay.update({ where: { id: bayId }, data: { currentStrain: distinct.length === 1 ? distinct[0].strain : distinct.length > 1 ? 'MIXED' : null } });
  eventBus.emit('BAY_ALLOCATED', { userId, tenantId, entityType: 'Bay', entityId: bayId, plantCount: res.count });
  await logAction({ userId, tenantId, action: 'SUBROW_RESTRAINED', entityType: 'Bay', entityId: bayId, after: { row, subrow, strain, clearedPlants: cleared } });
  await raisePlantChangeDeviation(tenantId, userId, `Subrow re-strain → ${strain} (Row ${row}.${subrow}): ${cleared} plant(s) cleared`, cleared).catch(() => {});
  return { updated: res.count, cleared, strain };
}

// Cascade a MATERIAL plant/strain change (re-strain, mass cull/clear) to a documented
// Deviation (change control), routed to FM + Head of Cultivation + QA(→Flo until QA day).
// Severity scales with the plant count. Adapting pots/strains/plant-status therefore
// always flows back into the deviation/CAPA chain — GMP change control.
async function raisePlantChangeDeviation(tenantId: string, userId: string, summary: string, count: number) {
  // Only a change-control deviation when REAL plants were affected. Re-straining empty
  // pots (config / genesis setup, 0 plants cleared) is not a deviation — don't flood QMS.
  if (!count || count <= 0) return;
  // Commissioning buffer — during genesis/setup, corrective re-strains/clears (e.g. fixing clone
  // trays placed on the wrong mother) are setup actions, not GMP deviations. Audit them, but don't
  // flood QMS/Keke. Flip COMMISSIONING_MODE off when the facility goes operational and deviations resume.
  if (process.env.COMMISSIONING_MODE === 'true') {
    await logAction({ userId, tenantId, action: 'PLANT_CHANGE_SUPPRESSED_COMMISSIONING', entityType: 'Deviation', entityId: 'suppressed', after: { summary, count } as any }).catch(() => {});
    return;
  }
  const severity = count >= 50 ? 'HIGH' : count >= 10 ? 'MEDIUM' : 'LOW';
  const level = severity === 'HIGH' ? 2 : 3; // ILCO: 1=Critical, 2=Serious, 3=Minor
  // Dedup — skip if an OPEN deviation with this exact summary already exists (kills UAT / double-tap noise).
  const dup = await prisma.deviation.findFirst({ where: { closedAt: null, description: { contains: summary }, facility: { tenantId } } });
  if (dup) return;
  const sop = (await prisma.sOP.findFirst({ where: { tenantId, title: { contains: 'Harvest' } } })) || (await prisma.sOP.findFirst({ where: { tenantId } }));
  const editor = await prisma.user.findUnique({ where: { id: userId } });
  const facilityId = editor?.facilityId || (await prisma.facility.findFirst({ where: { tenantId } }))?.id;
  // Never silently drop a compliance record — log loudly so it can be reconciled.
  if (!sop) { console.error('[deviation] plant-change deviation NOT raised — no SOP exists for tenant', tenantId, '·', summary); return; }
  if (!facilityId) { console.error('[deviation] plant-change deviation NOT raised — no facility for tenant', tenantId, '·', summary); return; }
  const dev = await prisma.deviation.create({
    data: { sopId: sop.id, description: `PLANT CHANGE CONTROL — ${summary}. By ${editor?.name || 'staff'}. Requires root-cause + QA sign-off${level <= 2 ? ' + CAPA' : ''}.`, severity: severity as any, level, capaRequired: level <= 2, facilityId, raisedById: userId },
  });
  eventBus.emit('DEVIATION_RAISED', { userId, tenantId, entityType: 'Deviation', entityId: dev.id });
  const recipients = await prisma.user.findMany({
    where: { tenantId, active: true, OR: [{ role: 'FACILITY_MANAGER' as any }, { role: 'FACILITY_SUPERVISOR' as any }, { role: 'HEAD_OF_CULTIVATION' as any }, { role: 'QA_INSPECTOR' as any }, { email: 'florisolivier7@gmail.com' }] },
    select: { id: true },
  });
  if (recipients.length) {
    await prisma.notification.createMany({ data: recipients.map((u) => ({ userId: u.id, title: `DEVIATION (${severity}): plant change`, message: summary, link: '/qms' })) });
  }
}

// Group action on a SELECTION of pots (the middle granularity between one pot and the
// whole subrow). action = cull | flag | restore | clear | restrain (restrain needs strain).
// Each pot is individually mutated + cull/clear records a mortality per plant — so audit
// + traceability are identical to acting on pots one-by-one, just in one tap.
export async function bulkSpotAction(spotIds: string[], action: string, strain: string | null, userId: string, tenantId: string) {
  if (!Array.isArray(spotIds) || !spotIds.length) throw Object.assign(new Error('No pots selected'), { status: 400 });
  const spots = await prisma.baySpot.findMany({
    where: { id: { in: spotIds }, bay: { greenhouse: { tenantId } } },
    include: { bay: { include: { greenhouse: true } } },
  });
  if (!spots.length) throw Object.assign(new Error('Pots not found'), { status: 404 });

  const recordMortality = async (s: any, note: string) => {
    if (!s.strain) return;
    await prisma.mortalityRecord.create({
      data: { entityType: 'PLANT', strain: s.strain, quantity: 1, causeCategory: 'UNKNOWN',
        greenhouseId: s.bay?.greenhouseId || null, bayId: s.bayId, plantTag: s.spotId,
        zone: s.bay?.greenhouse?.name || null, reportedById: userId, tenantId, notes: note },
    });
  };

  let mortality = 0;
  const bayIds = new Set<string>();

  if (action === 'restrain') {
    if (!strain) throw Object.assign(new Error('Strain required for re-strain'), { status: 400 });
    for (const s of spots) { if (s.plantId && s.strain) { await recordMortality(s, `Cleared on group re-strain → ${strain}`); mortality++; } bayIds.add(s.bayId); }
    await prisma.baySpot.updateMany({
      where: { id: { in: spots.map(s => s.id) } },
      data: { plantId: null, strain, status: 'OCCUPIED', allocatedAt: new Date(), allocatedBy: userId, clearedAt: new Date(), clearedBy: userId },
    });
  } else {
    const map: Record<string, string> = { cull: 'DESTROYED', flag: 'FLAGGED', restore: 'OCCUPIED', clear: 'EMPTY', harvest: 'HARVESTED' };
    const status = map[action];
    if (!status) throw Object.assign(new Error('Invalid action'), { status: 400 });
    for (const s of spots) {
      const data: any = { status };
      if (action === 'harvest') { data.harvestedAt = new Date(); data.harvestedBy = userId; }
      if (action === 'clear') { data.plantId = null; data.previousPlantId = s.plantId; data.clearedAt = new Date(); data.clearedBy = userId; }
      await prisma.baySpot.update({ where: { id: s.id }, data });
      if (action === 'cull' && s.strain) { await recordMortality(s, `Bulk cull at ${s.spotId}`); mortality++; }
      bayIds.add(s.bayId);
    }
  }

  // recompute currentStrain for every affected bay
  for (const bayId of bayIds) {
    const distinct = await prisma.baySpot.findMany({ where: { bayId, strain: { not: null } }, distinct: ['strain'], select: { strain: true } });
    await prisma.bay.update({ where: { id: bayId }, data: { currentStrain: distinct.length === 1 ? distinct[0].strain : distinct.length > 1 ? 'MIXED' : null } });
  }
  eventBus.emit('BAY_ALLOCATED', { userId, tenantId, entityType: 'Bay', entityId: [...bayIds][0], plantCount: spots.length });
  await logAction({ userId, tenantId, action: 'BULK_SPOT_' + action.toUpperCase(), entityType: 'Bay', entityId: [...bayIds][0], after: { count: spots.length, action, strain: strain || undefined, mortality } });
  // cascade material changes (re-strain / mass cull / mass clear) back to a deviation
  if (action === 'restrain' || ((action === 'cull' || action === 'clear') && mortality > 0)) {
    const summary = action === 'restrain'
      ? `Group re-strain → ${strain}: ${spots.length} pots, ${mortality} plant(s) cleared`
      : `${mortality} plant(s) ${action === 'cull' ? 'culled (destroyed)' : 'cleared'} across ${bayIds.size} bay(s)`;
    await raisePlantChangeDeviation(tenantId, userId, summary, mortality).catch(() => {});
  }
  return { affected: spots.length, action, strain: strain || undefined, mortality };
}

// Pot-level status action (cull / flag / restore / clear). Drives the status light
// in the drill-down. Cull records mortality. Audited via BAY_ALLOCATED.
export async function setSpotStatus(spotId: string, action: string, userId: string, tenantId: string) {
  const map: Record<string, string> = { cull: 'DESTROYED', flag: 'FLAGGED', restore: 'OCCUPIED', clear: 'EMPTY', harvest: 'HARVESTED' };
  const status = map[action];
  if (!status) throw Object.assign(new Error('Invalid action'), { status: 400 });
  const spot = await prisma.baySpot.findUnique({ where: { id: spotId }, include: { bay: { include: { greenhouse: true } } } });
  if (!spot) throw Object.assign(new Error('Pot not found'), { status: 404 });
  const data: any = { status };
  if (action === 'harvest') { data.harvestedAt = new Date(); data.harvestedBy = userId; }
  if (action === 'clear') { data.plantId = null; data.previousPlantId = spot.plantId; data.clearedAt = new Date(); data.clearedBy = userId; }
  const updated = await prisma.baySpot.update({ where: { id: spotId }, data });
  // Cull → record a mortality (1 plant) for traceability
  if (action === 'cull' && spot.strain) {
    await prisma.mortalityRecord.create({
      data: { entityType: 'PLANT', strain: spot.strain, quantity: 1, causeCategory: 'UNKNOWN',
        greenhouseId: spot.bay?.greenhouseId || null, bayId: spot.bayId, plantTag: spot.spotId,
        zone: spot.bay?.greenhouse?.name || null, reportedById: userId, tenantId, notes: `Culled at ${spot.spotId}` },
    });
  }
  eventBus.emit('BAY_ALLOCATED', { userId, tenantId, entityType: 'Bay', entityId: spot.bayId, plantCount: 0 });
  return { spot: updated };
}
