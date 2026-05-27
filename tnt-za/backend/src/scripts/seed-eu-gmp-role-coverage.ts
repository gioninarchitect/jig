import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/db';
import { ensureEuGmpRegistry } from '../services/eu-gmp-source.service';
import { syncSopGovernance } from '../services/sop-governance.service';

const PIN = '446688';

const MISSING_ROLE_USERS: Array<{ email: string; name: string; role: UserRole }> = [
  { email: 'calvin@ilcofarms.co.za', name: 'Calvin Green', role: UserRole.IT_MANAGER },
  { email: 'processing.supervisor@ilcofarms.co.za', name: 'Processing Supervisor', role: UserRole.PROCESSING_SUPERVISOR },
  { email: 'gmp.partner@ilcofarms.co.za', name: 'GMP Partner', role: UserRole.GMP_PARTNER },
];

const SOP_BASELINE: Array<{
  title: string;
  category: string;
  rolesRequired: UserRole[];
  content: string;
}> = [
  {
    title: 'EU GMP Label Lifecycle and Reconciliation',
    category: 'SAHPRA',
    rolesRequired: [
      UserRole.FACILITY_MANAGER,
      UserRole.QA_INSPECTOR,
      UserRole.RESPONSIBLE_PHARMACIST,
      UserRole.SECURITY_OFFICER,
      UserRole.HEAD_OF_CULTIVATION,
      UserRole.PROCESSING_MANAGER,
      UserRole.GMP_PARTNER,
    ],
    content: [
      'Grounding: EU GMP Volume 4 Chapter 1, Chapter 4, Chapter 5, Annex 11, and ICH Q9.',
      'All QR labels must be issued, applied, voided, destroyed, reprinted, missing, or reconciled with authenticated user accountability.',
      'Missing or mismatched labels require a QMS ticket, reason code, digital signature, and QA/RP review before affected BCR sign-off.',
      'Asset labels must display the asset name and asset ID on the QR label.',
    ].join('\n\n'),
  },
  {
    title: 'EU GMP Batch Cultivation Record Control',
    category: 'CULTIVATION',
    rolesRequired: [UserRole.HEAD_OF_CULTIVATION, UserRole.NURSERY_MANAGER, UserRole.CULTIVATOR, UserRole.IRRIGATION_TECH, UserRole.FACILITY_MANAGER],
    content: [
      'Grounding: EU GMP Volume 4 Chapter 4, Chapter 5, Annex 15, and ICH Q9.',
      'Creating a batch number creates the Batch Cultivation Record and links clones, mothers, daily checks, environmental records, feeding, mortality, labels, deviations, and approvals.',
      'Daily cultivation checks must be contemporaneous, attributable, legible, complete, and linked to the relevant batch or zone.',
    ].join('\n\n'),
  },
  {
    title: 'EU GMP Processing, Containers, and Weight Reconciliation',
    category: 'PROCESSING',
    rolesRequired: [UserRole.PROCESSING_MANAGER, UserRole.PROCESSING_SUPERVISOR, UserRole.TRIMMER],
    content: [
      'Grounding: EU GMP Volume 4 Chapter 4, Chapter 5, Annex 11, Annex 15, and ICH Q9.',
      'Container movements must be QR-scanned, weight-recorded, and linked to batch state transitions.',
      'Weight variance, missing scan evidence, or unaccounted material must raise a deviation or ticket before release progression.',
    ].join('\n\n'),
  },
  {
    title: 'EU GMP QA Deviation CAPA and Release Readiness',
    category: 'QA',
    rolesRequired: [UserRole.QA_INSPECTOR, UserRole.RESPONSIBLE_PHARMACIST, UserRole.LAB_TECH, UserRole.GMP_PARTNER],
    content: [
      'Grounding: EU GMP Volume 4 Chapter 1, Chapter 4, Chapter 6, Chapter 8, Chapter 9, Annex 11, and ICH Q9.',
      'Deviations must include impact assessment, root cause, CAPA, owner, due date, approval evidence, and closure rationale.',
      'Lab results, retests, and COA evidence must be linked to batch release readiness and QMS review.',
    ].join('\n\n'),
  },
  {
    title: 'EU GMP Quarantine and Destruction Control',
    category: 'QUARANTINE',
    rolesRequired: [UserRole.FACILITY_MANAGER, UserRole.QA_INSPECTOR, UserRole.RESPONSIBLE_PHARMACIST, UserRole.HEAD_OF_CULTIVATION, UserRole.PROCESSING_MANAGER],
    content: [
      'Grounding: EU GMP Volume 4 Chapter 1, Chapter 4, Chapter 5, Annex 11, and ICH Q9.',
      'Quarantined material must be physically controlled, system-status controlled, label-controlled, and blocked from release or processing until disposition is approved.',
      'Destruction must have authorization, witness evidence, weight reconciliation, and final QMS closure.',
    ].join('\n\n'),
  },
  {
    title: 'EU GMP Cleaning and Hygiene Record Control',
    category: 'CLEANING',
    rolesRequired: [UserRole.HOUSEKEEPING, UserRole.LAUNDRY, UserRole.FACILITY_SUPERVISOR],
    content: [
      'Grounding: EU GMP Volume 4 Chapter 2, Chapter 3, Chapter 4, Chapter 5, and Annex 15.',
      'Cleaning, laundry, and hygiene tasks must be scheduled, initialled, evidenced, reviewed, and escalated when missed or out of specification.',
      'Records must identify zone, task, person, date/time, materials used where applicable, and supervisor review.',
    ].join('\n\n'),
  },
  {
    title: 'EU GMP Maintenance Calibration and Asset Readiness',
    category: 'MAINTENANCE',
    rolesRequired: [UserRole.MAINTENANCE_MANAGER, UserRole.IT_MANAGER, UserRole.FACILITY_MANAGER],
    content: [
      'Grounding: EU GMP Volume 4 Chapter 3, Chapter 4, Annex 11, Annex 15, and ICH Q9.',
      'Equipment, instruments, scanners, printers, and computerized-system components must be maintained, calibrated or verified, and blocked when out of specification.',
      'Overdue calibration or failed equipment checks must raise a QMS ticket or deviation where product quality or data integrity may be affected.',
    ].join('\n\n'),
  },
  {
    title: 'EU GMP Personnel Training and Medical Readiness',
    category: 'GENERAL',
    rolesRequired: [
      UserRole.FACILITY_MANAGER,
      UserRole.FACILITY_SUPERVISOR,
      UserRole.SECURITY_OFFICER,
      UserRole.GENERAL_WORKER,
      UserRole.IT_MANAGER,
      UserRole.TENANT_ADMIN,
    ],
    content: [
      'Grounding: EU GMP Volume 4 Chapter 2, Chapter 4, Annex 11, and ICH Q9.',
      'Training must be role-based and include induction, SOP training, on-the-job training, and classroom or written training where required by the SOP.',
      'Annual medical readiness must be tracked through QMS with expiry alerts and role impact.',
    ].join('\n\n'),
  },
];

