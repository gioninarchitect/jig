import { prisma } from '../config/db';
import { ContainerType, ContainerStatus, ContainerEventType, AnomalyType, SeverityLevel } from '@prisma/client';
import { WEIGHT_VARIANCE_THRESHOLDS } from '../config/constants';
import { eventBus } from './eventBus';
import { sha256 } from '../utils/hash';

async function getNextContainerId(type: ContainerType): Promise<string> {
  const count = await prisma.container.count({ where: { containerType: type } });
  return `${type}-${String(count + 1).padStart(3, '0')}`;
}

async function checkWeightVariance(container: any, newWeight: number, userId: string, tenantId: string) {
  // Get last weight event
  const lastEvent = await prisma.containerEvent.findFirst({
    where: { containerId: container.id, weight: { not: null } },
    orderBy: { timestamp: 'desc' },
  });

  if (!lastEvent?.weight || lastEvent.weight <= 0) return;
  if (newWeight <= 0) return;

  const prevWeight = lastEvent.weight;
  const variance = (prevWeight - newWeight) / prevWeight;
  const threshold = WEIGHT_VARIANCE_THRESHOLDS[container.containerType] || 0.05;

  if (variance > threshold) {
    const pct = (variance * 100).toFixed(1);

    // Create anomaly
    const anomaly = await prisma.anomaly.create({
      data: {
        type: AnomalyType.CONTAINER_WEIGHT_VARIANCE,
        severity: variance > 0.25 ? SeverityLevel.CRITICAL : SeverityLevel.HIGH,
        description: `Container ${container.containerId} weight variance: ${prevWeight.toFixed(1)}g → ${newWeight.toFixed(1)}g (${pct}% loss, threshold ${(threshold * 100).toFixed(0)}%)`,
        entityType: 'Container',
        entityId: container.id,
        tenantId,
      },
    });

    // Notify ALL senior roles (FM + TENANT_ADMIN + SUPER_ADMIN)
    const seniorUsers = await prisma.user.findMany({
      where: { tenantId, role: { in: ['FACILITY_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN'] }, active: true },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: seniorUsers.map((u) => ({
        userId: u.id,
        title: `WEIGHT VARIANCE: ${container.containerId}`,
        message: `${prevWeight.toFixed(1)}g → ${newWeight.toFixed(1)}g (${pct}% loss). Immediate investigation required.`,
        link: `/containers/${container.id}`,
      })),
    });

    eventBus.emit('ANOMALY_DETECTED', {
      userId, tenantId,
      entityType: 'Container', entityId: container.id,
      anomalyType: AnomalyType.CONTAINER_WEIGHT_VARIANCE,
      severity: anomaly.severity,
      anomalyId: anomaly.id,
    });
  }
}

async function checkZoneMismatch(container: any, scannedZoneId: string, userId: string, tenantId: string) {
  if (container.currentZoneId && container.currentZoneId !== scannedZoneId) {
    const anomaly = await prisma.anomaly.create({
      data: {
        type: AnomalyType.CONTAINER_ZONE_MISMATCH,
        severity: SeverityLevel.MEDIUM,
        description: `Container ${container.containerId} scanned in unexpected zone`,
        entityType: 'Container',
        entityId: container.id,
        tenantId,
      },
    });

    const seniorUsers = await prisma.user.findMany({
      where: { tenantId, role: { in: ['FACILITY_MANAGER', 'TENANT_ADMIN'] }, active: true },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: seniorUsers.map((u) => ({
        userId: u.id,
        title: `ZONE MISMATCH: ${container.containerId}`,
        message: `Container scanned in wrong zone. Expected zone may differ from actual location.`,
        link: `/containers/${container.id}`,
      })),
    });

    eventBus.emit('ANOMALY_DETECTED', {
      userId, tenantId, entityType: 'Container', entityId: container.id,
      anomalyType: AnomalyType.CONTAINER_ZONE_MISMATCH,
    });
  }
}

export async function registerContainer(data: {
  containerType: ContainerType;
  facilityId: string;
  batchId?: string;
  tenantId: string;
  userId: string;
}) {
  const containerId = await getNextContainerId(data.containerType);

  const container = await prisma.container.create({
    data: {
      containerId,
      qrCode: `QR-${containerId}`,
      containerType: data.containerType,
      status: ContainerStatus.EMPTY,
      tenantId: data.tenantId,
      facilityId: data.facilityId,
      batchId: data.batchId || undefined,
    },
  });

  eventBus.emit('CONTAINER_REGISTERED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Container', entityId: container.id,
  });

  return container;
}

