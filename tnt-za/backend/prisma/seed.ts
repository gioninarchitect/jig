import { PrismaClient, UserRole, PlantPhase, BatchStatus, ContainerType, ContainerStatus, ContainerEventType, ZoneType, PermitType, AnomalyType, SeverityLevel, COAStatus } from '@prisma/client';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function hashChain(prevHash: string, timestamp: string, userId: string, action: string, entityId: string): string {
  return sha256(`${prevHash}${timestamp}${userId}${action}${entityId}`);
}

async function main() {
  console.log('Seeding TnT-ZA database...\n');

  // Clear existing data
  await prisma.$executeRawUnsafe(`
    TRUNCATE "Tenant", "User", "Facility", "Zone", "Plant", "Batch", "BatchPlant",
    "Container", "ContainerEvent", "LabResult", "COA", "DestructionEvent",
    "TransportManifest", "Permit", "QuotaTracking", "SOP", "SOPAcknowledgement",
    "Deviation", "EquipmentCalibration", "AuditLog", "Anomaly", "Notification", "Session"
    CASCADE
  `);

  // ── TENANT ──
  const tenant = await prisma.tenant.create({
    data: {
      name: 'ILCO Farms',
      slug: 'ilco',
      branding: { primaryColor: '#0D6B3D', logo: '/images/ilco-logo.png' },
    },
  });

  // ── FACILITY ──
  const facility = await prisma.facility.create({
    data: {
      name: 'ILCO Farm',
      location: 'Potchefstroom, North West, South Africa',
      licenseNumber: 'SAHPRA-22C-2026-001',
      gmpStatus: 'ACTIVE',
      quotaAllocated: 200,
      quotaUsed: 50,
      tenantId: tenant.id,
    },
  });

  // ── ZONES ──
  const zones = await Promise.all([
    prisma.zone.create({ data: { name: 'Grow Room A', zoneType: ZoneType.GROW, capacity: 100, facilityId: facility.id } }),
    prisma.zone.create({ data: { name: 'Drying Room', zoneType: ZoneType.DRY, capacity: 50, facilityId: facility.id } }),
    prisma.zone.create({ data: { name: 'Trim Station', zoneType: ZoneType.TRIM, capacity: 30, facilityId: facility.id } }),
    prisma.zone.create({ data: { name: 'Curing Vault', zoneType: ZoneType.CURE, capacity: 40, facilityId: facility.id } }),
  ]);
  const [growZone, dryZone, trimZone, cureZone] = zones;

  // ── USERS (7 roles, unique PINs) ──
  const pins: Record<string, string> = {
    SUPER_ADMIN: '991122',
    TENANT_ADMIN: '882233',
    TENANT_ADMIN_LORAINE: '228855',
    FACILITY_MANAGER: '773344',
    CULTIVATOR: '664455',
    TRIMMER: '119922',
    LAB_TECH: '555666',
    SECURITY_OFFICER: '446677',
    VIEWER: '337788',
  };

  const userDefs = [
    { email: 'florisolivier7@gmail.com', name: 'Flo Olivier', role: UserRole.SUPER_ADMIN, pin: '446688' },
    { email: 'devon@applicationautomated.com', name: 'Devon', role: UserRole.SUPER_ADMIN, pin: '446688' },
    { email: 'superilco@cleva-ai.co.za', name: 'Floris Olivier', role: UserRole.SUPER_ADMIN, pin: pins.SUPER_ADMIN },
    { email: 'adminilco@cleva-ai.co.za', name: 'Ilze', role: UserRole.TENANT_ADMIN, pin: pins.TENANT_ADMIN },
    { email: 'loraineilco@cleva-ai.co.za', name: 'Loraine', role: UserRole.TENANT_ADMIN, pin: pins.TENANT_ADMIN_LORAINE },
    { email: 'fmilco@cleva-ai.co.za', name: 'Ray', role: UserRole.FACILITY_MANAGER, pin: pins.FACILITY_MANAGER },
    { email: 'growerilco@cleva-ai.co.za', name: 'Lou', role: UserRole.CULTIVATOR, pin: pins.CULTIVATOR },
    { email: 'trimmerilco@cleva-ai.co.za', name: 'JR Botha', role: UserRole.TRIMMER, pin: pins.TRIMMER },
    { email: 'labilco@cleva-ai.co.za', name: 'Keke', role: UserRole.LAB_TECH, pin: pins.LAB_TECH },
    { email: 'securityilco@cleva-ai.co.za', name: 'Sipho Dlamini', role: UserRole.SECURITY_OFFICER, pin: pins.SECURITY_OFFICER },
    { email: 'inspector@cleva-ai.co.za', name: 'SAHPRA Inspector', role: UserRole.VIEWER, pin: pins.VIEWER },
  ];

  const users: any[] = [];
  for (const u of userDefs) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        pinHash: await bcrypt.hash(u.pin, 10),
        tenantId: tenant.id,
        facilityId: facility.id,
      },
    });
    users.push(user);
  }
  const superAdmin = users.find(u => u.email === 'florisolivier7@gmail.com')!;
  const tenantAdmin = users.find(u => u.email === 'adminilco@cleva-ai.co.za')!;
  const fm = users.find(u => u.email === 'fmilco@cleva-ai.co.za')!;
  const cultivator = users.find(u => u.email === 'growerilco@cleva-ai.co.za')!;
  const labTech = users.find(u => u.email === 'labilco@cleva-ai.co.za')!;
  const secOfficer = users.find(u => u.email === 'securityilco@cleva-ai.co.za')!;
  const viewer = users.find(u => u.email === 'inspector@cleva-ai.co.za')!;

  console.log('┌──────────────────────────────────────────────────┐');
  console.log('│           TnT-ZA DEMO CREDENTIALS                │');
  console.log('├──────────────────┬────────────┬──────────────────┤');
  console.log('│ Email            │ PIN        │ Role             │');
  console.log('├──────────────────┼────────────┼──────────────────┤');
  for (const u of userDefs) {
    console.log(`│ ${u.email.padEnd(16)} │ ${u.pin}     │ ${u.role.padEnd(16)} │`);
  }
  console.log('└──────────────────┴────────────┴──────────────────┘\n');

  // ── PLANTS (50) ──
  const strains = ['Durban Poison', 'Swazi Gold', 'Malawi Gold', 'Rooibaard', 'Power Plant'];
  const phaseDistribution: PlantPhase[] = [
    ...Array(10).fill(PlantPhase.SEEDLING),
    ...Array(8).fill(PlantPhase.VEGETATIVE),
    ...Array(7).fill(PlantPhase.FLOWERING),
    ...Array(8).fill(PlantPhase.HARVESTED),
    ...Array(6).fill(PlantPhase.DRYING),
    ...Array(5).fill(PlantPhase.CURING),
    ...Array(3).fill(PlantPhase.PROCESSING),
    ...Array(3).fill(PlantPhase.PACKAGED),
  ];

  const phaseToZone: Record<string, string> = {
    SEEDLING: growZone.id, VEGETATIVE: growZone.id, FLOWERING: growZone.id,
    HARVESTED: dryZone.id, DRYING: dryZone.id,
    CURING: cureZone.id, PROCESSING: trimZone.id, PACKAGED: trimZone.id,
  };

  const plants: any[] = [];
  // Create first plant as mother
  const motherPlant = await prisma.plant.create({
    data: {
      identifier: 'ZA-000001',
      rfidTag: 'RFID-M0TH3R000001',
      qrCode: 'QR-ZA-000001',
      strain: 'Durban Poison',
      phase: PlantPhase.FLOWERING,
      weightsJson: {},
      tenantId: tenant.id,
      facilityId: facility.id,
      zoneId: growZone.id,
      handlerId: cultivator.id,
    },
  });
  plants.push(motherPlant);

  for (let i = 2; i <= 50; i++) {
    const phase = phaseDistribution[i - 1] || PlantPhase.SEEDLING;
    const strain = strains[i % strains.length];
    const id = String(i).padStart(6, '0');
    const weights: Record<string, number> = {};
    const phaseIdx = Object.values(PlantPhase).indexOf(phase);
    if (phaseIdx >= 3) weights.HARVESTED = 400 + Math.random() * 200;
    if (phaseIdx >= 4) weights.DRYING = (weights.HARVESTED || 500) * 0.78;
    if (phaseIdx >= 5) weights.CURING = (weights.DRYING || 390) * 0.95;
    if (phaseIdx >= 7) weights.PACKAGED = (weights.CURING || 370) * 0.98;

    const plant = await prisma.plant.create({
      data: {
        identifier: `ZA-${id}`,
        rfidTag: `RFID-${sha256(id).substring(0, 12).toUpperCase()}`,
        qrCode: `QR-ZA-${id}`,
        strain,
        phase,
        weightsJson: weights,
        tenantId: tenant.id,
        facilityId: facility.id,
        zoneId: phaseToZone[phase] || growZone.id,
        handlerId: cultivator.id,
        motherPlantId: i <= 10 ? motherPlant.id : undefined,
      },
    });
    plants.push(plant);
  }

  // ── BATCHES (4) ──
  const harvestedPlants = plants.filter(p => ['HARVESTED', 'DRYING', 'CURING', 'PROCESSING', 'PACKAGED'].includes(p.phase));
  const batchConfigs = [
    { num: 'B-2026-001', strain: 'Durban Poison', status: BatchStatus.ACTIVE, count: 5 },
    { num: 'B-2026-002', strain: 'Swazi Gold', status: BatchStatus.IN_TESTING, count: 4 },
    { num: 'B-2026-003', strain: 'Malawi Gold', status: BatchStatus.QUARANTINED, count: 3 },
    { num: 'B-2026-004', strain: 'Rooibaard', status: BatchStatus.RELEASED, count: 5 },
  ];

  const batches: any[] = [];
  let plantOffset = 0;
  for (const bc of batchConfigs) {
    const batchPlants = harvestedPlants.slice(plantOffset, plantOffset + bc.count);
    plantOffset += bc.count;
    const totalWeight = batchPlants.reduce((sum, p) => {
      const w = p.weightsJson as any;
      return sum + (w?.HARVESTED || 450);
    }, 0);

    const batch = await prisma.batch.create({
      data: {
        batchNumber: bc.num,
        strain: bc.strain,
        status: bc.status,
        coaStatus: bc.status === BatchStatus.RELEASED ? COAStatus.ISSUED : COAStatus.PENDING,
        totalWeight,
        tenantId: tenant.id,
        facilityId: facility.id,
      },
    });

    for (const bp of batchPlants) {
      await prisma.batchPlant.create({ data: { batchId: batch.id, plantId: bp.id } });
    }
    batches.push(batch);
  }

  // ── CONTAINERS (10) + EVENTS (25+) ──
  const containerDefs = [
    { type: ContainerType.BIN, count: 3 },
    { type: ContainerType.RACK, count: 2 },
    { type: ContainerType.BAG, count: 3 },
    { type: ContainerType.JAR, count: 2 },
  ];

  const containers: any[] = [];
  let typeCounters: Record<string, number> = {};
  for (const cd of containerDefs) {
    for (let i = 0; i < cd.count; i++) {
      typeCounters[cd.type] = (typeCounters[cd.type] || 0) + 1;
      const cid = `${cd.type}-${String(typeCounters[cd.type]).padStart(3, '0')}`;
      const batchIdx = containers.length % batches.length;
      const container = await prisma.container.create({
        data: {
          containerId: cid,
          qrCode: `QR-${cid}`,
          containerType: cd.type,
          status: ContainerStatus.LOADED,
          tenantId: tenant.id,
          facilityId: facility.id,
          batchId: batches[batchIdx].id,
          currentZoneId: dryZone.id,
        },
      });
      containers.push(container);
    }
  }

  // Create events for each container: LOAD, MOVE, HANDOVER (with some weight variance)
  for (let i = 0; i < containers.length; i++) {
    const c = containers[i];
    const baseWeight = 500 + Math.random() * 300;

    // LOAD event
    await prisma.containerEvent.create({
      data: {
        eventType: ContainerEventType.LOAD,
        weight: baseWeight,
        containerId: c.id,
        toZoneId: growZone.id,
        outgoingHandlerId: cultivator.id,
      },
    });

    // MOVE to drying (normal weight loss ~15%)
    const dryWeight = baseWeight * (0.80 + Math.random() * 0.10);
    await prisma.containerEvent.create({
      data: {
        eventType: ContainerEventType.MOVE,
        weight: dryWeight,
        containerId: c.id,
        fromZoneId: growZone.id,
        toZoneId: dryZone.id,
        outgoingHandlerId: cultivator.id,
      },
    });

    // HANDOVER at zone transition
    await prisma.containerEvent.create({
      data: {
        eventType: ContainerEventType.HANDOVER,
        weight: dryWeight,
        containerId: c.id,
        fromZoneId: dryZone.id,
        toZoneId: dryZone.id,
        outgoingHandlerId: cultivator.id,
        incomingHandlerId: fm.id,
      },
    });

    // Container 0 gets a suspicious weight variance (30% loss — triggers anomaly)
    if (i === 0) {
      const suspiciousWeight = dryWeight * 0.70;
      await prisma.containerEvent.create({
        data: {
          eventType: ContainerEventType.UNLOAD,
          weight: suspiciousWeight,
          containerId: c.id,
          fromZoneId: dryZone.id,
          outgoingHandlerId: fm.id,
          notes: 'Unexplained weight variance detected during unload',
        },
      });
    }
  }

  // ── LAB RESULTS (2 batches x 8 tests) ──
  const testTypes = ['POTENCY', 'PESTICIDE', 'HEAVY_METALS', 'MICROBIAL', 'MYCOTOXIN', 'RESIDUAL_SOLVENTS', 'MOISTURE', 'FOREIGN_MATTER'];

  // Batch 4 (RELEASED) — all passing
  for (const tt of testTypes) {
    await prisma.labResult.create({
      data: {
        testType: tt,
        resultData: { value: tt === 'POTENCY' ? 22.5 : 0.01, threshold: tt === 'POTENCY' ? 15 : 0.1, unit: tt === 'POTENCY' ? '%THC' : 'ppm', status: 'PASS' },
        passed: true,
        batchId: batches[3].id,
        testedById: labTech.id,
      },
    });
  }

  // Batch 2 (IN_TESTING) — all passing
  for (const tt of testTypes) {
    await prisma.labResult.create({
      data: {
        testType: tt,
        resultData: { value: tt === 'POTENCY' ? 18.3 : 0.02, threshold: tt === 'POTENCY' ? 15 : 0.1, unit: tt === 'POTENCY' ? '%THC' : 'ppm', status: 'PASS' },
        passed: true,
        batchId: batches[1].id,
        testedById: labTech.id,
      },
    });
  }

  // Batch 3 (QUARANTINED) — pesticide failed
  for (const tt of testTypes) {
    const failed = tt === 'PESTICIDE';
    await prisma.labResult.create({
      data: {
        testType: tt,
        resultData: { value: failed ? 0.5 : 0.01, threshold: 0.1, unit: 'ppm', status: failed ? 'FAIL' : 'PASS' },
        passed: !failed,
        batchId: batches[2].id,
        testedById: labTech.id,
      },
    });
  }

  // ── COAs ──
  const coaIssued = await prisma.cOA.create({
    data: { batchId: batches[3].id, issuedById: labTech.id, pdfUrl: '/coa/B-2026-004.pdf', qrCode: 'QR-COA-B-2026-004', valid: true },
  });
  const coaPending = await prisma.cOA.create({
    data: { batchId: batches[1].id, issuedById: labTech.id, valid: false },
  });

  // ── DESTRUCTION EVENTS (2) ──
  await prisma.destructionEvent.create({
    data: {
      weight: 120, reason: 'Mould contamination detected', sapsOfficerName: 'Cpt. J. Botha', sapsOfficerBadge: 'SAPS-NW-4421', sapsStation: 'Potchefstroom Central',
      confirmed: true, facilityId: facility.id, facilityManagerId: fm.id, batchId: batches[2].id,
    },
  });
  await prisma.destructionEvent.create({
    data: {
      weight: 45, reason: 'Failed lab re-test — mycotoxin levels', sapsOfficerName: 'Sgt. M. Ngubane', sapsOfficerBadge: 'SAPS-NW-5502', sapsStation: 'Potchefstroom Central',
      confirmed: false, facilityId: facility.id, facilityManagerId: fm.id,
    },
  });

  // ── TRANSPORT MANIFEST ──
  await prisma.transportManifest.create({
    data: {
      batchIds: [batches[3].batchNumber],
      transporter: 'SecureMed Logistics',
      vehicleReg: 'NW-42-GP',
      expectedDuration: 180,
      actualDuration: 195,
      departedAt: new Date('2026-03-15T08:00:00Z'),
      arrivedAt: new Date('2026-03-15T11:15:00Z'),
      originFacilityId: facility.id,
      destFacilityId: facility.id,
    },
  });

  // ── AUDIT LOG (25 entries with hash chain) ──
  let prevHash = 'GENESIS';
  const auditActions = [
    { action: 'USER_LOGIN', entityType: 'User', entityId: superAdmin.id, userId: superAdmin.id },
    { action: 'USER_LOGIN', entityType: 'User', entityId: fm.id, userId: fm.id },
    { action: 'PLANT_REGISTERED', entityType: 'Plant', entityId: plants[0].id, userId: cultivator.id },
    { action: 'PLANT_REGISTERED', entityType: 'Plant', entityId: plants[1].id, userId: cultivator.id },
    { action: 'PLANT_PHASE_CHANGED', entityType: 'Plant', entityId: plants[10].id, userId: cultivator.id },
    { action: 'PLANT_PHASE_CHANGED', entityType: 'Plant', entityId: plants[11].id, userId: cultivator.id },
    { action: 'BATCH_CREATED', entityType: 'Batch', entityId: batches[0].id, userId: fm.id },
    { action: 'BATCH_CREATED', entityType: 'Batch', entityId: batches[1].id, userId: fm.id },
    { action: 'CONTAINER_LOADED', entityType: 'Container', entityId: containers[0].id, userId: cultivator.id },
    { action: 'CONTAINER_MOVED', entityType: 'Container', entityId: containers[0].id, userId: cultivator.id },
    { action: 'CONTAINER_HANDOVER', entityType: 'Container', entityId: containers[0].id, userId: fm.id },
    { action: 'CONTAINER_UNLOADED', entityType: 'Container', entityId: containers[0].id, userId: fm.id },
    { action: 'ANOMALY_DETECTED', entityType: 'Container', entityId: containers[0].id, userId: fm.id },
    { action: 'LAB_RESULT_SUBMITTED', entityType: 'Batch', entityId: batches[3].id, userId: labTech.id },
    { action: 'COA_ISSUED', entityType: 'Batch', entityId: batches[3].id, userId: labTech.id },
    { action: 'DESTRUCTION_RECORDED', entityType: 'Batch', entityId: batches[2].id, userId: fm.id },
    { action: 'PERMIT_CREATED', entityType: 'Facility', entityId: facility.id, userId: superAdmin.id },
    { action: 'SOP_CREATED', entityType: 'SOP', entityId: 'sop-placeholder', userId: fm.id },
    { action: 'DEVIATION_RAISED', entityType: 'SOP', entityId: 'sop-placeholder', userId: cultivator.id },
    { action: 'TRANSPORT_DEPARTED', entityType: 'Transport', entityId: 'manifest-1', userId: secOfficer.id },
    { action: 'TRANSPORT_ARRIVED', entityType: 'Transport', entityId: 'manifest-1', userId: secOfficer.id },
    { action: 'QUOTA_UPDATED', entityType: 'Facility', entityId: facility.id, userId: superAdmin.id },
    { action: 'USER_LOGIN', entityType: 'User', entityId: labTech.id, userId: labTech.id },
    { action: 'PLANT_FLAGGED', entityType: 'Plant', entityId: plants[5].id, userId: cultivator.id },
    { action: 'NOTIFICATION_SENT', entityType: 'Anomaly', entityId: 'anomaly-1', userId: fm.id },
  ];

  for (const a of auditActions) {
    const ts = new Date().toISOString();
    const hash = hashChain(prevHash, ts, a.userId, a.action, a.entityId);
    await prisma.auditLog.create({
      data: {
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        hashChain: hash,
        tenantId: tenant.id,
        userId: a.userId,
      },
    });
    prevHash = hash;
  }

  // ── ANOMALIES (3) ──
  await prisma.anomaly.create({
    data: {
      type: AnomalyType.CONTAINER_WEIGHT_VARIANCE,
      severity: SeverityLevel.CRITICAL,
      description: `Container BIN-001 unloaded with 30% weight loss (expected ~15% for drying). Possible diversion.`,
      entityType: 'Container',
      entityId: containers[0].id,
      tenantId: tenant.id,
    },
  });
  await prisma.anomaly.create({
    data: {
      type: AnomalyType.YIELD_DEVIATION,
      severity: SeverityLevel.MEDIUM,
      description: `Batch B-2026-003 yield 22% below strain average for Malawi Gold.`,
      entityType: 'Batch',
      entityId: batches[2].id,
      tenantId: tenant.id,
      resolvedAt: new Date(),
      resolvedById: fm.id,
      investigationNotes: 'Root cause: early harvest due to pest pressure. Documented in deviation DEV-001.',
    },
  });
  await prisma.anomaly.create({
    data: {
      type: AnomalyType.CONTAINER_STALE,
      severity: SeverityLevel.LOW,
      description: `Container JAR-002 has had no events for >48 hours.`,
      entityType: 'Container',
      entityId: containers[9].id,
      tenantId: tenant.id,
    },
  });

  // ── PERMITS ──
  await prisma.permit.create({
    data: {
      type: PermitType.SECTION_22A, permitNumber: 'SAHPRA-22A-2025-0142',
      issuedDate: new Date('2025-06-01'), expiryDate: new Date('2026-05-31'),
      conditions: 'Indoor cultivation only. Max 200 plants.', facilityId: facility.id,
    },
  });
  await prisma.permit.create({
    data: {
      type: PermitType.SECTION_22C, permitNumber: 'SAHPRA-22C-2026-0018',
      issuedDate: new Date('2026-01-15'), expiryDate: new Date('2027-01-14'),
      conditions: 'Processing and distribution. Annual INCB quota applies.', facilityId: facility.id,
    },
  });

  // ── QUOTA TRACKING ──
  await prisma.quotaTracking.create({
    data: { year: 2026, annualQuota: 200, usedQuota: 50, facilityId: facility.id },
  });

  // ── SOPs ──
  const sop1 = await prisma.sOP.create({
    data: {
      title: 'Standard Operating Procedure — Harvest & Drying',
      content: 'All harvested plant material must be weighed within 30 minutes of cut. Material is transferred to drying racks in the Drying Room with a handover log signed by both the cultivator and facility manager.',
      tenantId: tenant.id, facilityId: facility.id, approvedById: fm.id,
    },
  });
  const sop2 = await prisma.sOP.create({
    data: {
      title: 'Standard Operating Procedure — Container Weight Verification',
      content: 'All containers must be weighed at every zone transition. Weight is recorded digitally. Variance exceeding threshold triggers immediate investigation and notification to FM and Tenant Admin.',
      tenantId: tenant.id, facilityId: facility.id, approvedById: fm.id,
    },
  });

  // ── DEVIATION ──
  await prisma.deviation.create({
    data: {
      description: 'Container BIN-001 showed 30% weight loss during drying zone unload, exceeding the 15% threshold.',
      severity: SeverityLevel.HIGH,
      rootCause: 'Under investigation — possible scale calibration issue or material handling error.',
      sopId: sop2.id, raisedById: fm.id, facilityId: facility.id,
    },
  });

  // ── EQUIPMENT CALIBRATION ──
  await prisma.equipmentCalibration.create({
    data: {
      equipmentName: 'Mettler Toledo XS205 (Drying Room)',
      lastCalibrated: new Date('2026-03-01'),
      nextDue: new Date('2026-04-01'),
      facilityId: facility.id, calibratedById: fm.id,
    },
  });
  await prisma.equipmentCalibration.create({
    data: {
      equipmentName: 'Ohaus Defender 3000 (Trim Station)',
      lastCalibrated: new Date('2026-02-15'),
      nextDue: new Date('2026-03-28'),
      facilityId: facility.id, calibratedById: fm.id,
    },
  });

  // ── NOTIFICATIONS ──
  const seniorUsers = [superAdmin, tenantAdmin, fm];
  for (const u of seniorUsers) {
    await prisma.notification.create({
      data: {
        title: 'CRITICAL: Weight Variance Detected',
        message: 'Container BIN-001 lost 30% weight during unload in Drying Room. Immediate investigation required.',
        link: '/containers/' + containers[0].id,
        userId: u.id,
      },
    });
  }

  console.log('Seed complete!');
  console.log(`  Tenant: ${tenant.name}`);
  console.log(`  Facility: ${facility.name}`);
  console.log(`  Users: ${users.length}`);
  console.log(`  Zones: ${zones.length}`);
  console.log(`  Plants: ${plants.length}`);
  console.log(`  Batches: ${batches.length}`);
  console.log(`  Containers: ${containers.length}`);
  console.log(`  Anomalies: 3 (1 resolved, 2 open)`);
  console.log(`  Audit log: ${auditActions.length} entries with SHA-256 hash chain`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
