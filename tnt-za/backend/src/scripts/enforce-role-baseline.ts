import 'dotenv/config';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/db';
import { logAction } from '../services/audit.service';

const ROLE_BASELINE: Array<{ email: string; role: UserRole; active: boolean; name?: string }> = [
  { email: 'florisolivier7@gmail.com', role: UserRole.SUPER_ADMIN, active: true, name: 'Floris Olivier' },
  { email: 'ilze@ilcofarms.co.za', role: UserRole.TENANT_ADMIN, active: true, name: 'Ilze' },
  { email: 'ilze@ilcofarm.co.za', role: UserRole.TENANT_ADMIN, active: true, name: 'Ilze' },
  { email: 'adminilco@cleva-ai.co.za', role: UserRole.TENANT_ADMIN, active: true, name: 'Ilze' },
  { email: 'coenie@ilcofarm.co.za', role: UserRole.TENANT_ADMIN, active: true, name: 'Coenie' },
  { email: 'rp@ilcofarms.co.za', role: UserRole.RESPONSIBLE_PHARMACIST, active: true, name: 'RP' },
  { email: 'ray@ilcofarms.co.za', role: UserRole.FACILITY_MANAGER, active: true, name: 'Ray' },
  { email: 'ray@ilcofarming.co.za', role: UserRole.FACILITY_MANAGER, active: true, name: 'Ray' },
  { email: 'fmilco@cleva-ai.co.za', role: UserRole.FACILITY_MANAGER, active: true, name: 'Ray' },
  { email: 'qa@ilcofarms.co.za', role: UserRole.QA_INSPECTOR, active: true, name: 'QA Inspector' },
  { email: 'lou@ilcofarms.co.za', role: UserRole.HEAD_OF_CULTIVATION, active: true, name: 'Lou' },
  { email: 'lou@ilcofarming.co.za', role: UserRole.HEAD_OF_CULTIVATION, active: true, name: 'Lou' },
  { email: 'nursery@ilcofarms.co.za', role: UserRole.NURSERY_MANAGER, active: true, name: 'Nursery' },
  { email: 'cult1@ilcofarms.co.za', role: UserRole.CULTIVATOR, active: true, name: 'Cultivator 1' },
  { email: 'cult2@ilcofarms.co.za', role: UserRole.CULTIVATOR, active: true, name: 'Cultivator 2' },
  { email: 'growerilco@cleva-ai.co.za', role: UserRole.CULTIVATOR, active: true, name: 'Lou' },
  { email: 'irrigation@ilcofarms.co.za', role: UserRole.IRRIGATION_TECH, active: true, name: 'Irrigation' },
  { email: 'jr@ilcofarms.co.za', role: UserRole.PROCESSING_MANAGER, active: true, name: 'Jannette' },
  { email: 'processing.supervisor@ilcofarms.co.za', role: UserRole.PROCESSING_SUPERVISOR, active: true, name: 'Processing Supervisor' },
  { email: 'trimmer1@ilcofarms.co.za', role: UserRole.TRIMMER, active: true, name: 'Trimmer 1' },
  { email: 'trimmer2@ilcofarms.co.za', role: UserRole.TRIMMER, active: true, name: 'Trimmer 2' },
  { email: 'keke@ilcofarms.co.za', role: UserRole.LAB_TECH, active: true, name: 'Keke' },
  { email: 'labilco@cleva-ai.co.za', role: UserRole.LAB_TECH, active: true, name: 'Keke' },
  { email: 'maint@ilcofarms.co.za', role: UserRole.MAINTENANCE_MANAGER, active: true, name: 'Maintenance' },
  { email: 'calvin@ilcofarms.co.za', role: UserRole.IT_MANAGER, active: true, name: 'Calvin Green' },
  { email: 'sipho@ilcofarms.co.za', role: UserRole.SECURITY_OFFICER, active: true, name: 'Sipho' },
  { email: 'securityilco@cleva-ai.co.za', role: UserRole.SECURITY_OFFICER, active: true, name: 'Sipho Dlamini' },
  { email: 'worker@ilcofarms.co.za', role: UserRole.GENERAL_WORKER, active: true, name: 'Worker' },
  { email: 'hk@ilcofarms.co.za', role: UserRole.HOUSEKEEPING, active: true, name: 'Housekeeping' },
  { email: 'laundry@ilcofarms.co.za', role: UserRole.LAUNDRY, active: true, name: 'Laundry' },
  { email: 'gmp.partner@ilcofarms.co.za', role: UserRole.GMP_PARTNER, active: true, name: 'GMP Partner' },
  { email: 'inspector@ilcofarms.co.za', role: UserRole.VIEWER, active: true, name: 'Inspector' },
  { email: 'inspector@cleva-ai.co.za', role: UserRole.VIEWER, active: true, name: 'SAHPRA Inspector' },
  { email: 'devon@applicationautomated.com', role: UserRole.SUPER_ADMIN, active: false, name: 'Devon' },
  { email: 'superilco@cleva-ai.co.za', role: UserRole.SUPER_ADMIN, active: false, name: 'Floris Olivier' },
];

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'ilco' } }) || await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');

  const facility = await prisma.facility.findFirst({ where: { tenantId: tenant.id } });
  if (!facility) throw new Error('No facility found');

  const actor = await prisma.user.findUnique({ where: { email: 'florisolivier7@gmail.com' } });
  if (!actor) throw new Error('Floris Super Admin account is required for role baseline audit');

  const changes = [];
  const missing = [];

  for (const expected of ROLE_BASELINE) {
    const user = await prisma.user.findUnique({ where: { email: expected.email } });
    if (!user) {
      missing.push(expected.email);
      continue;
    }

    const before = {
      role: user.role,
      active: user.active,
      name: user.name,
      tenantId: user.tenantId,
      facilityId: user.facilityId,
    };
    const after = {
      role: expected.role,
      active: expected.active,
      name: expected.name || user.name,
      tenantId: tenant.id,
      facilityId: facility.id,
    };

    const drifted =
      before.role !== after.role ||
      before.active !== after.active ||
      before.name !== after.name ||
      before.tenantId !== after.tenantId ||
      before.facilityId !== after.facilityId;

    if (!drifted) continue;

    await prisma.user.update({
      where: { id: user.id },
      data: after,
    });
    changes.push({ email: expected.email, before, after });
  }

  await logAction({
    userId: actor.id,
    tenantId: tenant.id,
    action: 'ROLE_BASELINE_ENFORCED',
    entityType: 'UserRoleBaseline',
    entityId: 'ILCO_ROLE_BASELINE',
    after: {
      totalBaselineAccounts: ROLE_BASELINE.length,
      corrected: changes.length,
      missing,
      changes,
    },
  });

  const activeByRole = await prisma.user.groupBy({
    by: ['role'],
    where: { tenantId: tenant.id, active: true },
    _count: { role: true },
  });

  console.log(JSON.stringify({
    tenant: tenant.name,
    baselineAccounts: ROLE_BASELINE.length,
    corrected: changes.length,
    missing,
    activeByRole: activeByRole.map(row => ({ role: row.role, count: row._count.role })),
  }, null, 2));

  process.exit(missing.length ? 1 : 0);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
