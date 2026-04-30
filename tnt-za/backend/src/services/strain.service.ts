import { prisma } from '../config/db';

export async function listStrains(tenantId: string) {
  return prisma.strain.findMany({
    where: { tenantId, active: true },
    orderBy: { name: 'asc' },
  });
}

export async function getStrain(id: string, tenantId: string) {
  return prisma.strain.findFirst({ where: { id, tenantId } });
}

export async function createStrain(data: {
  name: string; species?: string; chemoType?: string; growMethod?: string;
  source?: string; expectedYield?: number; expectedThc?: number; expectedCbd?: number;
  floweringWeeks?: number; facilityId: string; tenantId: string;
}) {
  return prisma.strain.create({ data: data as any });
}

export async function updateStrain(id: string, data: any) {
  return prisma.strain.update({ where: { id }, data });
}

export async function getStrainAnalytics(tenantId: string) {
  const strains = await prisma.strain.findMany({ where: { tenantId, active: true } });
  const analytics = [];

  for (const strain of strains) {
    // Count plants per strain
    const totalPlants = await prisma.plant.count({ where: { tenantId, strain: strain.name } });
    const harvestedPlants = await prisma.plant.count({ where: { tenantId, strain: strain.name, phase: 'HARVESTED' } });

    // Count batches per strain
    const totalBatches = await prisma.batch.count({ where: { tenantId, strain: strain.name } });
    const releasedBatches = await prisma.batch.count({ where: { tenantId, strain: strain.name, status: 'RELEASED' } });

    // Clone trays per strain
    const cloneTrays = await prisma.cloneTray.findMany({ where: { tenantId, strain: strain.name } });
    const totalCuttings = cloneTrays.reduce((s, t) => s + t.totalCuttings, 0);
    const totalRooted = cloneTrays.reduce((s, t) => s + t.rooted, 0);
    const rootingRate = totalCuttings > 0 ? Math.round((totalRooted / totalCuttings) * 100) : 0;

    // Mother plants per strain
    const motherCount = await prisma.motherPlant.count({ where: { tenantId, strain: strain.name, status: 'ACTIVE' } });

    // Lab results per strain (via batch)
    const batchIds = await prisma.batch.findMany({ where: { tenantId, strain: strain.name }, select: { id: true } });
    const labResults = await prisma.labResult.findMany({ where: { batchId: { in: batchIds.map(b => b.id) } } });
    const passRate = labResults.length > 0 ? Math.round((labResults.filter(r => r.passed).length / labResults.length) * 100) : 0;

    // Avg THC from potency tests
    const potencyResults = labResults.filter(r => r.testType === 'POTENCY' && r.passed);
    const avgThc = potencyResults.length > 0
      ? potencyResults.reduce((s, r) => s + (typeof r.resultData === 'object' && r.resultData !== null ? (r.resultData as any).value || 0 : 0), 0) / potencyResults.length
      : strain.expectedThc || 0;

    analytics.push({
      id: strain.id,
      name: strain.name,
      species: strain.species,
      chemoType: strain.chemoType,
      expectedYield: strain.expectedYield,
      expectedThc: strain.expectedThc,
      expectedCbd: strain.expectedCbd,
      floweringWeeks: strain.floweringWeeks,
      source: strain.source,
      // Computed
      totalPlants,
      harvestedPlants,
      totalBatches,
      releasedBatches,
      motherCount,
      totalCuttings,
      totalRooted,
      rootingRate,
      labTestCount: labResults.length,
      passRate,
      avgThc: Math.round(avgThc * 10) / 10,
    });
  }

  return analytics;
}