export async function listContainers(query: {
  tenantId: string;
  batchId?: string;
  zoneId?: string;
  status?: string;
  containerType?: string;
}) {
  const where: any = { tenantId: query.tenantId };
  if (query.batchId) where.batchId = query.batchId;
  if (query.zoneId) where.currentZoneId = query.zoneId;
  if (query.status) where.status = query.status;
  if (query.containerType) where.containerType = query.containerType;

  return prisma.container.findMany({
    where,
    include: {
      currentZone: true,
      batch: { select: { id: true, batchNumber: true } },
      events: { orderBy: { timestamp: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getContainer(id: string, tenantId: string) {
  const container = await prisma.container.findFirst({
    where: { id, tenantId },
    include: {
      currentZone: true,
      batch: true,
      facility: true,
      events: {
        orderBy: { timestamp: 'asc' },
        include: {
          fromZone: { select: { id: true, name: true } },
          toZone: { select: { id: true, name: true } },
          outgoingHandler: { select: { id: true, name: true } },
          incomingHandler: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!container) throw Object.assign(new Error('Container not found'), { status: 404 });
  return container;
}

export async function loadContainer(id: string, data: {
  weight: number;
  weightUnit: string;
  zoneId: string;
  tenantId: string;
  userId: string;
}) {
  const container = await prisma.container.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!container) throw Object.assign(new Error('Container not found'), { status: 404 });

  const event = await prisma.containerEvent.create({
    data: {
      eventType: ContainerEventType.LOAD,
      weight: data.weight,
      weightUnit: data.weightUnit,
      containerId: id,
      toZoneId: data.zoneId,
      outgoingHandlerId: data.userId,
    },
  });

  await prisma.container.update({
    where: { id },
    data: { status: ContainerStatus.LOADED, currentZoneId: data.zoneId },
  });

  eventBus.emit('CONTAINER_LOADED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Container', entityId: id,
    weight: data.weight, zoneId: data.zoneId,
  });

  return event;
}

export async function unloadContainer(id: string, data: {
  weight: number;
  weightUnit: string;
  zoneId: string;
  tenantId: string;
  userId: string;
}) {
  const container = await prisma.container.findFirst({
    where: { id, tenantId: data.tenantId },
    include: { events: { orderBy: { timestamp: 'desc' }, take: 1 } },
  });
  if (!container) throw Object.assign(new Error('Container not found'), { status: 404 });

  const event = await prisma.containerEvent.create({
    data: {
      eventType: ContainerEventType.UNLOAD,
      weight: data.weight,
      weightUnit: data.weightUnit,
      containerId: id,
      fromZoneId: data.zoneId,
      outgoingHandlerId: data.userId,
    },
  });

  await prisma.container.update({
    where: { id },
    data: { status: ContainerStatus.EMPTY },
  });

  // CRITICAL: Check weight variance
  await checkWeightVariance(container, data.weight, data.userId, data.tenantId);

  eventBus.emit('CONTAINER_UNLOADED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Container', entityId: id,
    weight: data.weight, zoneId: data.zoneId,
  });

  return event;
}

export async function moveContainer(id: string, data: {
  toZoneId: string;
  weight: number;
  tenantId: string;
  userId: string;
}) {
  const container = await prisma.container.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!container) throw Object.assign(new Error('Container not found'), { status: 404 });

  const event = await prisma.containerEvent.create({
    data: {
      eventType: ContainerEventType.MOVE,
      weight: data.weight,
      weightUnit: 'g',
      containerId: id,
      fromZoneId: container.currentZoneId,
      toZoneId: data.toZoneId,
      outgoingHandlerId: data.userId,
    },
  });

  await prisma.container.update({
    where: { id },
    data: { currentZoneId: data.toZoneId },
  });

  // Check weight variance and zone mismatch
  await checkWeightVariance(container, data.weight, data.userId, data.tenantId);
  await checkZoneMismatch(container, data.toZoneId, data.userId, data.tenantId);

  eventBus.emit('CONTAINER_MOVED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Container', entityId: id,
    fromZone: container.currentZoneId, toZone: data.toZoneId, weight: data.weight,
  });

  return event;
}

export async function handoverContainer(id: string, data: {
  incomingHandlerId: string;
  weight: number;
  tenantId: string;
  userId: string;
}) {
  const container = await prisma.container.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!container) throw Object.assign(new Error('Container not found'), { status: 404 });

  const event = await prisma.containerEvent.create({
    data: {
      eventType: ContainerEventType.HANDOVER,
      weight: data.weight,
      weightUnit: 'g',
      containerId: id,
      fromZoneId: container.currentZoneId,
      toZoneId: container.currentZoneId,
      outgoingHandlerId: data.userId,
      incomingHandlerId: data.incomingHandlerId,
    },
  });

  // Check weight variance
  await checkWeightVariance(container, data.weight, data.userId, data.tenantId);

  eventBus.emit('CONTAINER_HANDOVER', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Container', entityId: id,
    fromHandler: data.userId, toHandler: data.incomingHandlerId, weight: data.weight,
  });

  return event;
}

export async function getReconciliation(batchId: string, tenantId: string) {
  const batch = await prisma.batch.findFirst({ where: { id: batchId, tenantId } });
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

  const containers = await prisma.container.findMany({
    where: { batchId, tenantId },
    include: {
      events: { orderBy: { timestamp: 'desc' }, take: 1, where: { weight: { not: null } } },
    },
  });

  const currentTotal = containers.reduce((sum, c) => {
    const lastWeight = c.events[0]?.weight || 0;
    return sum + lastWeight;
  }, 0);

  return {
    batchNumber: batch.batchNumber,
    harvestWeight: batch.totalWeight,
    currentWeight: currentTotal,
    variance: batch.totalWeight - currentTotal,
    variancePercent: batch.totalWeight > 0 ? ((batch.totalWeight - currentTotal) / batch.totalWeight * 100) : 0,
    containers: containers.map((c) => ({
      containerId: c.containerId,
      type: c.containerType,
      status: c.status,
      lastWeight: c.events[0]?.weight || 0,
    })),
  };
}
