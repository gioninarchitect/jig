import { prisma } from '../config/db';
import { ZoneType, FacilityScenario, Species, ChemoType } from '@prisma/client';
import { eventBus } from './eventBus';
import bcrypt from 'bcryptjs';

// ── Zone templates per scenario ──
const ZONE_TEMPLATES: Record<string, { name: string; zoneType: ZoneType; capacity: number }[]> = {
  INDOOR_CULTIVATOR: [
    { name: 'Propagation Room', zoneType: ZoneType.PROPAGATION, capacity: 50 },
    { name: 'Grow Room', zoneType: ZoneType.GROW, capacity: 100 },
    { name: 'Drying Room', zoneType: ZoneType.DRY, capacity: 50 },
    { name: 'Trim Station', zoneType: ZoneType.TRIM, capacity: 30 },
    { name: 'Curing Vault', zoneType: ZoneType.CURE, capacity: 40 },
    { name: 'Storage', zoneType: ZoneType.STORAGE, capacity: 100 },
  ],
  OUTDOOR_HEMP: [
    { name: 'Seedbed', zoneType: ZoneType.PROPAGATION, capacity: 200 },
    { name: 'Field A', zoneType: ZoneType.GROW, capacity: 500 },
    { name: 'Field B', zoneType: ZoneType.GROW, capacity: 500 },
    { name: 'Drying Barn', zoneType: ZoneType.DRY, capacity: 200 },
    { name: 'Storage Shed', zoneType: ZoneType.STORAGE, capacity: 300 },
  ],
  GMP_MANUFACTURER: [
    { name: 'Receiving Bay', zoneType: ZoneType.STORAGE, capacity: 100 },
    { name: 'Processing Lab', zoneType: ZoneType.PROCESS, capacity: 50 },
    { name: 'Packaging', zoneType: ZoneType.PACK, capacity: 80 },
    { name: 'Quarantine', zoneType: ZoneType.QUARANTINE, capacity: 40 },
    { name: 'Cold Storage', zoneType: ZoneType.STORAGE, capacity: 200 },
  ],
  RESEARCH: [
    { name: 'Growth Chamber', zoneType: ZoneType.GROW, capacity: 20 },
    { name: 'Research Lab', zoneType: ZoneType.PROCESS, capacity: 10 },
    { name: 'Storage', zoneType: ZoneType.STORAGE, capacity: 30 },
  ],
};

// ── SOP templates ──
const SOP_TEMPLATES = [
  { title: 'Harvesting & Weighing Procedure', content: 'All harvested plant material must be weighed within 30 minutes of cut. Record the wet weight immediately. The cultivator and facility manager must both be present during weighing. Weight is recorded in TnT-ZA before the plant material leaves the grow room.' },
  { title: 'Container Handling & Zone Transitions', content: 'Every container must be weighed at every zone transition. Use the Scan feature to photograph the container label, then photograph the scale display. The system automatically compares weights and alerts management if variance exceeds the threshold (5% for bins/bags/jars, 15% for drying racks).' },
  { title: 'Drying Room Protocol', content: 'Maintain drying room temperature between 18-22°C and humidity between 45-55%. Check environmental monitors twice daily. Record any deviations. Plant material must be checked for mould daily during the first 5 days.' },
  { title: 'Lab Sample Collection', content: 'Lab samples must be collected from a representative cross-section of the batch. Minimum sample size: 10g per test type. Samples must be sealed, labelled with batch number, and delivered to the lab within 24 hours. Chain of custody must be maintained.' },
  { title: 'Destruction & Waste Disposal', content: 'All cannabis destruction requires a SAPS officer witness. Record the officer name, badge number, and station. The facility manager must be present. Weight of material being destroyed must match system records within 2%. Any discrepancy triggers an automatic anomaly alert.' },
];

// ── Step 1: Facility basics ──
export async function setupFacility(data: {
  facilityId: string;
  name: string;
  address?: string;
  gpsLat?: number;
  gpsLng?: number;
  growType?: string;
  scenario: FacilityScenario;
  tenantId: string;
  userId: string;
}) {
  const facility = await prisma.facility.update({
    where: { id: data.facilityId },
    data: {
      name: data.name,
      location: data.address || '',
      address: data.address,
      gpsLat: data.gpsLat,
      gpsLng: data.gpsLng,
      growType: data.growType,
      scenario: data.scenario,
      onboardingStep: 2,
    },
  });

  eventBus.emit('ONBOARDING_FACILITY', { userId: data.userId, tenantId: data.tenantId, entityType: 'Facility', entityId: facility.id });
  return facility;
}

