import { prisma } from '../config/db';
import { AnomalyType, SeverityLevel } from '@prisma/client';
import { eventBus } from './eventBus';

// ── QUOTA ──

export async function getQuota(facilityId: string, tenantId: string) {
  const facility = await prisma.facility.findFirst({ where: { id: facilityId, tenantId } });
  if (!facility) throw Object.assign(new Error('Facility not found'), { status: 404 });

  const pct = facility.quotaAllocated > 0 ? (facility.quotaUsed / facility.quotaAllocated) * 100 : 0;
  let alertLevel: 'normal' | 'warning' | 'critical' | 'exceeded' = 'normal';
  if (pct >= 100) alertLevel = 'exceeded';
  else if (pct >= 95) alertLevel = 'critical';
  else if (pct >= 85) alertLevel = 'warning';

  return { allocated: facility.quotaAllocated, used: facility.quotaUsed, percentage: pct, alertLevel };
}

export async function updateQuota(facilityId: string, data: { annualQuota: number; tenantId: string; userId: string }) {
  const facility = await prisma.facility.findFirst({ where: { id: facilityId } });
  if (!facility) throw Object.assign(new Error('Facility not found'), { status: 404 });

  const updated = await prisma.facility.update({
    where: { id: facilityId },
    data: { quotaAllocated: data.annualQuota },
  });

  // Update quota tracking
  const year = new Date().getFullYear();
  await prisma.quotaTracking.upsert({
    where: { facilityId_year: { facilityId, year } },
    update: { annualQuota: data.annualQuota },
    create: { facilityId, year, annualQuota: data.annualQuota, usedQuota: facility.quotaUsed },
  });

  eventBus.emit('QUOTA_UPDATED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Facility', entityId: facilityId,
    used: facility.quotaUsed, allocated: data.annualQuota,
  });

  return updated;
}

// ── DESTRUCTION ──

export async function createDestruction(data: {
  batchId?: string;
  weight: number;
  reason: string;
  sapsOfficerName: string;
  sapsOfficerBadge: string;
  sapsStation: string;
  photos?: string[];
  facilityId: string;
  tenantId: string;
  userId: string;
}) {
  const destruction = await prisma.destructionEvent.create({
    data: {
      batchId: data.batchId || undefined,
      weight: data.weight,
      reason: data.reason,
      sapsOfficerName: data.sapsOfficerName,
      sapsOfficerBadge: data.sapsOfficerBadge,
      sapsStation: data.sapsStation,
      photosUrl: data.photos || [],
      facilityId: data.facilityId,
      facilityManagerId: data.userId,
    },
  });

  // Reconcile: check if destroyed weight matches batch/plant recorded weight
  if (data.batchId) {
    const batch = await prisma.batch.findUnique({ where: { id: data.batchId } });
    if (batch && Math.abs(batch.totalWeight - data.weight) / batch.totalWeight > 0.02) {
      // >2% discrepancy → anomaly
      await createAnomaly({
        type: AnomalyType.INVENTORY_DISCREPANCY,
        severity: SeverityLevel.HIGH,
        description: `Destruction weight (${data.weight}g) differs from batch ${batch.batchNumber} recorded weight (${batch.totalWeight}g) by ${Math.abs(batch.totalWeight - data.weight).toFixed(1)}g`,
        entityType: 'DestructionEvent',
        entityId: destruction.id,
        tenantId: data.tenantId,
        userId: data.userId,
      });
    }
  }

  eventBus.emit('DESTRUCTION_RECORDED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'DestructionEvent', entityId: destruction.id,
    weight: data.weight, sapsOfficer: data.sapsOfficerName,
  });

  return destruction;
}

export async function listDestructions(tenantId: string) {
  return prisma.destructionEvent.findMany({
    where: { facility: { tenantId } },
    include: {
      batch: { select: { batchNumber: true, strain: true } },
      facility: { select: { name: true } },
      facilityManager: { select: { name: true } },
    },
    orderBy: { witnessedAt: 'desc' },
  });
}

export async function getDestruction(id: string) {
  const d = await prisma.destructionEvent.findUnique({
    where: { id },
    include: { batch: true, facility: true, facilityManager: { select: { name: true } } },
  });
  if (!d) throw Object.assign(new Error('Destruction event not found'), { status: 404 });
  return d;
}

export async function confirmDestruction(id: string, data: { userId: string; tenantId: string }) {
  const d = await prisma.destructionEvent.findUnique({ where: { id } });
  if (!d) throw Object.assign(new Error('Destruction event not found'), { status: 404 });

  return prisma.destructionEvent.update({ where: { id }, data: { confirmed: true } });
}

// ── PERMITS ──

export async function listPermits(facilityId: string) {
  return prisma.permit.findMany({ where: { facilityId }, orderBy: { expiryDate: 'asc' } });
}

export async function createPermit(data: {
  facilityId: string;
  type: any;
  permitNumber: string;
  issuedDate: Date;
  expiryDate: Date;
  conditions?: string;
  tenantId: string;
  userId: string;
}) {
  const permit = await prisma.permit.create({
    data: {
      facilityId: data.facilityId,
      type: data.type,
      permitNumber: data.permitNumber,
      issuedDate: data.issuedDate,
      expiryDate: data.expiryDate,
      conditions: data.conditions,
    },
  });

  // Check if expiring soon
  const daysToExpiry = Math.floor((data.expiryDate.getTime() - Date.now()) / 86400000);
  if (daysToExpiry <= 90) {
    eventBus.emit('PERMIT_EXPIRING', {
      userId: data.userId, tenantId: data.tenantId,
      entityType: 'Permit', entityId: permit.id,
      permitId: permit.id, daysRemaining: daysToExpiry,
    });
  }

  return permit;
}

export async function updatePermit(id: string, data: any) {
  return prisma.permit.update({ where: { id }, data });
}

// ── ANOMALY HELPER ──

async function createAnomaly(data: {
  type: AnomalyType;
  severity: SeverityLevel;
  description: string;
  entityType: string;
  entityId: string;
  tenantId: string;
  userId: string;
}) {
  const anomaly = await prisma.anomaly.create({
    data: {
      type: data.type,
      severity: data.severity,
      description: data.description,
      entityType: data.entityType,
      entityId: data.entityId,
      tenantId: data.tenantId,
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
      title: `ANOMALY: ${data.type}`,
      message: data.description,
      link: `/compliance`,
    })),
  });

  eventBus.emit('ANOMALY_DETECTED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: data.entityType, entityId: data.entityId,
    anomalyType: data.type, severity: data.severity,
  });

  return anomaly;
}
