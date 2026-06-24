import { prisma } from '../config/db';
import { eventBus } from './eventBus';
import { logAction } from './audit.service';

// The chicken farm: 5 coops with editable, fluctuating flock counts (Loraine).
// These seed values are used ONCE to create the coop records; after that the
// live, editable ChickenCoop.flockCount is the source of truth.
const SEED_COOPS = [
  { name: 'Coop 1', flockCount: 2000 },
  { name: 'Coop 2', flockCount: 4200 },
  { name: 'Coop 3', flockCount: 2000 },
  { name: 'Coop 4', flockCount: 2300 },
  { name: 'Coop 5', flockCount: 10500 },
];

// Legacy export kept for any old callers; the live houses now come from coops.
export const HOUSES = SEED_COOPS.map(c => ({ name: c.name, flock: c.flockCount }));

// Idempotently ensure the 5 coops exist for a tenant (first load seeds them).
export async function ensureCoops(tenantId: string, facilityId: string) {
  const existing = await prisma.chickenCoop.count({ where: { tenantId } });
  if (existing > 0) return;
  for (const c of SEED_COOPS) {
    await prisma.chickenCoop.create({ data: { name: c.name, flockCount: c.flockCount, facilityId, tenantId } }).catch(() => {});
  }
}

export async function listCoops(tenantId: string) {
  return prisma.chickenCoop.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
}

// Edit a coop's flock count — GMP change-control: mandatory reason + full audit.
export async function updateCoop(id: string, data: { flockCount: number; changeReason: string; userId: string; tenantId: string }) {
  const existing = await prisma.chickenCoop.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!existing) throw Object.assign(new Error('Coop not found'), { status: 404 });
  const coop = await prisma.chickenCoop.update({ where: { id }, data: { flockCount: data.flockCount } });
  await logAction({
    userId: data.userId, tenantId: data.tenantId, action: 'CHICKEN_COOP_EDITED',
    entityType: 'ChickenCoop', entityId: id,
    before: { flockCount: existing.flockCount }, after: { flockCount: coop.flockCount, changeReason: data.changeReason },
  }).catch(() => {});
  return coop;
}

// ── Generic record helpers (mortality / temp / catch / abattoir / intake) ──
type Kind = 'mortality' | 'temp' | 'catch' | 'abattoir' | 'intake';
const MODEL: Record<Kind, any> = {
  mortality: () => prisma.chickenMortality,
  temp: () => prisma.chickenTemp,
  catch: () => prisma.chickenCatch,
  abattoir: () => prisma.chickenAbattoir,
  intake: () => prisma.chickenIntake,
};

export async function listRecords(kind: Kind, tenantId: string, opts: { coopName?: string } = {}) {
  const where: any = { tenantId };
  if (opts.coopName) where.coopName = opts.coopName;
  return MODEL[kind]().findMany({ where, orderBy: { date: 'desc' }, take: 365 });
}

export async function createMortality(d: { coopName: string; count: number; date?: Date; notes?: string; userId: string; tenantId: string }) {
  const rec = await prisma.chickenMortality.create({ data: { coopName: d.coopName, count: d.count, date: d.date || new Date(), notes: d.notes || null, recordedById: d.userId, tenantId: d.tenantId } });
  eventBus.emit('CHICKEN_MORTALITY_LOGGED', { userId: d.userId, tenantId: d.tenantId, entityType: 'ChickenMortality', entityId: rec.id });
  return rec;
}

export async function createTemp(d: { coopName: string; tempC: number; date?: Date; userId: string; tenantId: string }) {
  return prisma.chickenTemp.create({ data: { coopName: d.coopName, tempC: d.tempC, date: d.date || new Date(), recordedById: d.userId, tenantId: d.tenantId } });
}

export async function createCatch(d: { coopName?: string; cratesLoaded: number; perCrate: number; date?: Date; notes?: string; userId: string; tenantId: string }) {
  return prisma.chickenCatch.create({ data: { coopName: d.coopName || null, cratesLoaded: d.cratesLoaded, perCrate: d.perCrate, totalChickens: d.cratesLoaded * d.perCrate, date: d.date || new Date(), notes: d.notes || null, recordedById: d.userId, tenantId: d.tenantId } });
}

export async function createAbattoir(d: { cratesOnScale: number; perCrate: number; totalWeightKg: number; date?: Date; notes?: string; userId: string; tenantId: string }) {
  return prisma.chickenAbattoir.create({ data: { cratesOnScale: d.cratesOnScale, perCrate: d.perCrate, totalChickens: d.cratesOnScale * d.perCrate, totalWeightKg: d.totalWeightKg, date: d.date || new Date(), notes: d.notes || null, recordedById: d.userId, tenantId: d.tenantId } });
}

