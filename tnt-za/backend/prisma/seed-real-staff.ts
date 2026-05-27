// =====================================================================
// Seed: real ILCO staff (replaces / augments the placeholder seed)
//
// Adds the actual people from SMF v4.6 + corrects Keke's role.
// Idempotent: upserts by email.
//
// Run:  cd tnt-za/backend && pnpm tsx prisma/seed-real-staff.ts
// =====================================================================

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface StaffSpec {
  email: string;
  name: string;
  role: UserRole;
  pin: string;
  notes?: string;
}

const STAFF: StaffSpec[] = [
  { email: 'berne@ilcofarming.co.za',    name: 'Berne Swart',       role: 'RESPONSIBLE_PHARMACIST', pin: '117711', notes: 'B.Pharm NWU Potchefstroom — RP per SMF v4.6' },
  { email: 'ilse@ilcofarming.co.za',     name: 'Ilse Venter',       role: 'TENANT_ADMIN',           pin: '882233', notes: 'CEO & Authorised Representative (AR)' },
  { email: 'coenie@ilcofarming.co.za',   name: 'Coenie Venter',     role: 'TENANT_ADMIN',           pin: '992288', notes: 'CEO & Deputy Authorised Representative (DAR)' },
  { email: 'lourens@ilcofarming.co.za',  name: 'Lourens Eksteen',   role: 'HEAD_OF_CULTIVATION',    pin: '113399', notes: 'B.Agric UFS 2016 — Head of Cultivation' },
  { email: 'renae@ilcofarming.co.za',    name: 'Renae Purdon',      role: 'FACILITY_MANAGER',       pin: '773344', notes: 'Facility Manager (per owner correction 2026-05-03)' },
  { email: 'jeanette@ilcofarming.co.za', name: 'Jeanette Ferreira', role: 'PROCESSING_MANAGER',     pin: '335577', notes: 'HACCP & GMP — Processing Manager + QA Manager scope' },
  { email: 'florisolivier7@gmail.com',   name: 'Flo Olivier',       role: 'SUPER_ADMIN',            pin: '446688', notes: 'Platform Super Admin — behind-the-scenes (not on SMF)' },
  { email: 'devon@applicationautomated.com', name: 'Devon',          role: 'SUPER_ADMIN',            pin: '446688', notes: 'External test Super Admin — UAT support' },
  { email: 'calvin@ilcofarming.co.za',   name: 'Calvin Green',      role: 'IT_MANAGER',             pin: '556677', notes: 'IT Manager — printers/network/computers ONLY. Zero platform admin scope.' },
  { email: 'loraine@ilcofarming.co.za',  name: 'Loraine',           role: 'TENANT_ADMIN',           pin: '228855', notes: 'T&A + HR (3rd-party)' },
];

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'ilco' } });
  if (!tenant) throw new Error('Tenant "ilco" not found — run main seed first.');

  const facility = await prisma.facility.findFirst({ where: { tenantId: tenant.id } });
  if (!facility) throw new Error('No facility for tenant ilco — run main seed first.');

  console.log(`Tenant: ${tenant.name}  ·  Facility: ${facility.name}\n`);

  // 1. Upsert real staff
  for (const s of STAFF) {
    const pinHash = await bcrypt.hash(s.pin, 10);
    const existing = await prisma.user.findUnique({ where: { email: s.email } });
    if (existing) {
      await prisma.user.update({
        where: { email: s.email },
        data: { name: s.name, role: s.role, pinHash, active: true, tenantId: tenant.id, facilityId: facility.id },
      });
      console.log(`UPDATE  ${s.email.padEnd(35)}  ${s.name.padEnd(22)}  ${s.role}`);
    } else {
      await prisma.user.create({
        data: {
          email: s.email,
          name: s.name,
          role: s.role,
          pinHash,
          tenantId: tenant.id,
          facilityId: facility.id,
        },
      });
      console.log(`CREATE  ${s.email.padEnd(35)}  ${s.name.padEnd(22)}  ${s.role}`);
    }
  }

  // 2. Re-role Keke: LAB_TECH → QA_INSPECTOR (compliance/QA scope)
  const keke = await prisma.user.findFirst({ where: { email: 'labilco@cleva-ai.co.za' } });
  if (keke && keke.role !== 'QA_INSPECTOR') {
    await prisma.user.update({
      where: { id: keke.id },
      data: { role: 'QA_INSPECTOR' },
    });
    console.log(`\nRE-ROLE Keke  ·  LAB_TECH → QA_INSPECTOR`);
  } else if (keke) {
    console.log(`\nSKIP    Keke already QA_INSPECTOR`);
  }

  // 3. Final state
  console.log(`\n── Active users in tenant ${tenant.slug} ──`);
  const all = await prisma.user.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { role: 'asc' },
    select: { email: true, name: true, role: true },
  });
  for (const u of all) console.log(`  ${u.role.padEnd(26)}  ${u.name.padEnd(22)}  ${u.email}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
