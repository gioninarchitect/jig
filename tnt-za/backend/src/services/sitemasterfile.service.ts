import { prisma } from '../config/db';

export async function generateSiteMasterFile(tenantId: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId } });
  const facility = await prisma.facility.findFirst({
    where: { tenantId },
    include: { _count: { select: { plants: true, batches: true, containers: true } } },
  });
  const zones = await prisma.zone.findMany({ where: { facilityId: facility?.id } });
  const permits = await prisma.permit.findMany({ where: { facilityId: facility?.id } });
  const users = await prisma.user.findMany({
    where: { tenantId, active: true },
    select: { name: true, role: true, email: true, createdAt: true },
    orderBy: { role: 'asc' },
  });
  const sops = await prisma.sOP.findMany({ where: { tenantId, active: true } });
  const equipment = await prisma.equipmentCalibration.findMany({ where: { facilityId: facility?.id } });
  const strains = await prisma.strain.findMany({ where: { tenantId, active: true } });
  const greenhouses = await prisma.greenhouse.findMany({
    where: { tenantId, active: true },
    include: { bays: true },
  });
  const batches = await prisma.batch.findMany({ where: { tenantId } });
  const anomalies = await prisma.anomaly.count({ where: { resolvedAt: null } });
  const deviations = await prisma.deviation.count({ where: { closedAt: null } });
  const assets = await prisma.asset.findMany({ where: { tenantId, status: { not: 'DECOMMISSIONED' } } });
  const motherPlants = await prisma.motherPlant.findMany({ where: { tenantId } });
  const coas = await prisma.cOA.count({ where: { valid: true } });
  const destructions = await prisma.destructionEvent.findMany({ where: { facilityId: facility?.id } });
  const quota = await prisma.quotaTracking.findFirst({ where: { facilityId: facility?.id }, orderBy: { year: 'desc' } });

  // Role counts
  const roleCounts: Record<string, number> = {};
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  // Batch stats
  const batchStats = {
    total: batches.length,
    active: batches.filter(b => b.status === 'ACTIVE').length,
    released: batches.filter(b => b.status === 'RELEASED').length,
    quarantined: batches.filter(b => b.status === 'QUARANTINED').length,
    destroyed: batches.filter(b => b.status === 'DESTROYED').length,
  };

  return {
    generatedAt: new Date().toISOString(),
    version: '2.0',

    // Section 1: General Information
    generalInfo: {
      companyName: tenant?.name || 'ILCO Farming (Pty) Ltd',
      tradingAs: tenant?.slug || 'ILCO Farms',
      facilityName: facility?.name || '',
      facilityAddress: facility?.location || '',
      gpsCoordinates: facility?.gpsLat && facility?.gpsLng ? `${facility.gpsLat}, ${facility.gpsLng}` : 'Not recorded',
      gmpStatus: facility?.gmpStatus || 'Pending',
      licenseNumber: facility?.licenseNumber || 'Not recorded',
      facilityType: 'Indoor Cannabis Cultivation & Processing',
      operationalSince: facility?.createdAt?.toISOString().split('T')[0] || '',
    },

    // Section 2: Regulatory Status
    regulatory: {
      permits: permits.map(p => ({
        type: p.type, number: p.permitNumber,
        issued: p.issuedDate?.toISOString().split('T')[0],
        expiry: p.expiryDate?.toISOString().split('T')[0],
        conditions: p.conditions,
      })),
      incbQuota: quota ? {
        year: quota.year, annual: quota.annualQuota,
        used: quota.usedQuota, remaining: quota.annualQuota - quota.usedQuota,
        usedPercent: Math.round((quota.usedQuota / quota.annualQuota) * 100),
      } : null,
    },

    // Section 3: Personnel
    personnel: {
      totalStaff: users.length,
      byRole: roleCounts,
      keyPersonnel: users.filter(u => ['SUPER_ADMIN', 'TENANT_ADMIN', 'RESPONSIBLE_PHARMACIST', 'FACILITY_MANAGER', 'PROCESSING_MANAGER', 'FACILITY_SUPERVISOR', 'HEAD_OF_CULTIVATION', 'QA_INSPECTOR'].includes(u.role)).map(u => ({
        name: u.name, role: u.role.replace(/_/g, ' '), email: u.email,
      })),
      orgChart: [
        { level: 'Executive', roles: ['TENANT_ADMIN', 'RESPONSIBLE_PHARMACIST'] },
        { level: 'Management', roles: ['FACILITY_MANAGER', 'PROCESSING_MANAGER', 'FACILITY_SUPERVISOR', 'HEAD_OF_CULTIVATION', 'QA_INSPECTOR', 'MAINTENANCE_MANAGER'] },
        { level: 'Operational', roles: ['CULTIVATOR', 'LAB_TECH', 'IRRIGATION_TECH', 'NURSERY_MANAGER'] },
        { level: 'Support', roles: ['SECURITY_OFFICER', 'TRIMMER', 'GENERAL_WORKER', 'HOUSEKEEPING', 'LAUNDRY'] },
      ],
    },

    // Section 4: Premises & Equipment
    premises: {
      zones: zones.map(z => ({ name: z.name, type: z.zoneType, capacity: z.capacity, hasEnvMonitor: z.hasEnvMonitor })),
      greenhouses: greenhouses.map(gh => ({
        name: gh.name, type: gh.type, totalBays: gh.bays.length,
        activeBays: gh.bays.filter(b => b.status !== 'EMPTY').length,
      })),
      totalAssets: assets.length,
      assetsByCategory: assets.reduce((acc, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {} as Record<string, number>),
      equipmentCalibration: equipment.map(e => ({
        name: e.equipmentName, lastCalibrated: e.lastCalibrated?.toISOString().split('T')[0],
        nextDue: e.nextDue?.toISOString().split('T')[0],
      })),
    },

    // Section 5: Production
    production: {
      strains: strains.map(s => ({
        name: s.name, species: s.species, chemoType: s.chemoType,
        expectedYield: s.expectedYield, expectedThc: s.expectedThc,
        floweringWeeks: s.floweringWeeks,
      })),
      motherPlants: {
        total: motherPlants.length,
        active: motherPlants.filter(m => m.status === 'ACTIVE').length,
        totalClonesProduced: motherPlants.reduce((s, m) => s + m.totalClones, 0),
      },
      batches: batchStats,
      activePlants: facility?._count?.plants || 0,
      activeContainers: facility?._count?.containers || 0,
    },

    // Section 6: Quality System
    qualitySystem: {
      sops: sops.map(s => ({ title: s.title, version: s.version })),
      totalSOPs: sops.length,
      openDeviations: deviations,
      openAnomalies: anomalies,
      coasIssued: coas,
      anomalyRules: [
        'Weight loss >15% at phase transition',
        'Destruction rate >2σ above average',
        'Transport time >130% expected',
        'Yield deviation >20% from strain average',
        'Inventory discrepancy >2%',
        'Container weight variance above threshold',
        'Container stale >24hrs no events',
        'Container zone mismatch',
      ],
    },

    // Section 7: Destruction Records
    destruction: {
      totalEvents: destructions.length,
      totalWeightDestroyed: destructions.reduce((s, d) => s + d.weight, 0),
      events: destructions.map(d => ({
        date: d.witnessedAt?.toISOString().split('T')[0],
        weight: d.weight, reason: d.reason,
        sapsOfficer: d.sapsOfficerName, station: d.sapsStation,
      })),
    },

    // Section 8: Compliance Status
    compliance: {
      auditTrailIntegrity: 'SHA-256 hash chain — append-only, tamper-proof',
      systemName: 'TnT-ZA v2.0',
      systemDescription: 'Digital cannabis track & trace — 17-step workflow, 19 roles, full SAHPRA compliance',
      lastUpdated: new Date().toISOString(),
    },
  };
}
