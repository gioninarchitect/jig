import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { logAction } from '../services/audit.service';

const email = process.argv[2]?.trim().toLowerCase();
const pin = process.argv[3]?.trim();
const allowedRoles = new Set(['SUPER_ADMIN', 'FACILITY_MANAGER']);

async function main() {
  if (!email || !pin || !/^\d{6}$/.test(pin)) {
    throw new Error('Usage: node dist/scripts/set-permanent-pin.js <email> <6-digit-pin>');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`User not found: ${email}`);
  if (!allowedRoles.has(user.role)) throw new Error(`Permanent PIN is only allowed for Super Admin/FM. ${email} is ${user.role}`);

  const pinHash = await bcrypt.hash(pin, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash, failedAttempts: 0, lockedAt: null },
  });

  await prisma.session.deleteMany({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
  });

  await logAction({
    userId: user.id,
    tenantId: user.tenantId,
    action: 'PERMANENT_PIN_SET',
    entityType: 'User',
    entityId: user.id,
    after: { email: user.email, role: user.role, scope: 'SUPER_ADMIN_FM_ONLY' },
  });

  console.log(JSON.stringify({ success: true, email: user.email, role: user.role }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