// ── Step 2: Licenses ──
export async function setupLicenses(data: {
  facilityId: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  permitNumber?: string;
  permitExpiry?: string;
  gmpCertNumber?: string;
  gmpCertExpiry?: string;
  quotaAllocated?: number;
  tenantId: string;
  userId: string;
}) {
  const updates: any = { onboardingStep: 3 };
  if (data.licenseNumber) updates.licenseNumber = data.licenseNumber;
  if (data.gmpCertNumber) updates.gmpCertNumber = data.gmpCertNumber;
  if (data.gmpCertExpiry) updates.gmpCertExpiry = new Date(data.gmpCertExpiry);
  if (data.quotaAllocated) updates.quotaAllocated = data.quotaAllocated;

  const facility = await prisma.facility.update({ where: { id: data.facilityId }, data: updates });

  // Create permits
  if (data.licenseNumber && data.licenseExpiry) {
    await prisma.permit.create({
      data: {
        type: 'SECTION_22C', permitNumber: data.licenseNumber,
        issuedDate: new Date(), expiryDate: new Date(data.licenseExpiry),
        facilityId: data.facilityId,
      },
    });
  }
  if (data.permitNumber && data.permitExpiry) {
    await prisma.permit.create({
      data: {
        type: 'SECTION_22A', permitNumber: data.permitNumber,
        issuedDate: new Date(), expiryDate: new Date(data.permitExpiry),
        facilityId: data.facilityId,
      },
    });
  }

  // Quota tracking
  if (data.quotaAllocated) {
    const year = new Date().getFullYear();
    await prisma.quotaTracking.upsert({
      where: { facilityId_year: { facilityId: data.facilityId, year } },
      update: { annualQuota: data.quotaAllocated },
      create: { facilityId: data.facilityId, year, annualQuota: data.quotaAllocated },
    });
  }

  return facility;
}

// ── Step 3: Zones (upsert-by-name, soft-deactivate drops) ──
export async function setupZones(data: {
  facilityId: string;
  useTemplate?: boolean;
  scenario?: string;
  zones?: {
    name: string; zoneType: ZoneType; capacity: number; hasEnvMonitor?: boolean;
    targetTempMin?: number; targetTempMax?: number;
    targetHumidMin?: number; targetHumidMax?: number;
    lightCycleOn?: number; lightCycleOff?: number;
    accessLevel?: string;
  }[];
  tenantId: string;
  userId: string;
}) {
  let zonesToUpsert = data.zones || [];
  if (data.useTemplate && data.scenario) {
    zonesToUpsert = ZONE_TEMPLATES[data.scenario] || ZONE_TEMPLATES.INDOOR_CULTIVATOR;
  }

  const existing = await prisma.zone.findMany({
    where: { facilityId: data.facilityId },
    include: { _count: { select: { plants: true, containersInZone: true } } },
  });
  const incomingNames = new Set(zonesToUpsert.map(z => z.name));

  // Deactivate zones that dropped out of the new list — soft-delete only, never hard-delete
  // if they have Plants / Containers referencing them (FK integrity).
  for (const z of existing) {
    if (incomingNames.has(z.name)) continue;
    const hasRefs = (z._count.plants + z._count.containersInZone) > 0;
    if (hasRefs) {
      await prisma.zone.update({ where: { id: z.id }, data: { active: false } });
    } else {
      await prisma.zone.delete({ where: { id: z.id } });
    }
  }

  const result = [];
  for (const z of zonesToUpsert) {
    const match = existing.find(e => e.name === z.name);
    const payload = {
      name: z.name,
      zoneType: z.zoneType,
      capacity: z.capacity,
      hasEnvMonitor: z.hasEnvMonitor ?? false,
      targetTempMin: z.targetTempMin,
      targetTempMax: z.targetTempMax,
      targetHumidMin: z.targetHumidMin,
      targetHumidMax: z.targetHumidMax,
      lightCycleOn: z.lightCycleOn,
      lightCycleOff: z.lightCycleOff,
      accessLevel: z.accessLevel,
      active: true,
      facilityId: data.facilityId,
    };
    const zone = match
      ? await prisma.zone.update({ where: { id: match.id }, data: payload })
      : await prisma.zone.create({ data: payload });
    result.push(zone);
  }

  await prisma.facility.update({ where: { id: data.facilityId }, data: { onboardingStep: 4 } });
  return result;
}

// ── Step 4: Strains ──
export async function setupStrains(data: {
  facilityId: string;
  strains: { name: string; species?: Species; chemoType?: ChemoType; growMethod?: string; source?: string; expectedYield?: number }[];
  tenantId: string;
  userId: string;
}) {
  const created = [];
  for (const s of data.strains) {
    const strain = await prisma.strain.create({
      data: {
        name: s.name,
        species: s.species || Species.HYBRID,
        chemoType: s.chemoType || ChemoType.THC_DOMINANT,
        growMethod: s.growMethod || 'indoor',
        source: s.source,
        expectedYield: s.expectedYield,
        tenantId: data.tenantId,
        facilityId: data.facilityId,
      },
    });
    created.push(strain);
  }

  await prisma.facility.update({ where: { id: data.facilityId }, data: { onboardingStep: 5 } });
  return created;
}

