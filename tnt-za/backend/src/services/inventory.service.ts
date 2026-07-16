import { prisma } from '../config/db';
import { logAction } from './audit.service';

// ── Cultivation inventory (Loraine — replaces the paper logs) ─────────────────
// Balance is NEVER hand-calculated: it is the running sum of movements (IN +, OUT −),
// recomputed after every create/edit/delete so it is always correct.

export type Category = 'CHEMICAL' | 'SUBSTRATE' | 'CONSUMABLE' | 'HYGIENE';
export const CATEGORIES: Category[] = ['CHEMICAL', 'SUBSTRATE', 'CONSUMABLE', 'HYGIENE'];

// Real product names from her photographed forms. Seeded ONCE with balance 0 —
// she records the real opening stock via a stock-IN movement (no fabricated quantities).
const SEED: { name: string; category: Category; unit: string }[] = [
  // Per-product chemical logs
  { name: 'Biodyne', category: 'CHEMICAL', unit: 'L' },
  { name: 'Spliff', category: 'CHEMICAL', unit: 'L' },
  { name: 'Pyrol', category: 'CHEMICAL', unit: 'L' },
  { name: 'Diatomaceous Earth', category: 'CHEMICAL', unit: 'kg' },
  { name: 'Bittermag', category: 'CHEMICAL', unit: 'kg' },
  { name: 'Agrisil', category: 'CHEMICAL', unit: 'L' },
  { name: 'Rooting Gel', category: 'CHEMICAL', unit: 'unit' },
  { name: 'Vectobac (Bacillus)', category: 'CHEMICAL', unit: 'kg' },
  { name: 'Cerasulfur', category: 'CHEMICAL', unit: 'kg' },
  { name: 'Neudosan', category: 'CHEMICAL', unit: 'L' },
  { name: 'Hypochlorous Acid (HOCL)', category: 'CHEMICAL', unit: 'L' },
  // Substrate stock sheet (in KG)
  { name: 'Substrate', category: 'SUBSTRATE', unit: 'kg' },
  // Cultivation supplies / consumables
  { name: 'Blades', category: 'CONSUMABLE', unit: 'unit' },
  { name: 'Scrogg net', category: 'CONSUMABLE', unit: 'unit' },
  { name: 'Baling twine', category: 'CONSUMABLE', unit: 'unit' },
  // Hygiene inventory
  { name: 'Sanitizer', category: 'HYGIENE', unit: 'unit' },
  { name: 'Hand soap', category: 'HYGIENE', unit: 'unit' },
  { name: 'Hair nets', category: 'HYGIENE', unit: 'unit' },
  { name: 'Beard covers', category: 'HYGIENE', unit: 'unit' },
  { name: 'Sleeve covers', category: 'HYGIENE', unit: 'unit' },
  { name: 'Gloves', category: 'HYGIENE', unit: 'unit' },
];

export async function ensureSeedItems(tenantId: string, facilityId: string) {
  const count = await prisma.inventoryItem.count({ where: { tenantId } });
  if (count > 0) return;
  for (const s of SEED) {
    await prisma.inventoryItem.create({ data: { ...s, facilityId, tenantId } }).catch(() => {});
  }
}

