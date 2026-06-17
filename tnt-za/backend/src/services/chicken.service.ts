import { prisma } from '../config/db';
import { eventBus } from './eventBus';

// The chicken farm: 4 houses (House 1 = 10 000 birds, Houses 2–4 ≈ 3 300 each).
export const HOUSES = [
  { name: 'House 1', flock: 10000 },
  { name: 'House 2', flock: 3300 },
  { name: 'House 3', flock: 3300 },
  { name: 'House 4', flock: 3300 },
];

export async function listCrates(tenantId: string, opts: { house?: string; todayOnly?: boolean } = {}) {
  const where: any = { tenantId };
  if (opts.house) where.house = opts.house;
  if (opts.todayOnly) { const d = new Date(); d.setHours(0, 0, 0, 0); where.loadedDate = { gte: d }; }
  return prisma.chickenCrate.findMany({ where, orderBy: { loadedDate: 'desc' } });
}

export async function createCrate(data: {
  house: string; chickenCount: number; photoUrl?: string; notes?: string;
  facilityId: string; tenantId: string; userId: string;
}) {
  const count = await prisma.chickenCrate.count({ where: { tenantId: data.tenantId } });
  const crateNumber = `CR-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
  const crate = await prisma.chickenCrate.create({
    data: {
      crateNumber, house: data.house, chickenCount: data.chickenCount,
      photoUrl: data.photoUrl || null, notes: data.notes || null,
      loadedById: data.userId, facilityId: data.facilityId, tenantId: data.tenantId,
    },
  });
  eventBus.emit('CHICKEN_CRATE_LOADED', { userId: data.userId, tenantId: data.tenantId, entityType: 'ChickenCrate', entityId: crate.id });
  return crate;
}

// Daily verification by admin (Loraine): verify (optionally correcting the count) or flag.
export async function verifyCrate(id: string, data: { action: 'verify' | 'flag'; verifiedCount?: number; flagReason?: string; userId: string; tenantId: string }) {
  const status = data.action === 'flag' ? 'FLAGGED' : 'VERIFIED';
  const crate = await prisma.chickenCrate.update({
    where: { id },
    data: {
      status, verifiedById: data.userId, verifiedAt: new Date(),
      verifiedCount: data.verifiedCount ?? undefined,
      flagReason: data.action === 'flag' ? (data.flagReason || 'flagged') : null,
    },
  });
  eventBus.emit(data.action === 'flag' ? 'CHICKEN_CRATE_FLAGGED' : 'CHICKEN_CRATE_VERIFIED',
    { userId: data.userId, tenantId: data.tenantId, entityType: 'ChickenCrate', entityId: id });
  return crate;
}

export async function getSummary(tenantId: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const crates = await prisma.chickenCrate.findMany({ where: { tenantId } });
  const houses = HOUSES.map(h => {
    const inHouse = crates.filter(c => c.house === h.name);
    const todays = inHouse.filter(c => c.loadedDate >= today);
    return {
      name: h.name, flock: h.flock,
      crates: inHouse.length,
      loadedToday: todays.length,
      birdsLoaded: inHouse.reduce((s, c) => s + (c.chickenCount || 0), 0),
      verified: inHouse.filter(c => c.status === 'VERIFIED').length,
      pending: inHouse.filter(c => c.status === 'PENDING').length,
      flagged: inHouse.filter(c => c.status === 'FLAGGED').length,
    };
  });
  return {
    houses,
    totals: {
      flock: HOUSES.reduce((s, h) => s + h.flock, 0),
      crates: crates.length,
      verified: crates.filter(c => c.status === 'VERIFIED').length,
      pending: crates.filter(c => c.status === 'PENDING').length,
      flagged: crates.filter(c => c.status === 'FLAGGED').length,
    },
  };
}
