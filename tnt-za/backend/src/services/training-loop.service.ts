import { prisma } from '../config/db';
import { eventBus } from './eventBus';

// ─────────────────────────────────────────────────────────────────────────────
// Failed-SOP → remedial-training loop  (SOP violation → CAPA → training → competency)
//
// A Deviation is always tied to an SOP (sopId) and the employee on record
// (raisedById). When one is raised, auto-assign that employee TARGETED remedial
// training on the deviated SOP. Closes the reactive half of the training loop:
// the proactive half (sop-governance assigns "read & acknowledge SOP" to a role)
// already exists; this is the "you deviated → you re-train" half.
//
// Idempotent: one open remedial record per (employee, SOP). Re-raising while one
// is still open does not stack duplicates.
// ─────────────────────────────────────────────────────────────────────────────

async function assignRemedialTraining(deviationId: string, tenantId: string) {
  const dev = await prisma.deviation.findUnique({
    where: { id: deviationId },
    include: {
      sop: { select: { id: true, title: true, version: true } },
      raisedBy: { select: { id: true, name: true } },
    },
  });
  if (!dev || !dev.sop || !dev.raisedBy) return;

  // Idempotency — skip if this employee already has open remedial training on this SOP.
  const existing = await prisma.trainingRecord.findFirst({
    where: {
      tenantId,
      userId: dev.raisedById,
      sopId: dev.sopId,
      trainingType: 'REMEDIAL',
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
    select: { id: true },
  });
  if (existing) return;

  const record = await prisma.trainingRecord.create({
    data: {
      userId: dev.raisedById,
      userName: dev.raisedBy.name,
      trainingType: 'REMEDIAL',
      title: `Remedial training: ${dev.sop.title} (v${dev.sop.version})`,
      description:
        `Auto-assigned after a ${dev.severity} deviation on this SOP. ` +
        `Re-study the SOP and re-acknowledge it; competency must be restored before ` +
        `signing off this task again.`,
      sopId: dev.sopId,
      status: 'PENDING',
      tenantId,
    },
  });

  // Notify the employee (Notification has no tenantId).
  try {
    await prisma.notification.create({
      data: {
        userId: dev.raisedById,
        title: 'Remedial training assigned',
        message: `A ${dev.severity} deviation on "${dev.sop.title}" assigned you remedial training. Complete it to restore competency.`,
        link: '/hr',
      },
    });
  } catch { /* non-fatal */ }

  eventBus.emit('REMEDIAL_TRAINING_ASSIGNED', {
    userId: dev.raisedById, tenantId, entityType: 'TrainingRecord', entityId: record.id,
  });
  console.log(`[training-loop] remedial training -> ${dev.raisedBy.name} on SOP ${dev.sop.title}`);
}

export function startTrainingLoop() {
  eventBus.on('DEVIATION_RAISED', (e: any) => {
    if (!e?.entityId || !e?.tenantId) return;
    assignRemedialTraining(e.entityId, e.tenantId).catch((err) =>
      console.error('[training-loop] assign failed:', err.message),
    );
  });
  console.log('[training-loop] started — DEVIATION_RAISED -> remedial training');
}
