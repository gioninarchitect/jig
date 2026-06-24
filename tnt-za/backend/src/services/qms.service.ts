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

  // Snapshot the CURRENT content before overwriting — every amendment is now revertible.
  await prisma.sOPVersion.create({ data: { sopId: id, version: sop.version, content: sop.content, editedById: data.userId } }).catch(() => {});

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

// Previous content snapshots for an SOP (newest first) — QA can read or restore any of them.
export async function listSopVersions(id: string, tenantId: string) {
  const sop = await prisma.sOP.findFirst({ where: { id, tenantId } });
  if (!sop) throw Object.assign(new Error('SOP not found'), { status: 404 });
  return prisma.sOPVersion.findMany({ where: { sopId: id }, orderBy: { version: 'desc' } });
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
  deviationType?: string; referenceId?: string; raisedByName?: string; area?: string;
  department?: string; phase?: string;
  procedureRef?: string; impactOnQuality?: string; level?: number;
  capaRequired?: boolean; capaNo?: string; actionsRequired?: string;
}) {
  // ILCO levels: 1 Critical · 2 Serious · 3 Minor — derive from severity if not given
  const level = data.level ?? (data.severity === 'CRITICAL' ? 1 : data.severity === 'HIGH' ? 2 : 3);
  const deviation = await prisma.deviation.create({
    data: {
      sopId: data.sopId, description: data.description, severity: data.severity,
      facilityId: data.facilityId, raisedById: data.userId,
      deviationType: data.deviationType, referenceId: data.referenceId, raisedByName: data.raisedByName,
      area: data.area, department: data.department, phase: data.phase, procedureRef: data.procedureRef, impactOnQuality: data.impactOnQuality,
      level, capaRequired: data.capaRequired, capaNo: data.capaNo, actionsRequired: data.actionsRequired,
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

export async function updateDeviation(id: string, data: any) {
  const pick = (k: string) => (data[k] !== undefined ? data[k] : undefined);
  return prisma.deviation.update({
    where: { id },
    data: {
      rootCause: pick('rootCause'), capa: pick('capa'),
      deviationType: pick('deviationType'), referenceId: pick('referenceId'), raisedByName: pick('raisedByName'),
      area: pick('area'), procedureRef: pick('procedureRef'), impactOnQuality: pick('impactOnQuality'),
      level: pick('level'), capaRequired: pick('capaRequired'), capaNo: pick('capaNo'),
      actionsRequired: pick('actionsRequired'), investigations: pick('investigations'),
    },
  });
}

// Deviation Approval Section — Quality Assurance Manager signs off the deviation.
export async function approveDeviation(id: string, data: { userId: string; name?: string; tenantId: string }) {
  const updated = await prisma.deviation.update({
    where: { id },
    data: { qaApprovedById: data.userId, qaApprovedName: data.name, qaApprovedAt: new Date() },
  });
  eventBus.emit('DEVIATION_APPROVED', { userId: data.userId, tenantId: data.tenantId, entityType: 'Deviation', entityId: id });
  return updated;
}

// Deviation Close-off Section — Responsible Pharmacist signs the close-off.
// GMP segregation of duties: QA must approve BEFORE the RP can close. Block otherwise.
export async function closeDeviation(id: string, data: { userId: string; name?: string; tenantId: string }) {
  const dev = await prisma.deviation.findFirst({ where: { id, facility: { tenantId: data.tenantId } } });
  if (!dev) throw Object.assign(new Error('Deviation not found'), { status: 404 });
  if (!dev.qaApprovedById) throw Object.assign(new Error('QA Manager must approve this deviation before the RP can close it off.'), { status: 409 });
  // GMP: Critical (Level 1) & Serious (Level 2) deviations require a documented CAPA before close. Minor (Level 3) does not.
  const needsCapa = dev.capaRequired ?? (dev.level != null && dev.level <= 2);
  if (needsCapa && !(dev.capa || dev.capaNo || dev.actionsRequired)) {
    throw Object.assign(new Error(`Level ${dev.level ?? '1/2'} (Critical/Serious) deviation — a CAPA (corrective & preventive action) must be recorded before it can be closed. Level 3 (Minor) deviations don't need one.`), { status: 409 });
  }
  const updated = await prisma.deviation.update({
    where: { id },
    data: { closedAt: new Date(), rpClosedById: data.userId, rpClosedName: data.name, rpClosedAt: new Date() },
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

// ── QMS REGISTER (generic) — Legal, Validations, Risk, Stability, Barcode, Engineering, Procurement ──

export async function listQmsRecords(q: { tenantId: string; module?: string }) {
  const where: any = { tenantId: q.tenantId };
  if (q.module) where.module = q.module;
  return prisma.qmsRecord.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function createQmsRecord(data: {
  tenantId: string; facilityId?: string | null; userId: string;
  module: string; recordType?: string; refNo?: string; title: string;
  description?: string; severity?: string; grade?: string; dueDate?: string; data?: any; ownerName?: string;
}) {
  if (!data.module || !data.title) throw Object.assign(new Error('module and title are required'), { status: 400 });
  const rec = await prisma.qmsRecord.create({
    data: {
      tenantId: data.tenantId, facilityId: data.facilityId ?? null, raisedById: data.userId,
      module: data.module, recordType: data.recordType, refNo: data.refNo, title: data.title,
      description: data.description, severity: data.severity, grade: data.grade,
      ownerName: data.ownerName, data: data.data ?? undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });
  eventBus.emit('QMS_RECORD_CREATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'QmsRecord', entityId: rec.id });
  return rec;
}

export async function updateQmsRecord(id: string, tenantId: string, userId: string, patch: any) {
  const rec = await prisma.qmsRecord.findFirst({ where: { id, tenantId } });
  if (!rec) throw Object.assign(new Error('QMS record not found'), { status: 404 });
  const pick = (k: string) => (patch[k] !== undefined ? patch[k] : undefined);
  const status = pick('status');
  const updated = await prisma.qmsRecord.update({
    where: { id },
    data: {
      title: pick('title'), description: pick('description'), recordType: pick('recordType'),
      refNo: pick('refNo'), severity: pick('severity'), grade: pick('grade'),
      ownerName: pick('ownerName'), data: pick('data'), status,
      dueDate: patch.dueDate !== undefined ? (patch.dueDate ? new Date(patch.dueDate) : null) : undefined,
      closedAt: status === 'CLOSED' ? new Date() : status && status !== 'CLOSED' ? null : undefined,
    },
  });
  eventBus.emit('QMS_RECORD_UPDATED', { userId, tenantId, entityType: 'QmsRecord', entityId: id });
  return updated;
}
