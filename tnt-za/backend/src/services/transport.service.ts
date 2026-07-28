import { prisma } from '../config/db';
import { AnomalyType, SeverityLevel } from '@prisma/client';
import { eventBus } from './eventBus';

export async function createManifest(data: {
  batchIds: string[];
  originFacilityId: string;
  destFacilityId: string;
  transporter: string;
  vehicleReg: string;
  expectedDuration: number;
  // Driver
  driverName?: string;
  driverIdNumber?: string;
  driverPhone?: string;
  driverLicenseExpiry?: string;
  tenantId: string;
  userId: string;
}) {
  // LAB GATE: dispatch is blocked unless every batch on the manifest has a valid,
  // released COA (SAHPRA expectation — no product leaves the facility un-tested).
  // batchIds may carry either batch ids or batchNumbers (the UI accepts free text).
  const ids = (data.batchIds || []).map(s => String(s).trim()).filter(Boolean);
  if (!ids.length) throw Object.assign(new Error('At least one batch is required'), { status: 400 });
  const batches = await prisma.batch.findMany({
    where: { tenantId: data.tenantId, OR: [{ id: { in: ids } }, { batchNumber: { in: ids } }] },
    include: { coas: { where: { valid: true }, select: { id: true } } },
  });
  const found = new Set<string>();
  batches.forEach(b => { found.add(b.id); found.add(b.batchNumber); });
  const unknown = ids.filter(x => !found.has(x));
  const ungated = batches.filter(b => b.status !== 'RELEASED' || b.coas.length === 0)
    .map(b => b.batchNumber);
  if (unknown.length || ungated.length) {
    const parts = [];
    if (unknown.length) parts.push(`unknown batch(es): ${unknown.join(', ')}`);
    if (ungated.length) parts.push(`no valid released COA: ${ungated.join(', ')}`);
    throw Object.assign(
      new Error(`Dispatch blocked — ${parts.join('; ')}. A batch must have a passed lab result and issued COA before it can be dispatched.`),
      { status: 400 },
    );
  }

  const manifest = await prisma.transportManifest.create({
    data: {
      batchIds: data.batchIds,
      originFacilityId: data.originFacilityId,
      destFacilityId: data.destFacilityId,
      transporter: data.transporter,
      vehicleReg: data.vehicleReg,
      expectedDuration: data.expectedDuration,
      driverName: data.driverName,
      driverIdNumber: data.driverIdNumber,
      driverPhone: data.driverPhone,
      driverLicenseExpiry: data.driverLicenseExpiry ? new Date(data.driverLicenseExpiry) : undefined,
    },
  });

  eventBus.emit('TRANSPORT_CREATED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'TransportManifest', entityId: manifest.id,
  });

  return manifest;
}

export async function attachDriverLicense(id: string, photoUrl: string, userId: string, tenantId: string) {
  const manifest = await prisma.transportManifest.update({
    where: { id },
    data: { driverLicenseUrl: photoUrl },
  });
  eventBus.emit('TRANSPORT_DRIVER_LICENSE_UPLOADED', { userId, tenantId, entityType: 'TransportManifest', entityId: id });
  return manifest;
}

export async function recordVehicleInspection(id: string, data: {
  passed: boolean;
  notes?: string;
  checks?: Record<string, boolean>;
  photoUrl?: string;
  userId: string;
  tenantId: string;
}) {
  const manifest = await prisma.transportManifest.update({
    where: { id },
    data: {
      vehicleInspectedAt: new Date(),
      vehicleInspectedById: data.userId,
      vehicleInspectionPassed: data.passed,
      vehicleInspectionNotes: data.notes,
      vehicleInspectionChecks: data.checks ?? undefined,
      vehicleInspectionPhotoUrl: data.photoUrl,
    },
  });
  eventBus.emit(
    data.passed ? 'TRANSPORT_VEHICLE_INSPECTED_PASS' : 'TRANSPORT_VEHICLE_INSPECTED_FAIL',
    { userId: data.userId, tenantId: data.tenantId, entityType: 'TransportManifest', entityId: id },
  );
  return manifest;
}

export async function departManifest(id: string, data: { userId: string; tenantId: string }) {
  const manifest = await prisma.transportManifest.findUnique({ where: { id } });
  if (!manifest) throw Object.assign(new Error('Manifest not found'), { status: 404 });

  const updated = await prisma.transportManifest.update({
    where: { id },
    data: { departedAt: new Date() },
  });

  eventBus.emit('TRANSPORT_DEPARTED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'TransportManifest', entityId: id,
    manifestId: id, origin: manifest.originFacilityId, destination: manifest.destFacilityId,
  });

  return updated;
}

export async function arriveManifest(id: string, data: { userId: string; tenantId: string }) {
  const manifest = await prisma.transportManifest.findUnique({ where: { id } });
  if (!manifest) throw Object.assign(new Error('Manifest not found'), { status: 404 });
  if (!manifest.departedAt) throw Object.assign(new Error('Manifest has not departed yet'), { status: 400 });

  const arrivedAt = new Date();
  const actualDuration = Math.floor((arrivedAt.getTime() - manifest.departedAt.getTime()) / 60000);

  const updated = await prisma.transportManifest.update({
    where: { id },
    data: { arrivedAt, actualDuration },
  });

  // Check if late (>130% of expected)
  if (actualDuration > manifest.expectedDuration * 1.3) {
    const anomaly = await prisma.anomaly.create({
      data: {
        type: AnomalyType.TRANSPORT_TIME,
        severity: SeverityLevel.HIGH,
        description: `Transport ${manifest.vehicleReg} took ${actualDuration}min (expected ${manifest.expectedDuration}min, ${Math.round(actualDuration / manifest.expectedDuration * 100)}% of expected)`,
        entityType: 'TransportManifest',
        entityId: id,
        tenantId: data.tenantId,
      },
    });

    const seniors = await prisma.user.findMany({
      where: { tenantId: data.tenantId, role: { in: ['FACILITY_MANAGER', 'SECURITY_OFFICER', 'TENANT_ADMIN', 'SUPER_ADMIN'] }, active: true },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: seniors.map(u => ({
        userId: u.id,
        title: 'TRANSPORT DELAY',
        message: anomaly.description,
        link: `/security`,
      })),
    });

    eventBus.emit('ANOMALY_DETECTED', {
      userId: data.userId, tenantId: data.tenantId,
      entityType: 'TransportManifest', entityId: id,
      anomalyType: AnomalyType.TRANSPORT_TIME,
    });
  }

  eventBus.emit('TRANSPORT_ARRIVED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'TransportManifest', entityId: id,
    manifestId: id, actualDuration, expectedDuration: manifest.expectedDuration,
  });

  return updated;
}

export async function listManifests(tenantId: string) {
  return prisma.transportManifest.findMany({
    where: { originFacility: { tenantId } },
    include: {
      originFacility: { select: { name: true } },
      destFacility: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
