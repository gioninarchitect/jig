import 'dotenv/config';
import { prisma } from '../config/db';
import { logAction } from '../services/audit.service';

const FLORIS_EMAIL = 'florisolivier7@gmail.com';
const ILSE_EMAILS = ['ilze@ilcofarms.co.za', 'ilse@ilcofarming.co.za', 'adminilco@cleva-ai.co.za', 'ilze@ilcofarm.co.za'];
const DISABLE_SUPER_ADMIN_EMAILS = ['devon@applicationautomated.com', 'superilco@cleva-ai.co.za'];

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'ilco' } }) || await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');

  const floris = await prisma.user.findUnique({ where: { email: FLORIS_EMAIL } });
  if (!floris) throw new Error(`Required Super Admin missing: ${FLORIS_EMAIL}`);

  const updatedFloris = await prisma.user.update({
    where: { id: floris.id },
    data: { name: 'Floris Olivier', role: 'SUPER_ADMIN', active: true, tenantId: tenant.id },
  });

  const ilseUsers = await prisma.user.findMany({ where: { email: { in: ILSE_EMAILS } } });
  for (const user of ilseUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'TENANT_ADMIN', active: true, tenantId: tenant.id },
    });
  }

  const disabled = await prisma.user.updateMany({
    where: {
      email: { in: DISABLE_SUPER_ADMIN_EMAILS },
      active: true,
    },
    data: { active: false },
  });

  await logAction({
    userId: updatedFloris.id,
    tenantId: tenant.id,
    action: 'PRODUCTION_DATA_HARDENED',
    entityType: 'User',
    entityId: 'ROLE_BASELINE',
    after: {
      superAdmin: FLORIS_EMAIL,
      tenantAdminEmails: ilseUsers.map(user => user.email),
      disabledSuperAdminEmails: DISABLE_SUPER_ADMIN_EMAILS,
      disabledCount: disabled.count,
    },
  });

  const activeSuperAdmins = await prisma.user.findMany({
    where: { tenantId: tenant.id, active: true, role: 'SUPER_ADMIN' },
    select: { email: true, name: true },
  });

  console.log(JSON.stringify({
    tenant: tenant.name,
    floris: { email: updatedFloris.email, role: updatedFloris.role, active: updatedFloris.active },
    tenantAdminsUpdated: ilseUsers.length,
    disabledCount: disabled.count,
    activeSuperAdmins,
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
