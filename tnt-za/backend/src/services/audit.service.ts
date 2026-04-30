import { prisma } from '../config/db';
import { computeHashChain } from '../utils/hash';
import { eventBus } from './eventBus';

interface AuditInput {
  userId: string;
  tenantId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  ip?: string;
  device?: string;
}

async function getLastHash(tenantId: string): Promise<string> {
  const last = await prisma.auditLog.findFirst({
    where: { tenantId },
    orderBy: { timestamp: 'desc' },
    select: { hashChain: true },
  });
  return last?.hashChain || 'GENESIS';
}

export async function logAction(input: AuditInput) {
  const prevHash = await getLastHash(input.tenantId);
  const ts = new Date().toISOString();
  const hash = computeHashChain(prevHash, ts, input.userId, input.action, input.entityId);

  const entry = await prisma.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: input.before || undefined,
      afterJson: input.after || undefined,
      ipAddress: input.ip || null,
      deviceId: input.device || null,
      hashChain: hash,
      tenantId: input.tenantId,
      userId: input.userId,
    },
  });

  return entry;
}

export async function verifyHashChain(tenantId: string) {
  const entries = await prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { timestamp: 'asc' },
    select: { id: true, hashChain: true, timestamp: true, userId: true, action: true, entityId: true },
  });

  if (entries.length === 0) return { valid: true, totalEntries: 0 };

  let prevHash = 'GENESIS';
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const expected = computeHashChain(prevHash, e.timestamp.toISOString(), e.userId, e.action, e.entityId);
    if (expected !== e.hashChain) {
      return { valid: false, brokenAtIndex: i, totalEntries: entries.length };
    }
    prevHash = e.hashChain;
  }

  return { valid: true, totalEntries: entries.length };
}

// Subscribe to all events and auto-log
eventBus.on('*', async (event) => {
  if (!event.userId || !event.tenantId) return;
  try {
    await logAction({
      userId: event.userId,
      tenantId: event.tenantId,
      action: event.type,
      entityType: event.entityType || 'System',
      entityId: event.entityId || 'N/A',
      before: event.before,
      after: event.after,
      ip: event.ip,
      device: event.device,
    });
  } catch (err) {
    console.error('[Audit] Auto-log failed:', err);
  }
});
