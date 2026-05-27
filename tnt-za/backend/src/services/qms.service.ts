import { prisma } from '../config/db';
import { SeverityLevel } from '@prisma/client';
import { eventBus } from './eventBus';
import { syncSopGovernance } from './sop-governance.service';

// ── SOPs ──

export async function createSOP(data: {
  title: string; content: string; facilityId: string; tenantId: string; userId: string;
  category?: string; rolesRequired?: string[];
}) {
  const sop = await prisma.sOP.create({
    data: {
      title: data.title, content: data.content, version: 1,
      category: data.category || 'GENERAL',
      rolesRequired: data.rolesRequired || undefined,
      tenantId: data.tenantId, facilityId: data.facilityId, approvedById: data.userId,
    },
  });
  eventBus.emit('SOP_CREATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'SOP', entityId: sop.id });
  const governance = await syncSopGovernance(sop.id, data.tenantId, data.userId);
  return { ...sop, governance };
}

export async function listSOPs(query: { tenantId: string; facilityId?: string }) {
  const where: any = { tenantId: query.tenantId, active: true };
  if (query.facilityId) where.facilityId = query.facilityId;
  return prisma.sOP.findMany({
    where,
    include: {
      approvedBy: { select: { name: true } },
      _count: { select: { acknowledgements: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function updateSOP(id: string, data: { content: string; tenantId: string; userId: string; category?: string; rolesRequired?: string[] }) {
  const sop = await prisma.sOP.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!sop) throw Object.assign(new Error('SOP not found'), { status: 404 });

  const updated = await prisma.sOP.update({
    where: { id },
    data: {
      content: data.content,
      category: data.category || sop.category,
      rolesRequired: data.rolesRequired || sop.rolesRequired || undefined,
      version: sop.version + 1,
      approvedById: data.userId,
    },
  });

  eventBus.emit('SOP_UPDATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'SOP', entityId: id });
  const governance = await syncSopGovernance(updated.id, data.tenantId, data.userId);
  return { ...updated, governance };
}

export async function acknowledgeSOP(sopId: string, data: { userId: string; tenantId: string }) {
  const sop = await prisma.sOP.findFirst({ where: { id: sopId, tenantId: data.tenantId } });
  if (!sop) throw Object.assign(new Error('SOP not found'), { status: 404 });

  return prisma.sOPAcknowledgement.upsert({
    where: { sopId_userId_sopVersion: { sopId, userId: data.userId, sopVersion: sop.version } },
    update: { acknowledgedAt: new Date() },
    create: { sopId, userId: data.userId, sopVersion: sop.version },
  });
}

// ── DEVIATIONS ──

export async function createDeviation(data: {
  sopId: string; description: string; severity: SeverityLevel;
  facilityId: string; tenantId: string; userId: string;
}) {
  const deviation = await prisma.deviation.create({
    data: {
      sopId: data.sopId, description: data.description, severity: data.severity,
      facilityId: data.facilityId, raisedById: data.userId,
    },
  });
  eventBus.emit('DEVIATION_RAISED', { userId: data.userId, tenantId: data.tenantId, entityType: 'Deviation', entityId: deviation.id });
  return deviation;
}

export async function listDeviations(query: { tenantId: string; facilityId?: string; open?: boolean; sopId?: string }) {
  const where: any = { facility: { tenantId: query.tenantId } };
  if (query.facilityId) where.facilityId = query.facilityId;
  if (query.open === true) where.closedAt = null;
  if (query.open === false) where.closedAt = { not: null };
  if (query.sopId) where.sopId = query.sopId;

  return prisma.deviation.findMany({
    where,
    include: {
      sop: { select: { title: true } },
      raisedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateDeviation(id: string, data: { rootCause?: string; capa?: string; userId: string; tenantId: string }) {
  return prisma.deviation.update({
    where: { id },
    data: { rootCause: data.rootCause, capa: data.capa },
  });
}

export async function closeDeviation(id: string, data: { userId: string; tenantId: string }) {
  const updated = await prisma.deviation.update({
    where: { id },
    data: { closedAt: new Date() },
  });
  eventBus.emit('DEVIATION_CLOSED', { userId: data.userId, tenantId: data.tenantId, entityType: 'Deviation', entityId: id });
  return updated;
}

// ── EQUIPMENT CALIBRATION ──

export async function createEquipment(data: { equipmentName: string; facilityId: string; userId: string; tenantId: string }) {
  return prisma.equipmentCalibration.create({
    data: { equipmentName: data.equipmentName, facilityId: data.facilityId },
  });
}

export async function calibrateEquipment(id: string, data: { nextDueDays?: number; userId: string }) {
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + (data.nextDueDays || 30));

  return prisma.equipmentCalibration.update({
    where: { id },
    data: { lastCalibrated: new Date(), nextDue, calibratedById: data.userId },
  });
}

export async function listEquipment(facilityId: string) {
  return prisma.equipmentCalibration.findMany({
    where: { facilityId },
    include: { calibratedBy: { select: { name: true } } },
    orderBy: { nextDue: 'asc' },
  });
}
