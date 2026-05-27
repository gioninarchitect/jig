import { prisma } from '../config/db';
import { eventBus } from './eventBus';

const CONTROL_SOURCE = 'EU_GMP_VOL4_CH4_DOCUMENTATION, EU_GMP_VOL4_CH5_PRODUCTION, EU_GMP_VOL4_ANNEX11, EU_GMP_VOL4_PARTIII_Q9';
const CONTROL_STATUSES = new Set(['VOID', 'MISPRINTED', 'DAMAGED', 'DESTROYED', 'MISSING', 'REPRINTED']);

function labelCode(type: string) {
  const prefix = type.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'LABEL';
  return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function issueLabel(data: {
  labelType: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  batchId?: string;
  tenantId: string;
  userId: string;
}) {
  const record = await prisma.labelLifecycleRecord.create({
    data: {
      labelCode: labelCode(data.labelType),
      labelType: data.labelType,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      batchId: data.batchId,
      tenantId: data.tenantId,
      issuedById: data.userId,
    },
  });

  eventBus.emit('LABEL_ISSUED', {
    userId: data.userId,
    tenantId: data.tenantId,
    entityType: 'LabelLifecycleRecord',
    entityId: record.id,
    labelCode: record.labelCode,
  });

  return record;
}

export async function updateLabelStatus(id: string, data: {
  status: string;
  reasonCode?: string;
  reason?: string;
  signature?: string;
  tenantId: string;
  userId: string;
}) {
  const status = data.status.toUpperCase();
  if (CONTROL_STATUSES.has(status) && (!data.reasonCode || !data.reason || !data.signature)) {
    throw Object.assign(new Error('Reason code, reason, and signature are required for controlled label status changes'), { status: 400 });
  }

  const existing = await prisma.labelLifecycleRecord.findFirst({ where: { id, tenantId: data.tenantId } });
  if (!existing) throw Object.assign(new Error('Label record not found'), { status: 404 });

  const updated = await prisma.labelLifecycleRecord.update({
    where: { id },
    data: {
      status,
      reasonCode: data.reasonCode,
      reason: data.reason,
      signature: data.signature,
      updatedById: data.userId,
      reconciledAt: status === 'RECONCILED' ? new Date() : existing.reconciledAt,
    },
  });

  if (['MISSING', 'DESTROYED', 'MISPRINTED', 'DAMAGED'].includes(status)) {
    const openTicket = await prisma.ticket.findFirst({
      where: {
        tenantId: data.tenantId,
        ticketType: 'LABEL_CONTROL',
        status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        description: { contains: updated.labelCode },
      },
    });

    if (!openTicket) {
      await prisma.ticket.create({
        data: {
          title: `Label control: ${updated.labelCode} ${status}`,
          description: [
            `Label ${updated.labelCode} moved to ${status}.`,
            `Entity: ${updated.entityType || 'N/A'} ${updated.entityName || updated.entityId || ''}`,
            `Reason code: ${data.reasonCode}`,
            `Reason: ${data.reason}`,
            `Signed by: ${data.signature}`,
            `EU GMP controls: ${CONTROL_SOURCE}`,
          ].join('\n'),
          priority: status === 'MISSING' ? 'CRITICAL' : 'HIGH',
          ticketType: 'LABEL_CONTROL',
          category: 'COMPLIANCE_APPROVAL',
          workflowStage: 'FACILITY',
          batchId: updated.batchId,
          reportedById: data.userId,
          assignedToRole: 'QA_INSPECTOR',
          tenantId: data.tenantId,
        },
      });
    }
  }

  eventBus.emit('LABEL_STATUS_CHANGED', {
    userId: data.userId,
    tenantId: data.tenantId,
    entityType: 'LabelLifecycleRecord',
    entityId: updated.id,
    before: { status: existing.status },
    after: { status },
  });

  return updated;
}

export async function reconcileLabels(tenantId: string, userId: string) {
  const unreconciled = await prisma.labelLifecycleRecord.findMany({
    where: {
      tenantId,
      status: { in: ['ISSUED', 'PRINTED', 'REPRINTED'] },
    },
    orderBy: { issuedAt: 'asc' },
  });

  if (unreconciled.length > 0) {
    const managers = await prisma.user.findMany({
      where: { tenantId, active: true, role: { in: ['SUPER_ADMIN', 'TENANT_ADMIN', 'FACILITY_MANAGER', 'QA_INSPECTOR'] as any } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: managers.map(user => ({
        userId: user.id,
        title: `${unreconciled.length} unreconciled label(s)`,
        message: 'Stationary / QR label accountability requires issue, apply, void, destroy, or reconcile status.',
        link: '/assets',
      })),
    });
  }

  eventBus.emit('LABEL_RECONCILIATION_RUN', {
    userId,
    tenantId,
    entityType: 'LabelLifecycleRecord',
    entityId: 'LABEL_RECONCILIATION',
    unreconciled: unreconciled.length,
  });

  return { unreconciled: unreconciled.length, labels: unreconciled };
}

export async function listLabels(tenantId: string, status?: string) {
  return prisma.labelLifecycleRecord.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    orderBy: { issuedAt: 'desc' },
    take: 200,
  });
}
