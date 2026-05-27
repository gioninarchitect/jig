import { PrismaClient } from '@prisma/client';
import { logAction } from '../services/audit.service';
import { ensureBatchCultivationRecord } from '../services/bcr.service';

const prisma = new PrismaClient();

function nowMinus(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function audit(userId: string, tenantId: string, action: string, entityType: string, entityId: string, after?: any) {
  await logAction({ userId, tenantId, action, entityType, entityId, after });
}

async function main() {
  const tenant =
    await prisma.tenant.findFirst({ where: { slug: 'ilco' } }) ||
    await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!tenant) throw new Error('No tenant found');

  const facility = await prisma.facility.findFirst({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'asc' } });
  if (!facility) throw new Error(`No facility found for tenant ${tenant.name}`);

  const actor =
    await prisma.user.findFirst({ where: { email: 'devon@applicationautomated.com' } }) ||
    await prisma.user.findFirst({ where: { email: 'florisolivier7@gmail.com' } }) ||
    await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'SUPER_ADMIN', active: true } });
  if (!actor) throw new Error('No super/admin actor found');

  const rp = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'RESPONSIBLE_PHARMACIST', active: true } }) || actor;
  const dar = await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'TENANT_ADMIN', active: true } }) || actor;
  const ar = actor;

  const batch =
    await prisma.batch.findFirst({ where: { tenantId: tenant.id, batchNumber: 'B-2026-001' } }) ||
    await prisma.batch.findFirst({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'asc' } });
  if (!batch) throw new Error('No batch found for golden UAT dataset');

  const labelPrefix = 'UAT-50';
  const existingLabels = await prisma.labelLifecycleRecord.findMany({
    where: { tenantId: tenant.id, labelCode: { startsWith: labelPrefix } },
  });

  if (existingLabels.length === 0) {
    for (let i = 1; i <= 50; i++) {
      const labelCode = `${labelPrefix}-${String(i).padStart(2, '0')}`;
      let status = 'APPLIED';
      let entityType: string | null = 'Batch';
      let entityId: string | null = batch.id;
      let entityName: string | null = batch.batchNumber;
      let reasonCode: string | null = null;
      let reason: string | null = null;
      let signature: string | null = null;
      let reconciledAt: Date | null = null;

      if (i >= 46 && i <= 48) {
        status = 'RECONCILED';
        entityType = 'StationeryStock';
        entityId = null;
        entityName = 'Unused controlled labels retained in locked stationery';
        reasonCode = 'UNUSED_RETAINED';
        reason = 'Unused labels counted and retained after 45 labels were applied.';
        signature = `${actor.name} / ${actor.email}`;
        reconciledAt = new Date();
      } else if (i === 49) {
        status = 'VOID';
        entityType = 'StationeryStock';
        entityId = null;
        entityName = 'Void label from print alignment check';
        reasonCode = 'PRINT_ALIGNMENT_VOID';
        reason = 'Label voided during printer alignment check before application.';
        signature = `${actor.name} / ${actor.email}`;
        reconciledAt = new Date();
      } else if (i === 50) {
        status = 'MISSING';
        entityType = 'StationeryStock';
        entityId = null;
        entityName = 'Missing controlled label under QA investigation';
        reasonCode = 'MISSING_DURING_RECONCILIATION';
        reason = 'Label not present during 50-label reconciliation. QA ticket raised for investigation.';
        signature = `${actor.name} / ${actor.email}`;
      }

      await prisma.labelLifecycleRecord.create({
        data: {
          labelCode,
          labelType: '50_50',
          status,
          entityType,
          entityId,
          entityName,
          reasonCode,
          reason,
          signature,
          reconciledAt,
          batchId: i <= 45 ? batch.id : null,
          tenantId: tenant.id,
          issuedById: actor.id,
          updatedById: actor.id,
        },
      });
    }
    await audit(actor.id, tenant.id, 'GOLDEN_UAT_LABEL_SET_CREATED', 'LabelLifecycleRecord', 'UAT-50', { issued: 50, applied: 45, retained: 3, void: 1, missing: 1 });
  }

  const openMissingTicket = await prisma.ticket.findFirst({
    where: {
      tenantId: tenant.id,
      ticketType: 'LABEL_CONTROL',
      description: { contains: 'UAT-50-50' },
      status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
    },
  });
  if (!openMissingTicket) {
    const ticket = await prisma.ticket.create({
      data: {
        title: 'Golden UAT label control: UAT-50-50 missing',
        description: [
          'Golden UAT 50/50 label reconciliation.',
          '45 labels applied to batch record.',
          '3 labels retained as unused controlled stationery.',
          '1 label voided with reason and signature.',
          '1 label missing: UAT-50-50.',
          'EU GMP controls: EU_GMP_VOL4_CH4_DOCUMENTATION, EU_GMP_VOL4_PARTIII_Q9, EU_GMP_VOL4_ANNEX11',
        ].join('\n'),
        priority: 'CRITICAL',
        ticketType: 'LABEL_CONTROL',
        category: 'COMPLIANCE_APPROVAL',
        workflowStage: 'FACILITY',
        batchId: batch.id,
        reportedById: actor.id,
        assignedToRole: 'QA_INSPECTOR',
        tenantId: tenant.id,
      },
    });
    await audit(actor.id, tenant.id, 'GOLDEN_UAT_LABEL_TICKET_CREATED', 'Ticket', ticket.id, { labelCode: 'UAT-50-50' });
  }

  const pendingTraining = await prisma.trainingRecord.findMany({
    where: { tenantId: tenant.id, status: { in: ['PENDING', 'IN_PROGRESS'] }, sopId: { not: null } },
  });
  for (const record of pendingTraining) {
    await prisma.trainingRecord.update({
      where: { id: record.id },
      data: {
        status: 'COMPLETED',
        completedAt: nowMinus(45),
        score: 92,
        assessedById: actor.id,
        certificate: `UAT-CERT-${record.id.slice(0, 8).toUpperCase()}`,
        notes: 'Golden UAT completion: SOP review, on-the-job walkthrough, written assessment, and supervisor sign-off recorded.',
      },
    });

    const sop = await prisma.sOP.findUnique({ where: { id: record.sopId! }, select: { version: true } });
    if (sop) {
      await prisma.sOPAcknowledgement.upsert({
        where: { sopId_userId_sopVersion: { sopId: record.sopId!, userId: record.userId, sopVersion: sop.version } },
        update: { acknowledgedAt: nowMinus(44) },
        create: { sopId: record.sopId!, userId: record.userId, sopVersion: sop.version },
      });
    }
  }
  if (pendingTraining.length > 0) {
    await audit(actor.id, tenant.id, 'GOLDEN_UAT_TRAINING_COMPLETED', 'TrainingRecord', 'SOP_TRAINING', { completed: pendingTraining.length });
  }

  const deviation = await prisma.deviation.findFirst({
    where: { facilityId: facility.id },
    orderBy: { createdAt: 'asc' },
  });
  if (deviation && !deviation.closedAt) {
    await prisma.deviation.update({
      where: { id: deviation.id },
      data: {
        rootCause: 'Golden UAT RCA: scale verification gap and incomplete second-person check during drying-zone unload.',
        capa: 'Scale recalibrated, second-person verification added to container unload checklist, label/BCR review required before QA release.',
        closedAt: nowMinus(30),
      },
    });
    await audit(actor.id, tenant.id, 'GOLDEN_UAT_DEVIATION_CAPA_CLOSED', 'Deviation', deviation.id, { rootCause: true, capa: true, closedAt: true });
  }

  const smfSection =
    await prisma.sMFSection.findFirst({ where: { tenantId: tenant.id, sectionId: 'C.1.1', unit: 'cannabis' } }) ||
    await prisma.sMFSection.findFirst({ where: { tenantId: tenant.id, unit: 'cannabis' }, orderBy: [{ chapter: 'asc' }, { sectionId: 'asc' }] });
  if (smfSection && smfSection.status !== 'AR_APPROVED') {
    const bodyText = smfSection.bodyText || 'Golden UAT SMF section completed from governed site, QMS, training, label, BCR, and audit evidence.';
    const signedAt = nowMinus(20);
    const updated = await prisma.sMFSection.update({
      where: { id: smfSection.id },
      data: {
        bodyText,
        status: 'AR_APPROVED',
        rpSignedById: rp.id,
        rpSignedAt: nowMinus(22),
        rpNotes: 'Golden UAT RP review completed.',
        darSignedById: dar.id,
        darSignedAt: nowMinus(21),
        darNotes: 'Golden UAT DAR review completed.',
        arApprovedById: ar.id,
        arApprovedAt: signedAt,
        arNotes: 'Golden UAT AR approval completed.',
      },
    });
    const existingVersion = await prisma.sMFSectionVersion.findFirst({
      where: { sectionFkId: smfSection.id },
      orderBy: { versionNumber: 'desc' },
    });
    if (!existingVersion) {
      await prisma.sMFSectionVersion.create({
        data: {
          sectionFkId: smfSection.id,
          versionNumber: 1,
          bodyText: updated.bodyText,
          signedAt,
          rpSignedById: updated.rpSignedById,
          darSignedById: updated.darSignedById,
          arApprovedById: updated.arApprovedById,
        },
      });
    }
    await audit(actor.id, tenant.id, 'GOLDEN_UAT_SMF_APPROVED', 'SMFSection', smfSection.id, { sectionId: smfSection.sectionId, status: 'AR_APPROVED' });
  }

  const bcr = await ensureBatchCultivationRecord(batch.id, tenant.id, actor.id);

  await prisma.notification.createMany({
    data: [
      {
        userId: actor.id,
        title: 'Golden UAT dataset ready',
        message: 'Label accountability, SOP training, SMF approval, CAPA closure, and BCR evidence have been prepared.',
        link: '/dashboard',
      },
    ],
    skipDuplicates: true,
  });

  const labelCounts = await prisma.labelLifecycleRecord.groupBy({
    by: ['status'],
    where: { tenantId: tenant.id, labelCode: { startsWith: labelPrefix } },
    _count: { status: true },
  });

  const trainingRemaining = await prisma.trainingRecord.count({
    where: { tenantId: tenant.id, status: { in: ['PENDING', 'IN_PROGRESS'] }, sopId: { not: null } },
  });

  console.log(JSON.stringify({
    tenant: tenant.name,
    batch: batch.batchNumber,
    labels: labelCounts.reduce((acc, row) => ({ ...acc, [row.status]: row._count.status }), {}),
    trainingRemaining,
    smfSigned: smfSection?.sectionId,
    bcr: bcr.recordNumber,
    checklistItems: Array.isArray(bcr.checklistSummary) ? bcr.checklistSummary.length : 0,
  }, null, 2));
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
