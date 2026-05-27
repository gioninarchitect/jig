import 'dotenv/config';
import { prisma } from '../config/db';
import { eventBus } from '../services/eventBus';

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'ilco' } }) || await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');

  const superAdmin =
    await prisma.user.findFirst({ where: { tenantId: tenant.id, email: 'florisolivier7@gmail.com' } }) ||
    await prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'SUPER_ADMIN' } });
  if (!superAdmin) throw new Error('No Super Admin found to assess UAT training');

  const pending = await prisma.trainingRecord.findMany({
    where: {
      tenantId: tenant.id,
      status: { not: 'COMPLETED' },
      title: { contains: 'SOP Training:' },
    },
    select: { id: true, userId: true, title: true },
  });

  if (pending.length) {
    await prisma.trainingRecord.updateMany({
      where: { id: { in: pending.map(record => record.id) } },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        assessedById: superAdmin.id,
        score: 100,
        notes: 'Golden UAT EU GMP role-coverage training completed for demo readiness.',
      },
    });
  }

  eventBus.emit('EU_GMP_UAT_TRAINING_COMPLETED', {
    userId: superAdmin.id,
    tenantId: tenant.id,
    entityType: 'TrainingRecord',
    entityId: 'EU_GMP_UAT_TRAINING',
    count: pending.length,
  });

  console.log(JSON.stringify({
    tenant: tenant.name,
    assessedBy: superAdmin.email,
    completedTrainingRecords: pending.length,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