export async function signAbattoir(id: string, d: { userId: string; userName: string; tenantId: string }) {
  const existing = await prisma.chickenAbattoir.findFirst({ where: { id, tenantId: d.tenantId } });
  if (!existing) throw Object.assign(new Error('Record not found'), { status: 404 });
  const rec = await prisma.chickenAbattoir.update({ where: { id }, data: { signedById: d.userId, signedByName: d.userName, signedAt: new Date() } });
  await logAction({ userId: d.userId, tenantId: d.tenantId, action: 'CHICKEN_ABATTOIR_SIGNED', entityType: 'ChickenAbattoir', entityId: id, after: { signedByName: d.userName, totalWeightKg: rec.totalWeightKg, totalChickens: rec.totalChickens } }).catch(() => {});
  return rec;
}

export async function createIntake(d: { coopName?: string; count: number; date?: Date; notes?: string; userId: string; tenantId: string }) {
  return prisma.chickenIntake.create({ data: { coopName: d.coopName || null, count: d.count, date: d.date || new Date(), notes: d.notes || null, recordedById: d.userId, tenantId: d.tenantId } });
}

// Edit any record — GMP change-control: mandatory reason + full audit.
const EDITABLE_FIELDS: Record<Kind, string[]> = {
  mortality: ['coopName', 'count', 'notes'],
  temp: ['coopName', 'tempC'],
  catch: ['coopName', 'cratesLoaded', 'perCrate', 'notes'],
  abattoir: ['cratesOnScale', 'perCrate', 'totalWeightKg', 'notes'],
  intake: ['coopName', 'count', 'notes'],
};
export async function updateRecord(kind: Kind, id: string, body: any, ctx: { userId: string; tenantId: string }) {
  const changeReason = String(body?.changeReason ?? '').trim();
  if (!changeReason) throw Object.assign(new Error('A reason for the change is required'), { status: 400 });
  const model = MODEL[kind]();
  const existing = await model.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!existing) throw Object.assign(new Error('Record not found'), { status: 404 });
  const data: any = {};
  const before: any = {};
  for (const f of EDITABLE_FIELDS[kind]) {
    if (body[f] === undefined) continue;
    before[f] = existing[f];
    if (f === 'tempC' || f === 'totalWeightKg') data[f] = parseFloat(body[f]);
    else if (f === 'count' || f === 'cratesLoaded' || f === 'perCrate' || f === 'cratesOnScale') data[f] = parseInt(body[f]);
    else data[f] = body[f] || null;
  }
  // recompute derived totals
  if (kind === 'catch') data.totalChickens = (data.cratesLoaded ?? existing.cratesLoaded) * (data.perCrate ?? existing.perCrate);
  if (kind === 'abattoir') data.totalChickens = (data.cratesOnScale ?? existing.cratesOnScale) * (data.perCrate ?? existing.perCrate);
  const rec = await model.update({ where: { id }, data });
  await logAction({ userId: ctx.userId, tenantId: ctx.tenantId, action: `CHICKEN_${kind.toUpperCase()}_EDITED`, entityType: `Chicken${kind}`, entityId: id, before, after: { ...data, changeReason } }).catch(() => {});
  return rec;
}

// ── Existing per-crate photo-evidence flow (kept) ──────────────────────
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

// ── Summary (overview cards) — built from live coops + today's records ──
export async function getSummary(tenantId: string, facilityId?: string) {
  if (facilityId) await ensureCoops(tenantId, facilityId);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [coops, mortality, temps] = await Promise.all([
    prisma.chickenCoop.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    prisma.chickenMortality.findMany({ where: { tenantId } }),
    prisma.chickenTemp.findMany({ where: { tenantId }, orderBy: { date: 'desc' } }),
  ]);
  const houses = coops.map(c => {
    const m = mortality.filter(x => x.coopName === c.name);
    const todayM = m.filter(x => x.date >= today).reduce((s, x) => s + x.count, 0);
    const totalM = m.reduce((s, x) => s + x.count, 0);
    const latestTemp = temps.find(t => t.coopName === c.name);
    return {
      id: c.id, name: c.name, flock: c.flockCount,
      mortalityToday: todayM, mortalityTotal: totalM,
      tempC: latestTemp?.tempC ?? null,
    };
  });
  return {
    houses,
    totals: {
      flock: coops.reduce((s, c) => s + c.flockCount, 0),
      coops: coops.length,
      mortalityToday: mortality.filter(x => x.date >= today).reduce((s, x) => s + x.count, 0),
      mortalityTotal: mortality.reduce((s, x) => s + x.count, 0),
    },
  };
}
