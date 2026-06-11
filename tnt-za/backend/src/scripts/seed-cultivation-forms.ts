/**
 * W8.1 — Seed REAL ILCO cultivation forms as recurring TaskTemplates.
 *
 * Ground truth: tnt-za/docs/cultivation-forms-digitization.md (forms A–S, §5 EU-GMP map).
 * Replaces the abstract governance-sync placeholder templates (title LIKE 'EU GMP %')
 * with the actual paper forms, parameterised by room where the catalogue shows the
 * three mirror families (Mother Bay / Clone Room / Greenhouse).
 *
 * Rules:
 *  - Canonical tenant ONLY (94460d80-7776-4143-b83f-6c9b014ffc3e).
 *  - Idempotent: skip create if a template with the same title already exists for the tenant.
 *  - Append-only ethos: the 'EU GMP %' placeholders are DEACTIVATED (active=false), never deleted.
 *  - sopId left null (cultivation SOPs 3-CUL-x are not in the SOP table); the SOP code +
 *    EU-GMP sourceId are cited in the description instead.
 *  - checklist items are the EXACT columns/fields from the catalogue. No invented fields.
 *
 * Run (live): write inside /var/www/tnt-za/backend so node_modules resolves, set
 * DATABASE_URL from .env, then `npx tsx src/scripts/seed-cultivation-forms.ts`.
 */
import 'dotenv/config';
import { prisma } from '../config/db';

const TENANT_ID = '94460d80-7776-4143-b83f-6c9b014ffc3e';

type Item = { item: string; required: boolean };
type TemplateSpec = {
  title: string;
  description: string;
  roleRequired: string;
  frequency: string; // DAILY | WEEKLY | PER_BATCH | ONE_TIME
  category: string;  // CULTIVATION | CLEANING | QA | PROCESSING | SAHPRA | GENERAL | QUARANTINE
  checklist: Item[];
  autoCreate?: boolean;
  triggerEvent?: string;
};

const req = (item: string): Item => ({ item, required: true });
const opt = (item: string): Item => ({ item, required: false });

// Sign-off block consistent across all forms (§ catalogue): AR/RP/QAM authorisation chain.
const signOff = (chain: string): Item[] => [
  req('Performed by (name + signature)'),
  req(chain),
];

