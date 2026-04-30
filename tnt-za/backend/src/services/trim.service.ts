import { prisma } from '../config/db';
import { eventBus } from './eventBus';

export async function createTrimSession(data: {
  batchId: string; tenantId: string; userId: string;
}) {
  const session = await prisma.trimSession.create({
    data: { batchId: data.batchId, supervisorId: data.userId, tenantId: data.tenantId },
  });
  eventBus.emit('TRIM_SESSION_CREATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'TrimSession', entityId: session.id });
  return session;
}

export async function listTrimSessions(tenantId: string, status?: string) {
  const where: any = { tenantId };
  if (status) where.status = status;
  return prisma.trimSession.findMany({
    where,
    include: { assignments: true, _count: { select: { assignments: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTrimSession(id: string, tenantId: string) {
  return prisma.trimSession.findFirst({
    where: { id, tenantId },
    include: { assignments: { orderBy: { startTime: 'asc' } } },
  });
}

export async function assignTrimmer(data: {
  trimSessionId: string; trimmerId: string; trimmerName: string; weightIn: number;
}) {
  const assignment = await prisma.trimmerAssignment.create({
    data: {
      trimSessionId: data.trimSessionId, trimmerId: data.trimmerId,
      trimmerName: data.trimmerName, weightIn: data.weightIn,
    },
  });

  // Update session total weight in
  await prisma.trimSession.update({
    where: { id: data.trimSessionId },
    data: { totalWeightIn: { increment: data.weightIn } },
  });

  return assignment;
}

export async function completeTrimmerAssignment(id: string, data: {
  weightOut: number; wasteWeight: number; notes?: string;
}) {
  const assignment = await prisma.trimmerAssignment.update({
    where: { id },
    data: {
      weightOut: data.weightOut, wasteWeight: data.wasteWeight,
      status: 'COMPLETED', endTime: new Date(), notes: data.notes,
    },
  });

  // Update session totals
  await prisma.trimSession.update({
    where: { id: assignment.trimSessionId },
    data: {
      totalWeightOut: { increment: data.weightOut },
      totalWaste: { increment: data.wasteWeight },
    },
  });

  return assignment;
}

export async function completeTrimSession(id: string, userId: string) {
  const session = await prisma.trimSession.findUnique({
    where: { id }, include: { assignments: true },
  });
  if (!session) throw Object.assign(new Error('Session not found'), { status: 404 });

  const incomplete = session.assignments.filter(a => a.status !== 'COMPLETED');
  if (incomplete.length > 0) throw Object.assign(new Error(`${incomplete.length} trimmers not complete`), { status: 400 });

  const totalOut = session.totalWeightOut + session.totalWaste;
  const variance = session.totalWeightIn > 0 ? ((session.totalWeightIn - totalOut) / session.totalWeightIn * 100) : 0;

  const updated = await prisma.trimSession.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date(), variance },
  });

  // If variance > 2%, flag anomaly
  if (Math.abs(variance) > 2) {
    eventBus.emit('ANOMALY_DETECTED', {
      anomalyType: 'CONTAINER_WEIGHT_VARIANCE', severity: Math.abs(variance) > 5 ? 'CRITICAL' : 'HIGH',
      entityType: 'TrimSession', entityId: id,
      description: `Trim session variance: ${variance.toFixed(1)}% — IN: ${session.totalWeightIn}g, OUT+WASTE: ${totalOut.toFixed(1)}g`,
      userId, tenantId: session.tenantId,
    });
  }

  return updated;
}