export async function listItems(tenantId: string, category?: string) {
  return prisma.inventoryItem.findMany({
    where: { tenantId, ...(category ? { category } : {}) },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

export async function createItem(d: { name: string; category: string; unit?: string; reorderLevel?: number; facilityId: string; tenantId: string; userId: string }) {
  const item = await prisma.inventoryItem.create({
    data: {
      name: d.name.trim(), category: d.category, unit: d.unit || 'unit',
      reorderLevel: d.reorderLevel ?? null, facilityId: d.facilityId, tenantId: d.tenantId,
    },
  });
  await logAction({ userId: d.userId, tenantId: d.tenantId, action: 'INVENTORY_ITEM_CREATED', entityType: 'InventoryItem', entityId: item.id, after: { name: item.name, category: item.category, unit: item.unit } }).catch(() => {});
  return item;
}

// Edit item config (name / unit / reorder level / active) — reason + audit (GMP change-control).
export async function updateItem(id: string, body: any, ctx: { userId: string; tenantId: string }) {
  const changeReason = String(body?.changeReason ?? '').trim();
  if (!changeReason) throw Object.assign(new Error('A reason for the change is required'), { status: 400 });
  const existing = await prisma.inventoryItem.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!existing) throw Object.assign(new Error('Item not found'), { status: 404 });
  const data: any = {};
  const before: any = {};
  for (const f of ['name', 'unit', 'reorderLevel', 'active'] as const) {
    if (body[f] === undefined) continue;
    before[f] = (existing as any)[f];
    data[f] = f === 'reorderLevel' ? (body[f] === null || body[f] === '' ? null : parseFloat(body[f]))
      : f === 'active' ? !!body[f] : body[f];
  }
  const item = await prisma.inventoryItem.update({ where: { id }, data });
  await logAction({ userId: ctx.userId, tenantId: ctx.tenantId, action: 'INVENTORY_ITEM_EDITED', entityType: 'InventoryItem', entityId: id, before, after: { ...data, changeReason } }).catch(() => {});
  return item;
}

// Single source of truth for balance: replay every movement in order.
async function recomputeItem(itemId: string) {
  const moves = await prisma.inventoryMovement.findMany({ where: { itemId }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] });
  let running = 0;
  for (const m of moves) {
    running += m.type === 'IN' ? m.quantity : -m.quantity;
    if (m.balanceAfter !== running) {
      await prisma.inventoryMovement.update({ where: { id: m.id }, data: { balanceAfter: running } });
    }
  }
  await prisma.inventoryItem.update({ where: { id: itemId }, data: { balance: running } });
  return running;
}

export async function listMovements(tenantId: string, itemId: string) {
  return prisma.inventoryMovement.findMany({ where: { tenantId, itemId }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 500 });
}

export async function recordMovement(d: {
  itemId: string; type: 'IN' | 'OUT'; quantity: number; date?: Date;
  productIn?: string; batchNumber?: string; expiryDate?: Date; comment?: string;
  source?: 'MANUAL' | 'CHEMICAL_APPLICATION'; activityId?: string;
  userId: string; userName?: string; tenantId: string;
}) {
  if (!(d.quantity > 0)) throw Object.assign(new Error('Quantity must be greater than 0'), { status: 400 });
  const item = await prisma.inventoryItem.findFirst({ where: { id: d.itemId, tenantId: d.tenantId } });
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
  const m = await prisma.inventoryMovement.create({
    data: {
      itemId: d.itemId, type: d.type, quantity: d.quantity, balanceAfter: 0,
      date: d.date || new Date(), productIn: d.productIn || null, batchNumber: d.batchNumber || null,
      expiryDate: d.expiryDate || null, comment: d.comment || null,
      source: d.source || 'MANUAL', activityId: d.activityId || null,
      recordedById: d.userId, recordedByName: d.userName || null, tenantId: d.tenantId,
    },
  });
  const balance = await recomputeItem(d.itemId);
  await logAction({ userId: d.userId, tenantId: d.tenantId, action: `INVENTORY_${d.type}`, entityType: 'InventoryMovement', entityId: m.id,
    after: { item: item.name, type: d.type, quantity: d.quantity, unit: item.unit, balance, source: m.source, activityId: m.activityId } }).catch(() => {});
  return { movement: m, balance, negative: balance < 0 };
}

// Correct a past movement — reason + audit; balances downstream recompute automatically.
export async function updateMovement(id: string, body: any, ctx: { userId: string; tenantId: string }) {
  const changeReason = String(body?.changeReason ?? '').trim();
  if (!changeReason) throw Object.assign(new Error('A reason for the change is required'), { status: 400 });
  const existing = await prisma.inventoryMovement.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!existing) throw Object.assign(new Error('Movement not found'), { status: 404 });
  const data: any = {};
  const before: any = {};
  for (const f of ['type', 'quantity', 'productIn', 'batchNumber', 'comment'] as const) {
    if (body[f] === undefined) continue;
    before[f] = (existing as any)[f];
    data[f] = f === 'quantity' ? parseFloat(body[f]) : body[f] || null;
  }
  if (body.expiryDate !== undefined) { before.expiryDate = existing.expiryDate; data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null; }
  if (data.quantity !== undefined && !(data.quantity > 0)) throw Object.assign(new Error('Quantity must be greater than 0'), { status: 400 });
  await prisma.inventoryMovement.update({ where: { id }, data });
  const balance = await recomputeItem(existing.itemId);
  await logAction({ userId: ctx.userId, tenantId: ctx.tenantId, action: 'INVENTORY_MOVEMENT_EDITED', entityType: 'InventoryMovement', entityId: id, before, after: { ...data, balance, changeReason } }).catch(() => {});
  return { balance };
}

// Chemical Product Register — every chemical batch received (batch # + expiry + checked-by).
export async function getRegister(tenantId: string) {
  const rows = await prisma.inventoryMovement.findMany({
    where: { tenantId, type: 'IN', item: { category: 'CHEMICAL' } },
    include: { item: { select: { name: true, unit: true } } },
    orderBy: [{ date: 'desc' }],
    take: 500,
  });
  return rows.map(r => ({
    id: r.id, date: r.date, chemical: r.item.name, batchNumber: r.batchNumber,
    expiryDate: r.expiryDate, quantity: r.quantity, unit: r.item.unit,
    checkedBy: r.recordedByName, comment: r.comment,
  }));
}

// Alerts — low stock + expiring/expired chemical batches (still on hand).
export async function getAlerts(tenantId: string) {
  const items = await prisma.inventoryItem.findMany({ where: { tenantId, active: true } });
  const lowStock = items
    .filter(i => i.reorderLevel != null && i.balance <= i.reorderLevel)
    .map(i => ({ id: i.id, name: i.name, category: i.category, balance: i.balance, unit: i.unit, reorderLevel: i.reorderLevel }));

  const soon = new Date(); soon.setDate(soon.getDate() + 30);
  const inMoves = await prisma.inventoryMovement.findMany({
    where: { tenantId, type: 'IN', expiryDate: { not: null, lte: soon }, item: { category: 'CHEMICAL', balance: { gt: 0 } } },
    include: { item: { select: { name: true, unit: true } } },
    orderBy: [{ expiryDate: 'asc' }],
  });
  const now = Date.now();
  const expiring = inMoves.map(m => ({
    id: m.id, name: m.item.name, batchNumber: m.batchNumber, expiryDate: m.expiryDate,
    daysLeft: m.expiryDate ? Math.ceil((m.expiryDate.getTime() - now) / 86400000) : null,
  }));
  return { lowStock, expiring };
}