async function main() {
  await ensureEuGmpRegistry();

  const tenant = await prisma.tenant.findFirst({ where: { slug: 'ilco' } }) || await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');

  const facility = await prisma.facility.findFirst({ where: { tenantId: tenant.id } });
  if (!facility) throw new Error(`No facility found for tenant ${tenant.name}`);

  const superAdmin =
    await prisma.user.findFirst({ where: { tenantId: tenant.id, email: 'florisolivier7@gmail.com' } }) ||
    await prisma.user.findFirst({ where: { tenantId: tenant.id, role: UserRole.SUPER_ADMIN } });
  if (!superAdmin) throw new Error('No Super Admin user found to own governance sync');

  let usersCreated = 0;
  for (const userSpec of MISSING_ROLE_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: userSpec.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: userSpec.name,
          role: userSpec.role,
          active: true,
          tenantId: tenant.id,
          facilityId: facility.id,
        },
      });
      continue;
    }

    await prisma.user.create({
      data: {
        email: userSpec.email,
        name: userSpec.name,
        role: userSpec.role,
        pinHash: await bcrypt.hash(PIN, 10),
        tenantId: tenant.id,
        facilityId: facility.id,
      },
    });
    usersCreated++;
  }

  const synced = [];
  for (const spec of SOP_BASELINE) {
    const existing = await prisma.sOP.findFirst({
      where: { tenantId: tenant.id, title: spec.title },
    });

    const sop = existing
      ? await prisma.sOP.update({
          where: { id: existing.id },
          data: {
            category: spec.category,
            content: spec.content,
            rolesRequired: spec.rolesRequired,
            active: true,
          },
        })
      : await prisma.sOP.create({
          data: {
            title: spec.title,
            version: 1,
            content: spec.content,
            category: spec.category,
            rolesRequired: spec.rolesRequired,
            tenantId: tenant.id,
            facilityId: facility.id,
            approvedById: superAdmin.id,
          },
        });

    synced.push(await syncSopGovernance(sop.id, tenant.id, superAdmin.id));
  }

  console.log(JSON.stringify({
    tenant: tenant.name,
    usersCreated,
    sopsSynced: synced.length,
    trainingCreated: synced.reduce((sum, item) => sum + item.trainingCreated, 0),
    templatesCreated: synced.reduce((sum, item) => sum + item.templatesCreated, 0),
    ticketsCreated: synced.filter(item => item.ticketCreated).length,
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
