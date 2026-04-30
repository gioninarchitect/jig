import { prisma } from '../config/db';
import { PlantPhase, AnomalyType, SeverityLevel } from '@prisma/client';
import { PLANT_PHASE_ORDER } from '../config/constants';
import { eventBus } from './eventBus';
import { sha256 } from '../utils/hash';

function nextPlantId(): string {
  return `ZA-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
}

function generateRfid(): string {
  return `RFID-${sha256(String(Date.now() + Math.random())).substring(0, 12).toUpperCase()}`;
}

export async function registerPlant(data: {
  strain: string;
  facilityId: string;
  zoneId: string;
  motherPlantId?: string;
  tenantId: string;
  userId: string;
}) {
  // Check quota
  const facility = await prisma.facility.findUnique({ where: { id: data.facilityId } });
  if (!facility) throw Object.assign(new Error('Facility not found'), { status: 404 });
  if (facility.quotaUsed >= facility.quotaAllocated) {
    throw Object.assign(new Error(`Quota exceeded: ${facility.quotaUsed}/${facility.quotaAllocated} plants allocated`), { status: 403 });
  }

  const identifier = nextPlantId();
  const rfidTag = generateRfid();

  const plant = await prisma.plant.create({
    data: {
      identifier,
      rfidTag,
      qrCode: `QR-${identifier}`,
      strain: data.strain,
      phase: PlantPhase.SEEDLING,
      weightsJson: {},
      tenantId: data.tenantId,
      facilityId: data.facilityId,
      zoneId: data.zoneId,
      handlerId: data.userId,
      motherPlantId: data.motherPlantId || undefined,
    },
  });

  // Increment quota
  await prisma.facility.update({
    where: { id: data.facilityId },
    data: { quotaUsed: { increment: 1 } },
  });

  eventBus.emit('PLANT_REGISTERED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Plant', entityId: plant.id,
    plantId: plant.id, strain: data.strain, facilityId: data.facilityId,
  });

  return plant;
}

export async function listPlants(query: {
  tenantId: string;
  page?: number;
  limit?: number;
  phase?: string;
  strain?: string;
  facilityId?: string;
  zoneId?: string;
  search?: string;
  status?: string;
}) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 25, 100);
  const where: any = { tenantId: query.tenantId };

  if (query.phase) where.phase = query.phase;
  if (query.strain) where.strain = { contains: query.strain, mode: 'insensitive' };
  if (query.facilityId) where.facilityId = query.facilityId;
  if (query.zoneId) where.zoneId = query.zoneId;
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { identifier: { contains: query.search, mode: 'insensitive' } },
      { rfidTag: { contains: query.search, mode: 'insensitive' } },
      { strain: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [plants, total] = await Promise.all([
    prisma.plant.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { zone: true, handler: { select: { id: true, name: true } } },
    }),
    prisma.plant.count({ where }),
  ]);

  return { plants, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getPlant(id: string, tenantId: string) {
  const plant = await prisma.plant.findFirst({
    where: { id, tenantId },
    include: {
      zone: true,
      facility: true,
      handler: { select: { id: true, name: true } },
      motherPlant: { select: { id: true, identifier: true, strain: true } },
      children: { select: { id: true, identifier: true, strain: true, phase: true } },
      batchPlants: { include: { batch: { select: { id: true, batchNumber: true, status: true } } } },
    },
  });
  if (!plant) throw Object.assign(new Error('Plant not found'), { status: 404 });
  return plant;
}

export async function transitionPhase(id: string, data: {
  tenantId: string;
  userId: string;
  weight?: number;
}) {
  const plant = await prisma.plant.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!plant) throw Object.assign(new Error('Plant not found'), { status: 404 });

  const currentIdx = PLANT_PHASE_ORDER.indexOf(plant.phase as any);
  if (currentIdx === -1 || currentIdx >= PLANT_PHASE_ORDER.length - 1) {
    throw Object.assign(new Error(`Cannot transition from ${plant.phase}`), { status: 400 });
  }

  const nextPhase = PLANT_PHASE_ORDER[currentIdx + 1] as PlantPhase;
  const weightRequired = ['HARVESTED', 'DRYING', 'CURING', 'PACKAGED'].includes(nextPhase);
  if (weightRequired && !data.weight) {
    throw Object.assign(new Error(`Weight is required for ${nextPhase} phase`), { status: 400 });
  }

  const weights = (plant.weightsJson as Record<string, number>) || {};
  if (data.weight) weights[nextPhase] = data.weight;

  const updated = await prisma.plant.update({
    where: { id },
    data: {
      phase: nextPhase,
      weightsJson: weights,
      handlerId: data.userId,
    },
  });

  // ANOMALY RULE: WEIGHT_LOSS — check if phase transition weight loss > 15%
  if (data.weight && weights[plant.phase as string]) {
    const prevWeight = weights[plant.phase as string];
    const loss = (prevWeight - data.weight) / prevWeight;
    if (prevWeight > 0 && loss > 0.15) {
      const pct = (loss * 100).toFixed(1);
      await prisma.anomaly.create({
        data: {
          type: AnomalyType.WEIGHT_LOSS,
          severity: loss > 0.30 ? SeverityLevel.CRITICAL : SeverityLevel.HIGH,
          description: `Plant ${plant.identifier} lost ${pct}% during ${plant.phase} → ${nextPhase} (${prevWeight.toFixed(0)}g → ${data.weight.toFixed(0)}g)`,
          entityType: 'Plant', entityId: id, tenantId: data.tenantId,
        },
      });
      // Notify senior roles
      const seniors = await prisma.user.findMany({
        where: { tenantId: data.tenantId, role: { in: ['FACILITY_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN'] }, active: true },
        select: { id: true },
      });
      await prisma.notification.createMany({
        data: seniors.map(u => ({
          userId: u.id,
          title: `WEIGHT LOSS: ${plant.identifier}`,
          message: `${pct}% loss during ${plant.phase} → ${nextPhase}. ${prevWeight.toFixed(0)}g → ${data.weight!.toFixed(0)}g`,
          link: `/plants/${id}`,
        })),
      });
      eventBus.emit('ANOMALY_DETECTED', {
        userId: data.userId, tenantId: data.tenantId,
        entityType: 'Plant', entityId: id, anomalyType: AnomalyType.WEIGHT_LOSS,
      });
    }
  }

  eventBus.emit('PLANT_PHASE_CHANGED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Plant', entityId: id,
    plantId: id, from: plant.phase, to: nextPhase, weight: data.weight,
    before: { phase: plant.phase }, after: { phase: nextPhase },
  });

  return updated;
}

export async function flagPlant(id: string, data: { tenantId: string; userId: string; reason: string }) {
  const plant = await prisma.plant.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!plant) throw Object.assign(new Error('Plant not found'), { status: 404 });

  const updated = await prisma.plant.update({
    where: { id },
    data: { status: 'FLAGGED', flagReason: data.reason },
  });

  eventBus.emit('PLANT_FLAGGED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Plant', entityId: id, reason: data.reason,
  });

  return updated;
}

export async function scanPlant(id: string, data: { tenantId: string; userId: string; zoneId: string }) {
  const plant = await prisma.plant.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!plant) throw Object.assign(new Error('Plant not found'), { status: 404 });

  const updated = await prisma.plant.update({
    where: { id },
    data: { zoneId: data.zoneId, handlerId: data.userId },
  });

  eventBus.emit('PLANT_SCANNED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Plant', entityId: id, zoneId: data.zoneId,
  });

  return updated;
}

export async function getGenealogy(id: string, tenantId: string) {
  const plant = await prisma.plant.findFirst({
    where: { id, tenantId },
    include: {
      motherPlant: { include: { children: { select: { id: true, identifier: true, strain: true, phase: true } } } },
      children: { select: { id: true, identifier: true, strain: true, phase: true } },
    },
  });
  if (!plant) throw Object.assign(new Error('Plant not found'), { status: 404 });
  return plant;
}

export async function getPlantStats(tenantId: string) {
  const [byPhase, byStrain, total] = await Promise.all([
    prisma.plant.groupBy({ by: ['phase'], where: { tenantId }, _count: true }),
    prisma.plant.groupBy({ by: ['strain'], where: { tenantId }, _count: true }),
    prisma.plant.count({ where: { tenantId } }),
  ]);

  const plantsByPhase: Record<string, number> = {};
  byPhase.forEach((r) => { plantsByPhase[r.phase] = r._count; });

  const plantsByStrain: Record<string, number> = {};
  byStrain.forEach((r) => { plantsByStrain[r.strain] = r._count; });

  return { total, plantsByPhase, plantsByStrain };
}
