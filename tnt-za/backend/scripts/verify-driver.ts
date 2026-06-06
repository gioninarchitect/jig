import { prisma } from '../src/config/db';
import { evaluate, getQueueForRole } from '../src/services/driver.service';

function assert(cond: boolean, msg: string) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } }

async function main() {
  const tenant = await prisma.tenant.findFirst();
  assert(!!tenant, 'a seeded tenant must exist (run npm run seed)');
  const tenantId = tenant!.id;

  const first = await evaluate(tenantId);
  console.log('evaluate #1 upserted:', first.upserted);

  // idempotency: a second run must NOT grow the row count
  const before = await prisma.driverItem.count({ where: { tenantId } });
  await evaluate(tenantId);
  const after = await prisma.driverItem.count({ where: { tenantId } });
  assert(after === before, `idempotent re-run changed count ${before} -> ${after}`);

  const fmQueue = await getQueueForRole(tenantId, 'FACILITY_MANAGER');
  assert(Array.isArray(fmQueue), 'getQueueForRole must return an array');
  console.log('FM queue size:', fmQueue.length, fmQueue.slice(0, 4).map((d) => `${d.severity}:${d.title}`));

  // by-source breakdown across all roles
  const all = await prisma.driverItem.groupBy({ by: ['sourceType'], where: { tenantId }, _count: true });
  console.log('by sourceType:', all.map((g) => `${g.sourceType}=${g._count}`).join(' '));
  console.log('PASS');
  process.exit(0);
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
