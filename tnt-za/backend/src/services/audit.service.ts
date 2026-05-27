import { prisma } from '../config/db';
import { computeHashChain } from '../utils/hash';
import { eventBus } from './eventBus';
import { requestContext } from '../utils/requestContext';

interface AuditInput {
  userId: string;          // REAL actor (ignore ghost target here)
  tenantId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  ip?: string;
  device?: string;
  ghostAsUserId?: string;  // OPTIONAL — when populated, this row is "userId acting as ghostAsUserId"
}

async function getLastHash(tenantId: string): Promise<string> {
  const last = await prisma.auditLog.findFirst({
    where: { tenantId },
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    select: { hashChain: true },
  });
  return last?.hashChain || 'GENESIS';
}

export async function logAction(input: AuditInput) {
  const prevHash = await getLastHash(input.tenantId);
  const timestamp = new Date();
  const hash = computeHashChain(prevHash, timestamp.toISOString(), input.userId, input.action, input.entityId);

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
      timestamp,
      tenantId: input.tenantId,
      userId: input.userId,
      ghostAsUserId: input.ghostAsUserId || null,
    },
  });

  return entry;
}

export async function verifyHashChain(tenantId: string) {
  const entries = await prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
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
  // Pull request context (set by auth middleware) so we can rewrite the
  // log to attribute the action to the REAL actor while preserving the
  // ghost target — gives a complete accountability trail.
  const ctx = requestContext.getStore();
  const realUserId = ctx?.realUserId ?? event.userId;
  const ghostAsUserId = ctx?.ghostAsUserId;
  try {
    await logAction({
      userId: realUserId,
      tenantId: event.tenantId,
      action: event.type,
      entityType: event.entityType || 'System',
      entityId: event.entityId || 'N/A',
      before: event.before,
      after: event.after,
      ip: event.ip,
      device: event.device,
      ghostAsUserId,
    });
  } catch (err) {
    console.error('[Audit] Auto-log failed:', err);
  }
});
