import { prisma } from '../config/db';
import { AnomalyType, SeverityLevel } from '@prisma/client';
import { eventBus } from './eventBus';

export async function listAnomalies(query: {
  tenantId: string;
  type?: string;
  severity?: string;
  resolved?: string;
}) {
  const where: any = { tenantId: query.tenantId };
  if (query.type) where.type = query.type;
  if (query.severity) where.severity = query.severity;
  if (query.resolved === 'true') where.resolvedAt = { not: null };
  if (query.resolved === 'false') where.resolvedAt = null;

  return prisma.anomaly.findMany({
    where,
    include: { resolvedBy: { select: { id: true, name: true } } },
    orderBy: { detectedAt: 'desc' },
  });
}

export async function resolveAnomaly(id: string, data: {
  investigationNotes: string;
  tenantId: string;
  userId: string;
}) {
  if (!data.investigationNotes?.trim()) {
    throw Object.assign(new Error('Investigation notes are required to resolve an anomaly'), { status: 400 });
  }

  const anomaly = await prisma.anomaly.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!anomaly) throw Object.assign(new Error('Anomaly not found'), { status: 404 });
  if (anomaly.resolvedAt) throw Object.assign(new Error('Anomaly already resolved'), { status: 400 });

  const updated = await prisma.anomaly.update({
    where: { id },
    data: {
      resolvedAt: new Date(),
      resolvedById: data.userId,
      investigationNotes: data.investigationNotes,
    },
  });

  eventBus.emit('ANOMALY_RESOLVED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Anomaly', entityId: id,
    anomalyId: id, investigationNotes: data.investigationNotes,
  });

  return updated;
}

export async function checkStaleContainers(tenantId: string, hoursThreshold = 24) {
  const threshold = new Date(Date.now() - hoursThreshold * 3600_000);

  const containers = await prisma.container.findMany({
    where: {
      tenantId,
      status: { in: ['LOADED', 'IN_TRANSIT'] },
    },
    include: {
      events: { orderBy: { timestamp: 'desc' }, take: 1 },
    },
  });

  const stale = containers.filter(c => {
    const lastEvent = c.events[0];
    return !lastEvent || lastEvent.timestamp < threshold;
  });

  const created = [];
  for (const c of stale) {
    // Check if already flagged (open anomaly for this container)
    const existing = await prisma.anomaly.findFirst({
      where: { entityId: c.id, type: AnomalyType.CONTAINER_STALE, resolvedAt: null },
    });
    if (existing) continue;

    const anomaly = await prisma.anomaly.create({
      data: {
        type: AnomalyType.CONTAINER_STALE,
        severity: SeverityLevel.LOW,
        description: `Container ${c.containerId} has had no events for >${hoursThreshold} hours`,
        entityType: 'Container',
        entityId: c.id,
        tenantId,
      },
    });

    const fms = await prisma.user.findMany({
      where: { tenantId, role: 'FACILITY_MANAGER', active: true },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: fms.map(u => ({
        userId: u.id,
        title: `STALE: ${c.containerId}`,
        message: `No activity for >${hoursThreshold}h. Check curing schedule.`,
        link: `/containers/${c.id}`,
      })),
    });

    created.push(anomaly);
  }

  return { checked: containers.length, stale: stale.length, newAnomalies: created.length };
}