// ── Step 5: Equipment ──
export async function setupEquipment(data: {
  facilityId: string;
  equipment: { name: string; zoneId?: string; lastCalibrated?: string; intervalDays?: number }[];
  tenantId: string;
  userId: string;
}) {
  const created = [];
  for (const e of data.equipment) {
    const nextDue = e.lastCalibrated ? new Date(new Date(e.lastCalibrated).getTime() + (e.intervalDays || 30) * 86400000) : undefined;
    const eq = await prisma.equipmentCalibration.create({
      data: {
        equipmentName: e.name,
        facilityId: data.facilityId,
        lastCalibrated: e.lastCalibrated ? new Date(e.lastCalibrated) : undefined,
        nextDue,
        calibratedById: data.userId,
      },
    });
    created.push(eq);
  }

  await prisma.facility.update({ where: { id: data.facilityId }, data: { onboardingStep: 6 } });
  return created;
}

// ── Step 6: Team invite ──
export async function setupTeam(data: {
  facilityId: string;
  members: { name: string; email: string; role: string }[];
  tenantId: string;
  userId: string;
}) {
  const created = [];
  for (const m of data.members) {
    // Generate random 6-digit PIN
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const pinHash = await bcrypt.hash(pin, 10);

    const user = await prisma.user.create({
      data: {
        email: m.email,
        name: m.name,
        role: m.role as any,
        pinHash,
        tenantId: data.tenantId,
        facilityId: data.facilityId,
      },
    });

    console.log(`[Onboarding] Invited ${m.name} (${m.email}) as ${m.role} — PIN: ${pin}`);
    created.push({ id: user.id, name: user.name, email: user.email, role: user.role, pin });
  }

  await prisma.facility.update({ where: { id: data.facilityId }, data: { onboardingStep: 7 } });
  return created;
}

// ── Step 7: SOPs ──
export async function setupSOPs(data: {
  facilityId: string;
  useTemplates: boolean;
  tenantId: string;
  userId: string;
}) {
  if (!data.useTemplates) {
    await prisma.facility.update({ where: { id: data.facilityId }, data: { onboardingStep: 8 } });
    return [];
  }

  const created = [];
  for (const t of SOP_TEMPLATES) {
    const sop = await prisma.sOP.create({
      data: {
        title: t.title,
        content: t.content,
        tenantId: data.tenantId,
        facilityId: data.facilityId,
        approvedById: data.userId,
      },
    });
    created.push(sop);
  }

  await prisma.facility.update({ where: { id: data.facilityId }, data: { onboardingStep: 8 } });
  return created;
}

// ── Step 8: Security partners ──
export async function setupSecurity(data: {
  facilityId: string;
  sapsStation?: string;
  sapsContact?: string;
  wasteCompany?: string;
  transportCompany?: string;
  labPartner?: string;
  tenantId: string;
  userId: string;
}) {
  const facility = await prisma.facility.update({
    where: { id: data.facilityId },
    data: {
      sapsStation: data.sapsStation,
      sapsContact: data.sapsContact,
      wasteCompany: data.wasteCompany,
      transportCompany: data.transportCompany,
      labPartner: data.labPartner,
      onboardingStep: 8,
    },
  });
  return facility;
}

// ── Complete onboarding ──
export async function completeOnboarding(facilityId: string, userId: string, tenantId: string) {
  const existing = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (existing?.onboardingComplete) {
    return existing; // Already complete — idempotent
  }

  const facility = await prisma.facility.update({
    where: { id: facilityId },
    data: { onboardingComplete: true },
  });

  eventBus.emit('ONBOARDING_COMPLETE', { userId, tenantId, entityType: 'Facility', entityId: facilityId });
  return facility;
}

// ── Get onboarding status ──
export async function getOnboardingStatus(facilityId: string) {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: {
      zones: { select: { id: true, name: true, zoneType: true } },
      strains: { select: { id: true, name: true } },
      equipment: { select: { id: true, equipmentName: true } },
      permits: { select: { id: true, type: true, permitNumber: true } },
      _count: { select: { users: true, sops: true, zones: true, strains: true, equipment: true } },
    },
  });

  return {
    facility,
    step: facility?.onboardingStep || 0,
    complete: facility?.onboardingComplete || false,
    counts: facility?._count,
  };
}

export { ZONE_TEMPLATES, SOP_TEMPLATES };
