import { prisma } from '../config/db';
import { computeHashChain } from '../utils/hash';

async function repairTenant(tenantId: string) {
  const entries = await prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    select: { id: true, timestamp: true, userId: true, action: true, entityId: true, hashChain: true },
  });

  let previous = 'GENESIS';
  let repaired = 0;

  for (const entry of entries) {
    const next = computeHashChain(
      previous,
      entry.timestamp.toISOString(),
      entry.userId,
      entry.action,
      entry.entityId,
    );

    if (entry.hashChain !== next) {
      await prisma.auditLog.update({
        where: { id: entry.id },
        data: { hashChain: next },
      });
      repaired++;
    }

    previous = next;
  }

  return { tenantId, total: entries.length, repaired };
}

async function main() {
  const tenantArg = process.argv.find(arg => arg.startsWith('--tenant='));
  const tenantId = tenantArg?.split('=')[1];

  const tenants = tenantId
    ? await prisma.tenant.findMany({ where: { id: tenantId }, select: { id: true, name: true } })
    : await prisma.tenant.findMany({ select: { id: true, name: true } });

  if (tenants.length === 0) throw new Error('No tenant found for audit repair');

  for (const tenant of tenants) {
    const result = await repairTenant(tenant.id);
    console.log(`${tenant.name}: ${result.repaired}/${result.total} audit rows repaired`);
  }
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
