import { prisma } from '../config/db';
import { eventBus } from './eventBus';

export async function listFeedPlans(tenantId: string, greenhouseId?: string) {
  const where: any = { tenantId, active: true };
  if (greenhouseId) where.greenhouseId = greenhouseId;
  return prisma.feedPlan.findMany({ where, orderBy: { name: 'asc' } });
}

export async function createFeedPlan(data: {
  name: string; greenhouseId: string; phase: string; schedule: any[];
  notes?: string; tenantId: string; userId: string;
}) {
  return prisma.feedPlan.create({
    data: { name: data.name, greenhouseId: data.greenhouseId, phase: data.phase, schedule: data.schedule, notes: data.notes, tenantId: data.tenantId, createdById: data.userId },
  });
}

export async function listFeedRecords(query: { tenantId: string; greenhouseId?: string; limit?: number }) {
  const where: any = { tenantId: query.tenantId };
  if (query.greenhouseId) where.greenhouseId = query.greenhouseId;
  return prisma.feedRecord.findMany({
    where,
    include: { feedPlan: { select: { name: true, phase: true } } },
    orderBy: { date: 'desc' },
    take: query.limit || 50,
  });
}

export async function createFeedRecord(data: {
  greenhouseId: string; bayId?: string; feedPlanId?: string;
  waterVolume?: number; nutrients?: any; phIn?: number; ecIn?: number;
  phRunOff?: number; ecRunOff?: number; runOffVolume?: number; runOffNotes?: string;
  temperature?: number; humidity?: number; notes?: string;
  tenantId: string; userId: string;
}) {
  const record = await prisma.feedRecord.create({
    data: {
      greenhouseId: data.greenhouseId, bayId: data.bayId, feedPlanId: data.feedPlanId,
      waterVolume: data.waterVolume, nutrients: data.nutrients,
      phIn: data.phIn, ecIn: data.ecIn,
      phRunOff: data.phRunOff, ecRunOff: data.ecRunOff,
      runOffVolume: data.runOffVolume, runOffNotes: data.runOffNotes,
      temperature: data.temperature, humidity: data.humidity,
      notes: data.notes, recordedById: data.userId, tenantId: data.tenantId,
    },
  });

  // Alert if pH or EC out of range
  if (data.phIn && (data.phIn < 5.5 || data.phIn > 6.8)) {
    eventBus.emit('FEEDING_PH_OUT_OF_RANGE', { userId: data.userId, tenantId: data.tenantId, entityType: 'FeedRecord', entityId: record.id, ph: data.phIn });
  }

  return record;
}

export async function getFeedingStats(tenantId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const records = await prisma.feedRecord.findMany({ where: { tenantId, date: { gte: weekAgo } } });
  const plans = await prisma.feedPlan.count({ where: { tenantId, active: true } });

  const avgPh = records.length > 0 ? records.filter(r => r.phIn).reduce((s, r) => s + (r.phIn || 0), 0) / records.filter(r => r.phIn).length : 0;
  const avgEc = records.length > 0 ? records.filter(r => r.ecIn).reduce((s, r) => s + (r.ecIn || 0), 0) / records.filter(r => r.ecIn).length : 0;
  const totalWater = records.reduce((s, r) => s + (r.waterVolume || 0), 0);

  return { activePlans: plans, recordsThisWeek: records.length, avgPh: Math.round(avgPh * 10) / 10, avgEc: Math.round(avgEc * 10) / 10, totalWaterL: Math.round(totalWater) };
}
