/**
 * Seed UAT test accounts — run once on the server:
 *   npx ts-node src/scripts/seed-uat-users.ts
 *
 * Creates one account per role with PIN 1234
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// NOTE: superilco@cleva-ai.co.za (SUPER_ADMIN) already exists — do NOT recreate
const UAT_USERS = [
  // Level 4
  { name: 'Ilze', email: 'ilze@ilcofarming.co.za', role: 'TENANT_ADMIN' },
  { name: 'RP', email: 'rp@ilcofarms.co.za', role: 'RESPONSIBLE_PHARMACIST' },
  // Level 3
  { name: 'Ray', email: 'ray@ilcofarming.co.za', role: 'FACILITY_MANAGER' },
  { name: 'Jannette (JR)', email: 'jr@ilcofarms.co.za', role: 'PROCESSING_MANAGER' },
  { name: 'Loraine', email: 'loraine@ilcofarms.co.za', role: 'FACILITY_SUPERVISOR' },
  { name: 'QA Inspector', email: 'qa@ilcofarms.co.za', role: 'QA_INSPECTOR' },
  { name: 'Maintenance Mgr', email: 'maint@ilcofarms.co.za', role: 'MAINTENANCE_MANAGER' },
  { name: 'Lou', email: 'lou@ilcofarming.co.za', role: 'HEAD_OF_CULTIVATION' },
  // Level 2 — Cultivators report to Lou
  { name: 'Cultivator 1', email: 'cult1@ilcofarms.co.za', role: 'CULTIVATOR' },
  { name: 'Cultivator 2', email: 'cult2@ilcofarms.co.za', role: 'CULTIVATOR' },
  { name: 'Keke', email: 'keke@ilcofarms.co.za', role: 'LAB_TECH' },
  { name: 'Irrigation Tech', email: 'irrigation@ilcofarms.co.za', role: 'IRRIGATION_TECH' },
  // Level 1
  { name: 'Sipho', email: 'sipho@ilcofarms.co.za', role: 'SECURITY_OFFICER' },
  { name: 'Trimmer 1', email: 'trimmer1@ilcofarms.co.za', role: 'TRIMMER' },
  { name: 'Trimmer 2', email: 'trimmer2@ilcofarms.co.za', role: 'TRIMMER' },
  { name: 'General Worker', email: 'worker@ilcofarms.co.za', role: 'GENERAL_WORKER' },
  { name: 'Housekeeping', email: 'hk@ilcofarms.co.za', role: 'HOUSEKEEPING' },
  { name: 'Laundry', email: 'laundry@ilcofarms.co.za', role: 'LAUNDRY' },
  // Level 0
  { name: 'SAHPRA Inspector', email: 'inspector@ilcofarms.co.za', role: 'VIEWER' },
];

async function main() {
  // Find tenant + facility
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) { console.error('No tenant found — run main seed first'); process.exit(1); }

  const facility = await prisma.facility.findFirst({ where: { tenantId: tenant.id } });
  if (!facility) { console.error('No facility found — run main seed first'); process.exit(1); }

  const pinHash = await bcrypt.hash('123456', 10);
  let created = 0;
  let skipped = 0;

  for (const u of UAT_USERS) {
    const existing = await prisma.user.findFirst({ where: { email: u.email } });
    if (existing) {
      console.log(`  SKIP: ${u.email} (already exists as ${existing.role})`);
      skipped++;
      continue;
    }

    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        role: u.role as any,
        pinHash,
        tenantId: tenant.id,
        facilityId: facility.id,
        active: true,
      },
    });
    console.log(`  ✅ Created: ${u.name} (${u.role}) — ${u.email} — PIN: 1234`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
