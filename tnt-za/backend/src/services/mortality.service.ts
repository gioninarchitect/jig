import { prisma } from '../config/db';
import { eventBus } from './eventBus';

export async function recordDeath(data: {
  entityType: string; entityId?: string; cloneTrayId?: string; strain: string;
  quantity: number; causeCategory: string; causeDetail?: string;
  preventable?: boolean; actionTaken?: string;
  greenhouseId?: string; bayId?: string; phase?: string;
  photos?: string[]; notes?: string;
  tenantId: string; userId: string;
}) {
  const record = await prisma.mortalityRecord.create({
    data: {
      entityType: data.entityType, entityId: data.entityId,
      cloneTrayId: data.cloneTrayId, strain: data.strain,
      quantity: data.quantity, causeCategory: data.causeCategory,
      causeDetail: data.causeDetail, preventable: data.preventable || false,
      actionTaken: data.actionTaken, greenhouseId: data.greenhouseId,
      bayId: data.bayId, phase: data.phase, photos: data.photos || [],
      notes: data.notes, reportedById: data.userId, tenantId: data.tenantId,
    },
  });

  // Update clone tray mortality count if applicable
  if (data.cloneTrayId) {
    await prisma.cloneTray.update({
      where: { id: data.cloneTrayId },
      data: { mortality: { increment: data.quantity } },
    });
  }

  // Flag plant if applicable
  if (data.entityType === 'PLANT' && data.entityId) {
    await prisma.plant.update({
      where: { id: data.entityId },
      data: { status: 'DESTROYED' },
    });
  }

  eventBus.emit('MORTALITY_RECORDED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'MortalityRecord', entityId: record.id,
    cause: data.causeCategory, quantity: data.quantity,
  });

  return record;
}

export async function listMortality(query: {
  tenantId: string; causeCategory?: string; strain?: string; entityType?: string;
}) {
  const where: any = { tenantId: query.tenantId };
  if (query.causeCategory) where.causeCategory = query.causeCategory;
  if (query.strain) where.strain = query.strain;
  if (query.entityType) where.entityType = query.entityType;

  return prisma.mortalityRecord.findMany({
    where,
    orderBy: { date: 'desc' },
    take: 100,
  });
}

export async function getMortalityStats(tenantId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const allRecords = await prisma.mortalityRecord.findMany({ where: { tenantId } });
  const thisMonth = allRecords.filter(r => r.date >= monthStart);

  // Total deaths
  const totalDeaths = allRecords.reduce((s, r) => s + r.quantity, 0);
  const monthlyDeaths = thisMonth.reduce((s, r) => s + r.quantity, 0);

  // By cause
  const byCause: Record<string, number> = {};
  allRecords.forEach(r => { byCause[r.causeCategory] = (byCause[r.causeCategory] || 0) + r.quantity; });

  // By strain
  const byStrain: Record<string, number> = {};
  allRecords.forEach(r => { byStrain[r.strain] = (byStrain[r.strain] || 0) + r.quantity; });

  // Preventable %
  const preventable = allRecords.filter(r => r.preventable).reduce((s, r) => s + r.quantity, 0);
  const preventableRate = totalDeaths > 0 ? Math.round((preventable / totalDeaths) * 100) : 0;

  // Top cause
  const topCause = Object.entries(byCause).sort((a, b) => b[1] - a[1])[0];

  // Clone mortality rate
  const cloneTrays = await prisma.cloneTray.findMany({ where: { tenantId } });
  const totalCuttings = cloneTrays.reduce((s, t) => s + t.totalCuttings, 0);
  const totalCloneMortality = cloneTrays.reduce((s, t) => s + t.mortality, 0);
  const cloneMortalityRate = totalCuttings > 0 ? Math.round((totalCloneMortality / totalCuttings) * 100) : 0;

  return {
    totalDeaths, monthlyDeaths, preventableRate, cloneMortalityRate,
    topCause: topCause ? { cause: topCause[0], count: topCause[1] } : null,
    byCause, byStrain,
    totalRecords: allRecords.length,
  };
}

export async function reviewMortality(id: string, userId: string) {
  return prisma.mortalityRecord.update({
    where: { id },
    data: { reviewedById: userId, reviewedAt: new Date() },
  });
}