const SPECS: TemplateSpec[] = [
  // ── C / D — Daily Check Sheet (per room, DAILY) — 3-CUL-6 / EU GMP Ch3 ──
  {
    title: 'Daily Check Sheet — Mother Bay',
    description:
      'ILCO form C. SOP 3-CUL-6. EU GMP source EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT. Cultivator daily check of the Mother Bay room.',
    roleRequired: 'CULTIVATOR',
    frequency: 'DAILY',
    category: 'CULTIVATION',
    checklist: [
      req('Lights'),
      req('Extraction / oscillating fans'),
      req('Feed lines'),
      req('Wet wall & filters'),
      req('Heater fan'),
      req('Tears on plastic'),
      req('Plant bins'),
      req('Foot bath'),
      req('PPE station'),
      req('Drippers'),
      req('Plants'),
      req('Plant labels'),
      opt('Notes'),
    ],
  },
  {
    title: 'Daily Check Sheet — Clone Room',
    description:
      'ILCO form C/D (Clone Room variant). SOP 3-CUL-7. EU GMP source EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT. Cultivator daily check of the Clone Room.',
    roleRequired: 'CULTIVATOR',
    frequency: 'DAILY',
    category: 'CULTIVATION',
    checklist: [
      req('Lights'),
      req('Extraction / oscillating fans'),
      req('Feed lines'),
      req('Wet wall & filters'),
      req('Tears on plastic'),
      req('Foot bath'),
      req('PPE station'),
      req('Drippers / trays'),
      req('Clones'),
      req('Tray labels'),
      opt('Notes'),
    ],
  },
  {
    title: 'Daily Check Sheet — Greenhouse',
    description:
      'ILCO form D. EU GMP source EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT. Cultivator daily check of the Greenhouse (as Mother Bay + UV/blackout screens, no heater fan/labels).',
    roleRequired: 'CULTIVATOR',
    frequency: 'DAILY',
    category: 'CULTIVATION',
    checklist: [
      req('Lights'),
      req('Extraction / oscillating fans'),
      req('Feed lines'),
      req('Wet wall & filters'),
      req('UV screens'),
      req('Blackout screen'),
      req('Tears on plastic'),
      req('Plant bins'),
      req('Foot bath'),
      req('PPE station'),
      req('Drippers'),
      req('Plants'),
      opt('Notes'),
    ],
  },

  // ── R / S / S2 — Cleaning Checklist (per room, DAILY) — 8-CLN-7/8/9 / EU GMP Ch3 ──
  {
    title: 'Cleaning Checklist — Mother Bay',
    description:
      'ILCO form R (Yellow). SOP 8-CLN-7. EU GMP source EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT. Assistant Growers — day-grid pre-filled cleaning tasks, initialled.',
    roleRequired: 'GENERAL_WORKER',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: [
      req('Sweep floors'),
      req('Mop floors with approved sanitiser'),
      req('Clean foot bath / replace solution'),
      req('Wipe down surfaces & benches'),
      req('Empty & sanitise plant bins'),
      req('Clean drippers / feed lines'),
      req('Check & restock PPE station'),
      req('Remove plant debris'),
      req('Date'),
      req('Initialled'),
    ],
  },
  {
    title: 'Cleaning Checklist — Clone Room',
    description:
      'ILCO form S (Green). SOP 8-CLN-9. EU GMP source EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT. Facility Cleaners — day-grid pre-filled cleaning tasks, dated + initialled.',
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: [
      req('Sweep floors'),
      req('Mop floors with approved sanitiser'),
      req('Clean foot bath / replace solution'),
      req('Wipe down surfaces & benches'),
      req('Sanitise cloning trays'),
      req('Clean drippers / feed lines'),
      req('Check & restock PPE station'),
      req('Remove plant debris'),
      req('Date'),
      req('Initialled'),
    ],
  },
  {
    title: 'Cleaning Checklist — Greenhouse',
    description:
      'ILCO form S2 (Blue). SOP 8-CLN-8. EU GMP source EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT. Facility Cleaners — day-grid pre-filled cleaning tasks, dated + initialled.',
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: [
      req('Sweep floors'),
      req('Mop floors with approved sanitiser'),
      req('Clean foot bath / replace solution'),
      req('Wipe down surfaces & benches'),
      req('Empty & sanitise plant bins'),
      req('Clean drippers / feed lines'),
      req('Check & restock PPE station'),
      req('Remove plant debris'),
      req('Date'),
      req('Initialled'),
    ],
  },

  // ── N / O — Temp & Humidity Check (per room, DAILY ×3) — 4-FAC-2 / EU GMP Ch3 (+Ch5) ──
  {
    title: 'Temp & Humidity Check — Clone Room',
    description:
      'ILCO form N. SOP 4-FAC-2. EU GMP source EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT (+ EU_GMP_VOL4_CH5_PRODUCTION). Cultivator, captured 3×/day; QAM/RP sign-off.',
    roleRequired: 'CULTIVATOR',
    frequency: 'DAILY',
    category: 'CULTIVATION',
    checklist: [
      req('Desired Temp'),
      req('Desired RH'),
      req('Aircon set point'),
      req('Dehumidifier set point'),
      req('Actual Temp @ 08:00'),
      req('Actual RH @ 08:00'),
      req('Actual Temp @ 11:50'),
      req('Actual RH @ 11:50'),
      req('Actual Temp @ 16:50'),
      req('Actual RH @ 16:50'),
      ...signOff('Checked by (QA Manager / Responsible Pharmacist sign-off)'),
    ],
  },
  {
    title: 'Temp & Humidity Check — Greenhouse',
    description:
      'ILCO form O. SOP 4-FAC-2. EU GMP source EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT (+ EU_GMP_VOL4_CH5_PRODUCTION). Ranges 22–28°C / 45–65% RH (no aircon column). Captured 3×/day; QAM/RP sign-off.',
    roleRequired: 'CULTIVATOR',
    frequency: 'DAILY',
    category: 'CULTIVATION',
    checklist: [
      req('Desired Temp (22–28°C)'),
      req('Desired RH (45–65%)'),
      req('Dehumidifier set point'),
      req('Actual Temp @ 08:00'),
      req('Actual RH @ 08:00'),
      req('Actual Temp @ 11:50'),
      req('Actual RH @ 11:50'),
      req('Actual Temp @ 16:50'),
      req('Actual RH @ 16:50'),
      ...signOff('Checked by (QA Manager / Responsible Pharmacist sign-off)'),
    ],
  },

  // ── M — IPM Scouting Sheet (DAILY) — 3-CUL-2 / EU GMP Ch5 ──
  {
    title: 'IPM Scouting Sheet',
    description:
      'ILCO form M. SOP 3-CUL-2. EU GMP source EU_GMP_VOL4_CH5_PRODUCTION. Cultivator/scout daily IPM scout; Responsible Pharmacist sign-off.',
    roleRequired: 'CULTIVATOR',
    frequency: 'DAILY',
    category: 'CULTIVATION',
    checklist: [
      req('Date'),
      req('Line'),
      req('Insect / Disease'),
      req('Degree (Low / Med / High)'),
      req('Pest type'),
      req('Counts (avg / block)'),
      opt('Notes'),
      ...signOff('Department head / Responsible Pharmacist sign-off'),
    ],
  },

  // ── H / I / J — Mortality Register (per room, event-driven) — 3-CUL-6/7/9-10 / EU GMP Ch5 (+Ch8) ──
  {
    title: 'Mortality Register — Mother Bay',
    description:
      'ILCO form H. SOP 3-CUL-6. EU GMP source EU_GMP_VOL4_CH5_PRODUCTION (+ EU_GMP_VOL4_CH8_COMPLAINTS_RECALL). SAPS 22-series regulatory copy placeholder pending medicines-law sign-off. Cultivator records; Responsible Pharmacist sign-off. Auto-created on plant mortality/destruction.',
    roleRequired: 'CULTIVATOR',
    frequency: 'ONE_TIME',
    category: 'QUARANTINE',
    autoCreate: true,
    triggerEvent: 'PLANT_DESTROYED',
    checklist: [
      req('Date'),
      req('Time'),
      req('Plant Tag ID'),
      req('Batch #'),
      req('Weight'),
      req('Reason'),
      ...signOff('Responsible Pharmacist sign-off'),
    ],
  },
  {
    title: 'Mortality Register — Clone Room',
    description:
      'ILCO form I. SOP 3-CUL-7. EU GMP source EU_GMP_VOL4_CH5_PRODUCTION (+ EU_GMP_VOL4_CH8_COMPLAINTS_RECALL). Clone-room variant (tray / clones-made / deaths). Cultivator records; Responsible Pharmacist sign-off. Auto-created on plant mortality/destruction.',
    roleRequired: 'CULTIVATOR',
    frequency: 'ONE_TIME',
    category: 'QUARANTINE',
    autoCreate: true,
    triggerEvent: 'PLANT_DESTROYED',
    checklist: [
      req('Date'),
      req('Time'),
      req('Strain ID'),
      req('Batch #'),
      req('Tray #'),
      req('# clones made'),
      req('# deaths'),
      req('Reason'),
      ...signOff('Responsible Pharmacist sign-off'),
    ],
  },
  {
    title: 'Mortality Register — Greenhouse',
    description:
      'ILCO form J. SOP 3-CUL-9/10. EU GMP source EU_GMP_VOL4_CH5_PRODUCTION (+ EU_GMP_VOL4_CH8_COMPLAINTS_RECALL). Cultivator records; Responsible Pharmacist sign-off. Auto-created on plant mortality/destruction.',
    roleRequired: 'CULTIVATOR',
    frequency: 'ONE_TIME',
    category: 'QUARANTINE',
    autoCreate: true,
    triggerEvent: 'PLANT_DESTROYED',
    checklist: [
      req('Date'),
      req('Time'),
      req('Plant Tag ID'),
      req('Batch #'),
      req('Weight'),
      req('Reason'),
      ...signOff('Responsible Pharmacist sign-off'),
    ],
  },

  // ── E / F / G — Cultivation Activity Log (per room) — 3-CUL-6 / 3-CUL-9/10 / EU GMP Ch4 ──
  {
    title: 'Cultivation Activity Log — Mother Bay',
    description:
      'ILCO form E. SOP 3-CUL-6. EU GMP source EU_GMP_VOL4_CH4_DOCUMENTATION. Per-event cultivation activity log for the Mother Bay.',
    roleRequired: 'CULTIVATOR',
    frequency: 'ONE_TIME',
    category: 'CULTIVATION',
    checklist: [
      req('Date'),
      req('Time'),
      req('Activity'),
      req('Reason'),
      ...signOff('Signed'),
    ],
  },
  {
    title: 'Cultivation Activity Log — Clone Room',
    description:
      'ILCO form F. EU GMP source EU_GMP_VOL4_CH4_DOCUMENTATION. Per-event cultivation activity log for the Clone Room.',
    roleRequired: 'CULTIVATOR',
    frequency: 'ONE_TIME',
    category: 'CULTIVATION',
    checklist: [
      req('Date'),
      req('Time'),
      req('Activity'),
      req('Reason'),
      req('Performed by'),
    ],
  },
  {
    title: 'Cultivation Activity Log — Greenhouse',
    description:
      'ILCO form G. SOP 3-CUL-9/10. EU GMP source EU_GMP_VOL4_CH4_DOCUMENTATION. Per-event cultivation activity log for the Greenhouse.',
    roleRequired: 'CULTIVATOR',
    frequency: 'ONE_TIME',
    category: 'CULTIVATION',
    checklist: [
      req('Date'),
      req('Time'),
      req('Activity'),
      req('Reason'),
      ...signOff('Signed'),
    ],
  },

  // ── K / L — Cloning & Transplanting Schedule (PER_BATCH) — 3-CUL-7 / EU GMP Ch5 (BCR) ──
  {
    title: 'Cloning Schedule (Client / Dispatch)',
    description:
      'ILCO form K. SOP 3-CUL-7. EU GMP source EU_GMP_VOL4_CH5_PRODUCTION (Batch Cultivation Record). Grower records; QA review. Per batch.',
    roleRequired: 'HEAD_OF_CULTIVATION',
    frequency: 'PER_BATCH',
    category: 'CULTIVATION',
    checklist: [
      req('Clone date'),
      req('Strain'),
      req('Batch #'),
      req('Tray #'),
      req('# clones'),
      req('Date of dispatch'),
      req('Grower'),
      opt('Comments'),
      req('QA review'),
    ],
  },
  {
    title: 'Cloning & Transplanting Schedule',
    description:
      'ILCO form L. SOP 3-CUL-7. EU GMP source EU_GMP_VOL4_CH5_PRODUCTION (Batch Cultivation Record). Grower records; QA review. Per batch, mortality tracked across W1–W3.',
    roleRequired: 'HEAD_OF_CULTIVATION',
    frequency: 'PER_BATCH',
    category: 'CULTIVATION',
    checklist: [
      req('Clone date'),
      req('Mother #'),
      req('Tray #'),
      req('# clones'),
      req('Mortality W1'),
      req('Mortality W2'),
      req('Mortality W3'),
      req('# transplanted'),
      req('Date of transplant'),
      req('Grower'),
      opt('Comments'),
      req('QA review'),
    ],
  },

  // ── P / Q — Harvest Request + Check Sheet (PER_BATCH) — 3-CUL-012 / EU GMP Ch5 ──
  {
    title: 'Harvest Request Form',
    description:
      'ILCO form P. SOP 3-CUL-012. EU GMP source EU_GMP_VOL4_CH5_PRODUCTION. Head of Cultivation requests; QA Manager approves. Per batch.',
    roleRequired: 'HEAD_OF_CULTIVATION',
    frequency: 'PER_BATCH',
    category: 'CULTIVATION',
    checklist: [
      req('Batch #'),
      req('Strain ID'),
      req('Flowering start'),
      req('Batch size'),
      req('Greenhouse'),
      req('Bay'),
      req('Reason'),
      req('Requested by'),
      req('Requested date'),
      req('QA Manager approval'),
    ],
  },
  {
    title: 'Harvest Request Check Sheet',
    description:
      'ILCO form Q. SOP 3-CUL-012. EU GMP source EU_GMP_VOL4_CH5_PRODUCTION. HoC / QA complete the 9-point readiness check; QA Manager approves. Per batch.',
    roleRequired: 'HEAD_OF_CULTIVATION',
    frequency: 'PER_BATCH',
    category: 'CULTIVATION',
    checklist: [
      req('Readiness check 1 (Y/N)'),
      req('Readiness check 2 (Y/N)'),
      req('Readiness check 3 (Y/N)'),
      req('Readiness check 4 (Y/N)'),
      req('Readiness check 5 (Y/N)'),
      req('Readiness check 6 (Y/N)'),
      req('Readiness check 7 (Y/N)'),
      req('Readiness check 8 (Y/N)'),
      req('Readiness check 9 (Y/N)'),
      req('Drying room allocated'),
      opt('Comments'),
      req('QA Manager approval'),
    ],
  },
];

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) throw new Error(`Canonical tenant ${TENANT_ID} not found — aborting (wrong DB?).`);

  const created: string[] = [];
  const skipped: string[] = [];

  for (const spec of SPECS) {
    const existing = await prisma.taskTemplate.findFirst({
      where: { tenantId: TENANT_ID, title: spec.title },
    });
    if (existing) {
      skipped.push(spec.title);
      continue;
    }
    await prisma.taskTemplate.create({
      data: {
        title: spec.title,
        description: spec.description,
        sopId: null,
        roleRequired: spec.roleRequired,
        frequency: spec.frequency,
        category: spec.category,
        checklist: spec.checklist as any,
        autoCreate: spec.autoCreate ?? false,
        triggerEvent: spec.triggerEvent ?? null,
        active: true,
        tenantId: TENANT_ID,
      },
    });
    created.push(spec.title);
  }

  // Deactivate the abstract governance-sync placeholders (append-only: never delete).
  const deact = await prisma.taskTemplate.updateMany({
    where: { tenantId: TENANT_ID, title: { startsWith: 'EU GMP ' }, active: true },
    data: { active: false },
  });

  console.log(
    JSON.stringify(
      {
        tenant: tenant.name,
        tenantId: TENANT_ID,
        realFormsCreated: created.length,
        created,
        realFormsSkippedExisting: skipped.length,
        skipped,
        placeholdersDeactivated: deact.count,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
