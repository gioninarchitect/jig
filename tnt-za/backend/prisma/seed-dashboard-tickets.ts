// =====================================================================
// Seed: per-role dashboard build tickets
//
// Pushes 14 dev-build tickets into the live Ticket table — one per role
// that's currently missing a tailored dashboard view. Maps each to:
//   ticketType:    DEV_DASHBOARD
//   category:      DASHBOARD_BUILD
//   workflowStage: where the role primarily operates
//
// Idempotent: uses title-match guard so re-runs don't duplicate.
//
// Run with:
//   cd tnt-za/backend && pnpm tsx prisma/seed-dashboard-tickets.ts
// =====================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardTicketSpec {
  role: string;
  level: number;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  workflowStage: string;
}

const SPECS: DashboardTicketSpec[] = [
  {
    role: 'PROCESSING_MANAGER',
    level: 3,
    title: '[Dashboard] PROCESSING_MANAGER (Jeanette)',
    description:
      'Trim/dry/cure/pack throughput. Stages active, container-by-stage counts, weight reconciliation per stage, COA pipeline status, today\'s processing tickets.',
    priority: 'HIGH',
    workflowStage: 'FACILITY',
  },
  {
    role: 'PROCESSING_SUPERVISOR',
    level: 3,
    title: '[Dashboard] PROCESSING_SUPERVISOR',
    description:
      'Shift-level processing oversight. Shift roster, current trim sessions + weights, container handovers awaiting sign, deviations raised this shift.',
    priority: 'MEDIUM',
    workflowStage: 'FACILITY',
  },
  {
    role: 'FACILITY_SUPERVISOR',
    level: 3,
    title: '[Dashboard] FACILITY_SUPERVISOR',
    description:
      'Shift-level cultivation oversight. Shift roster, daily checks status, IPM observations this shift, env-log compliance, open tickets in cultivation areas.',
    priority: 'MEDIUM',
    workflowStage: 'FACILITY',
  },
  {
    role: 'QA_INSPECTOR',
    level: 3,
    title: '[Dashboard] QA_INSPECTOR',
    description:
      'In-process QC checks, deviations queue, CAPA tracker, recent batch reviews, self-inspection schedule (SOP 7-QMS-027). Feeds SMF C.6 Quality Control.',
    priority: 'HIGH',
    workflowStage: 'STORE_QA',
  },
  {
    role: 'MAINTENANCE_MANAGER',
    level: 3,
    title: '[Dashboard] MAINTENANCE_MANAGER',
    description:
      'Equipment registry, planned preventative maintenance schedule, calibration due-list, contractor SLA tracker (water, RO, AC, fire). Feeds SMF C.3.6 + C.3.9.',
    priority: 'HIGH',
    workflowStage: 'FACILITY',
  },
  {
    role: 'HEAD_OF_CULTIVATION',
    level: 3,
    title: '[Dashboard] HEAD_OF_CULTIVATION (Lourens)',
    description:
      'Strain strategy, harvest planning, yield forecasts vs actuals, mother-room health, full-facility BayGrid roll-up, INCB quota burn rate.',
    priority: 'HIGH',
    workflowStage: 'FLOWERING',
  },
  {
    role: 'NURSERY_MANAGER',
    level: 2,
    title: '[Dashboard] NURSERY_MANAGER',
    description:
      'Mother registry, clone trays + rooting %, propagation calendar, mortality tracking by tray, strain genealogy. Feeds SMF C.5 Production (early stages).',
    priority: 'MEDIUM',
    workflowStage: 'PROPAGATION',
  },
  {
    role: 'IRRIGATION_TECH',
    level: 2,
    title: '[Dashboard] IRRIGATION_TECH',
    description:
      'Feed schedules per bay, EC/pH log, water spec compliance (SANS 241), reservoir levels, tomorrow\'s mix sheet. Feeds SMF C.3.5 Water Systems.',
    priority: 'MEDIUM',
    workflowStage: 'VEGETATIVE',
  },
  {
    role: 'TRIMMER',
    level: 1,
    title: '[Dashboard] TRIMMER (JR Botha)',
    description:
      'My trim queue, container in/out weights, session yield + variance, photo capture for sign-off, today\'s batch assignments. Feeds container event chain.',
    priority: 'MEDIUM',
    workflowStage: 'TRIM',
  },
  {
    role: 'DELIVERY_DRIVER',
    level: 1,
    title: '[Dashboard] DELIVERY_DRIVER',
    description:
      'Today\'s manifest, vehicle pre-dispatch inspection (already-built 7-item checklist), route + GPS, license expiry alert, destination confirmation flow.',
    priority: 'MEDIUM',
    workflowStage: 'DISPATCH',
  },
  {
    role: 'GENERAL_WORKER',
    level: 1,
    title: '[Dashboard] GENERAL_WORKER',
    description:
      'Today\'s task list (assigned tasks only), scan-to-act for QR-coded tasks, simple check-off UI, "report a problem" → ticket.',
    priority: 'LOW',
    workflowStage: 'FACILITY',
  },
  {
    role: 'HOUSEKEEPING',
    level: 1,
    title: '[Dashboard] HOUSEKEEPING',
    description:
      'Cleaning roster (SOP 4-FAC-005), area sign-offs with initials, deep-clean tasks pending, supplies low alert. Feeds SMF C.3.10 Sanitation.',
    priority: 'LOW',
    workflowStage: 'FACILITY',
  },
  {
    role: 'LAUNDRY',
    level: 1,
    title: '[Dashboard] LAUNDRY',
    description:
      'PPE wash log, garment returns by area (Grade A-D), gowning kit availability, replacement requests. Feeds SMF C.2.5 Personnel Hygiene.',
    priority: 'LOW',
    workflowStage: 'FACILITY',
  },
  {
    role: 'CLIENT',
    level: 0,
    title: '[Dashboard] CLIENT',
    description:
      'Wholesale buyer view: order status, COA downloads per batch, batch lineage trace (plant → harvest → trim → cure → pack), invoicing.',
    priority: 'MEDIUM',
    workflowStage: 'SALE',
  },
];

async function main() {
  // 1. Resolve tenant + actor IDs from the seeded environment
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'ilco' } });
  if (!tenant) {
    throw new Error(
      'Tenant "ilco" not found. Run the main seed first: pnpm prisma db seed',
    );
  }

  const reporter = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: 'SUPER_ADMIN' },
  });
  if (!reporter) {
    throw new Error('No SUPER_ADMIN user found in tenant "ilco" to use as reporter.');
  }

  const owner = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: 'TENANT_ADMIN' },
  });
  if (!owner) {
    throw new Error('No TENANT_ADMIN user found to assign tickets to.');
  }

  console.log(`Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`Reporter: ${reporter.email}`);
  console.log(`Assignee: ${owner.email}\n`);

  // 2. Idempotent insert — skip any ticket whose title we've already seeded
  let created = 0;
  let skipped = 0;

  for (const spec of SPECS) {
    const existing = await prisma.ticket.findFirst({
      where: { tenantId: tenant.id, title: spec.title },
    });
    if (existing) {
      console.log(`SKIP  ${spec.title}  (exists: ${existing.id})`);
      skipped++;
      continue;
    }

    const ticket = await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        title: spec.title,
        description: spec.description,
        priority: spec.priority,
        ticketType: 'DEV_DASHBOARD',
        category: 'DASHBOARD_BUILD',
        workflowStage: spec.workflowStage,
        reportedById: reporter.id,
        assignedToId: owner.id,
      },
    });
    console.log(`CREATE ${spec.title}  →  ${ticket.id}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped (already existed): ${skipped}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
