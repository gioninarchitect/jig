/**
 * Seed REAL ILCO PROCESSING forms as recurring TaskTemplates.
 *
 * Ground truth: Jeanette Ferreira's actual processing paper forms (22 docs),
 * extracted verbatim to tnt-za/docs/jeanette-processing-source/. Mirrors the
 * cultivation seed (seed-cultivation-forms.ts) exactly.
 *
 * Rules (identical to cultivation seed):
 *  - Canonical tenant ONLY (94460d80-7776-4143-b83f-6c9b014ffc3e).
 *  - Idempotent: skip create if a template with the same title already exists.
 *  - checklist items are the EXACT fields/columns from each form. No invented fields.
 *  - sopId left null; the real SOP code (5-PDT-xxx) + EU-GMP source are cited in
 *    the description instead.
 *  - Operational forms route to the role that performs them (PROCESSING_MANAGER =
 *    Jeanette, TRIMMER = trim operator). Cleaning schedules route to HOUSEKEEPING —
 *    which has no commissioned user yet, so the commissioning gate keeps them dark
 *    until a real cleaner is added. That is intentional (no phantom tasks).
 *
 * Run (live): inside /var/www/tnt-za/backend, with DATABASE_URL from .env:
 *   npx tsx src/scripts/seed-processing-forms.ts
 */
import 'dotenv/config';
import { prisma } from '../config/db';

const TENANT_ID = '94460d80-7776-4143-b83f-6c9b014ffc3e';

type Item = { item: string; required: boolean };
type TemplateSpec = {
  title: string;
  description: string;
  roleRequired: string;
  frequency: string; // DAILY | PER_BATCH | ONE_TIME
  category: string;  // PROCESSING | QA | CLEANING
  checklist: Item[];
};

const req = (item: string): Item => ({ item, required: true });
const opt = (item: string): Item => ({ item, required: false });
// fields verbatim → required checklist items (Comments/Remarks are optional)
const fields = (...items: string[]): Item[] =>
  items.map((i) => (/comment|remark/i.test(i) ? opt(i) : req(i)));

const CH3 = 'EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT';
const CH4 = 'EU_GMP_VOL4_CH4_DOCUMENTATION';
const CH5 = 'EU_GMP_VOL4_CH5_PRODUCTION';

const SPECS: TemplateSpec[] = [
  // ── QA / quality checks ──────────────────────────────────────────────────
  {
    title: 'Batch Quality Check Register',
    description: `ILCO processing form. SOP 5-PDT-007. EU GMP source ${CH5}. Processing Manager records per batch; QC sign-off.`,
    roleRequired: 'PROCESSING_MANAGER',
    frequency: 'PER_BATCH',
    category: 'QA',
    checklist: fields('DATE ISSUED', 'BATCH NO', 'STRAIN', 'DATE', 'TIME', 'FREE FROM SEED: (YES/NO)', 'FREE FROM BUDROT: (YES/NO)', 'NO LONG STICKS OR LEAVES: (YES/NO)', 'APPROVED YES/NO', 'SIGNED BY QC', 'COMMENTS/ REMARKS'),
  },
  {
    title: 'Wet Cannabis Flower Inspection Checklist',
    description: `ILCO processing form. SOP 5-PDT-6. EU GMP source ${CH5}. Operator prepares at wet-flower intake; Processing Manager reviews; QA Manager approves.`,
    roleRequired: 'PROCESSING_MANAGER',
    frequency: 'PER_BATCH',
    category: 'QA',
    checklist: fields('Batch Number', 'Strain/Variety', 'Harvest Date', 'Inspection Date', 'Inspector Name', 'General Appearance', 'Flower Integrity', 'Color', 'Wilting', 'Visible Mold', 'Mildew', 'Foreign Matter', 'Insects/Pests', 'Webbing/Eggs', 'Seed', 'Characteristic Aroma', 'Musty Odor', 'Sour/Fermented Odor', 'Chemical Odor', 'Time to Processing', 'Handling', 'Transport Conditions', 'Measured Temperature (°C)', 'Within Spec? YES / NO', 'PREPARED BY', 'REVIEWED BY (PROCESSING MANAGER)', 'APPROVED BY (QUALITY ASSURANCE MANAGER)', 'Comments'),
  },
  {
    title: 'Sample Moisture Readings',
    description: `ILCO processing form. SOP 5-PDT-003. EU GMP source ${CH5}. Moisture test per batch in the sampling room; signed.`,
    roleRequired: 'PROCESSING_MANAGER',
    frequency: 'PER_BATCH',
    category: 'QA',
    checklist: fields('LOCATION: SAMPLING ROOM', 'AREA: STORAGE/ PROCESSING', 'DATE ISSUED', 'DATE', 'STRAIN', 'BATCH NUMBER', 'WEIGHT g/kg', 'MOISTURE READING %', 'TEST CONDUCTED BY', 'SIGNED', 'COMMENTS/ REMARKS'),
  },
  {
    title: 'Sampling Room Register',
    description: `ILCO processing form. SOP 5-PDT-003. EU GMP source ${CH5}. Sampling-room packing per batch; QA sign-off.`,
    roleRequired: 'PROCESSING_MANAGER',
    frequency: 'PER_BATCH',
    category: 'QA',
    checklist: fields('DATE ISSUED', 'LOCATION: SAMPLING ROOM', 'AREA: STORAGE/ PROCESSING', 'DATE', 'STRAIN', 'BATCH NUMBER', 'WEIGHT g/kg', 'SAMPLE FOR', 'PACKED BY', 'SIGNED', 'SIGNED QA', 'COMMENTS/ REMARKS'),
  },
  {
    title: 'Temperature & Humidity Check Sheet — Processing',
    description: `ILCO processing form. EU GMP source ${CH3} (+ ${CH5}). Captured 3×/day in the processing area; QC/QA checked.`,
    roleRequired: 'PROCESSING_MANAGER',
    frequency: 'DAILY',
    category: 'QA',
    checklist: fields('DATE', 'DESIRED TEMP (°C)', 'AIRCON SET AT (°C)', 'DESIRED RH (%)', 'DEHUMIDIFIER SET AT (%)', 'ACTUAL TEMP (°C) 8AM', 'ACTUAL RH % 8 AM', 'ACTUAL TEMP (°C) 11:50AM', 'ACTUAL RH % 11:50 AM', 'ACTUAL TEMP (°C) 16:50PM', 'ACTUAL RH % 16:50PM', 'QC/QA CHECKED'),
  },

  // ── PROCESSING — trim / cure / batch control ─────────────────────────────
  {
    title: 'Trimming Dried Flower Batch Control',
    description: `ILCO processing form. EU GMP source ${CH5}. Trim operator records per batch (issued vs finished weight, waste, trimmings); QC/QA sign-off.`,
    roleRequired: 'TRIMMER',
    frequency: 'PER_BATCH',
    category: 'PROCESSING',
    checklist: fields('DATE', 'TIME', 'STRAIN ID', 'BATCH No', 'ISSUED WEIGHT (g/kg)', 'CONTAINER No', 'TIME START', 'TIME FINISHED', 'FINISHED WEIGHT (g/kg)', 'PLANT WASTE MATERIAL (g/kg)', 'WEIGHT TRIMMINGS (kg/g)', 'SIGNED BY: (QC/QA)', 'COMMENTS / REMARKS'),
  },
  {
    title: 'Curing Record',
    description: `ILCO processing form. EU GMP source ${CH5}. Curing burp/shake log per container; QA signed.`,
    roleRequired: 'PROCESSING_MANAGER',
    frequency: 'PER_BATCH',
    category: 'PROCESSING',
    checklist: fields('DATE', 'TIME', 'CONTAINER No', 'INTERNAL RH%', 'SHAKE LIGHTLY (Y/N)', 'BURP 20-30 MIN (Y/N)', 'SIGNED QA', 'COMMENT'),
  },

  // ── INVENTORY / RECEIVING — event-driven registers ───────────────────────
  {
    title: 'Bulk Storage Inventory',
    description: `ILCO processing form. EU GMP source ${CH4} (+ ${CH5}). Stock-in/out movements in bulk storage; QC checked, QAM signed. Per movement.`,
    roleRequired: 'PROCESSING_MANAGER',
    frequency: 'ONE_TIME',
    category: 'PROCESSING',
    checklist: fields('DATE', 'TIME', 'STRAIN ID', 'BATCH No', 'CONTAINER N', 'STOCK IN (kg/g)', 'STOCK OUT (g/kg)', 'AREA', 'CHECKED BY: (QC)', 'SIGNED BY: (QAM)', 'COMMENTS / REMARKS'),
  },
  {
    title: 'Receiving Register',
    description: `ILCO processing form. SOP 5-PDT-4. EU GMP source ${CH4}. Goods receiving check vs invoice; approve/reject; received + signed. Per receipt.`,
    roleRequired: 'PROCESSING_MANAGER',
    frequency: 'ONE_TIME',
    category: 'PROCESSING',
    checklist: fields('DATE ISSUED', 'LOCATION: RECEIVING', 'AREA: STORAGE', 'DATE', 'SUPPLIER NAME', 'TYPE OF STOCK', 'CORRESPONDS WITH INVOICE?', 'APPROVED', 'REJECTED', 'RECEIVED BY', 'SIGNED', 'COMMENTS/ REMARKS'),
  },
  {
    title: 'Rejected Goods Inventory Register',
    description: `ILCO processing form. SOP 5-PDT-13. EU GMP source ${CH4}. Rejected stock log with reason + weight; QA signed. Per event.`,
    roleRequired: 'PROCESSING_MANAGER',
    frequency: 'ONE_TIME',
    category: 'PROCESSING',
    checklist: fields('DATE ISSUED', 'LOCATION: REJECTED GOODS', 'AREA: STORAGE/ PROCESSING', 'DATE', 'TIME', 'STRAIN ID', 'BATCH NUMBER', 'REASON FOR REJECTION', 'QTY. OF UNITS', 'AREA REJECTED FROM', 'TOTAL WEIGHT OF PRODUCT (g/kg)', 'SIGN QA', 'COMMENTS/ REMARKS'),
  },
  {
    title: 'Return To Supplier Register',
    description: `ILCO processing form. SOP 5-PDT-015. EU GMP source ${CH4}. Returns to supplier with reason; returned + signed. Per event.`,
    roleRequired: 'PROCESSING_MANAGER',
    frequency: 'ONE_TIME',
    category: 'PROCESSING',
    checklist: fields('EFFECTIVE DATE', 'DATE ISSUED', 'LOCATION: RECEIVING/DISPATCH', 'AREA: STORAGE', 'DATE', 'SUPPLIER', 'ITEM/S', 'QTY OF UNITS', 'REASON', 'RETURNED BY', 'SIGN', 'COMMENTS/ REMARKS'),
  },

  // ── CLEANING — day-grid schedules (route to HOUSEKEEPING; dark until staffed)
  {
    title: 'Cleaning Schedule — Bathroom',
    description: `ILCO processing cleaning schedule. EU GMP source ${CH3}. Day-grid cleaning tasks; QC/QA checked.`,
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: fields('DAY', 'DATE', 'CLEAN TOILETS', 'CLEAN BASIN & TAPS', 'DUST SURFACES', 'FILL & CLEAN DISPENSERS', 'CLEAN DOOR & HANDLES', 'EMPTY DUSTBINS', 'CLEAN DUSTBINS', 'CLEAN WALLS', 'SWEEP FLOORS', 'MOP FLOORS', 'QC/QA CHECKED'),
  },
  {
    title: 'Cleaning Schedule — Bulk Storage',
    description: `ILCO processing cleaning schedule. EU GMP source ${CH3}. Day-grid cleaning tasks; QC/QA checked.`,
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: fields('DATE', 'CLEAN WALLS', 'CLEAN STORAGE DRUM', 'CLEAN LIGHTS', 'CLEAN CEILING', 'DOOR & HANDLES', 'CLEAN TOTES', 'WIPE FLAT SURFACES', 'SWEEP FLOORS', 'SCRUB FLOORS', 'CHECK & CLEAN DISPENSERS', 'QC/QA CHECKED'),
  },
  {
    title: 'Cleaning Schedule — Canteen / Lockers',
    description: `ILCO processing cleaning schedule. EU GMP source ${CH3}. Day-grid cleaning tasks; QC/QA checked.`,
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: fields('DAY', 'DATE', 'COLLECT LAUNDRY', 'WASH DRINKING GLASSES', 'DUST SURFACES', 'FILL & CLEAN DISPENSERS', 'CLEAN BASINS & TAPS', 'CLEAN BENCHES', 'CLEAN DOOR HANDLES', 'EMPTY DUSTBINS', 'CLEAN DUSTBINS', 'CLEAN TOILETS', 'SWEEP FLOORS', 'MOP FLOORS', 'CLEAN LIGHTS', 'CLEAN MIRRORS', 'CLEAN DOORS', 'CLEAN LOCKERS', 'CLEAN WALLS', 'CLEAN SHOES', 'CLEAN EXTRACTOR FANS', 'SCRUB FLOORS', 'QC/QA CHECKED'),
  },
  {
    title: 'Cleaning Record — Chemical Storage',
    description: `ILCO processing cleaning record. EU GMP source ${CH3}. Day-grid cleaning tasks; QC/QA checked.`,
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: fields('DAY', 'DATE', 'TAKE MOPS & CLOTHS TO LAUNDRY', 'CLEAN BROOMS', 'CLEAN DUST-PANS', 'CLEAN MOP CLIPS, HANDLES & BUCKETS', 'WIPE DOOR HANDLES', 'CLEAN LIGHT SWITCH', 'WIPE FLAT SURFACES', 'SWEEP FLOORS', 'MOP FLOORS', 'CHECK & CLEAN DISPENSERS', 'EMPTY DUST-BINS', 'CLEAN LIGHT', 'CLEAN CEILING', 'CLEAN WALLS', 'CLEAN SHELVES', 'CLEAN DUSTBIN', 'CLEAN DOORS & TOP OF DOORS', 'CLEAN CONTAINERS', 'DEEP-CLEAN BROOMS & BRUSHES', 'QC/QA CHECKED'),
  },
  {
    title: 'Cleaning Schedule — Dispatch',
    description: `ILCO processing cleaning schedule. EU GMP source ${CH3}. Day-grid cleaning tasks; QC/QA checked.`,
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: fields('DATE', 'CLEAN WALLS', 'CLEAN INSECT CATCHER', 'CLEAN LIGHTS', 'CLEAN CEILING', 'DOOR & HANDLES', 'CLEAN PALLETS', 'WIPE FLAT SURFACES', 'SWEEP FLOORS', 'SCRUB FLOORS', 'CHECK & CLEAN DISPENSERS', 'CLEAN CONTAINERS', 'QC/QA CHECKED'),
  },
  {
    title: 'Cleaning Schedule — Outside Receiving',
    description: `ILCO processing cleaning schedule. EU GMP source ${CH3}. Day-grid cleaning tasks; QC/QA checked.`,
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: fields('DATE', 'CLEAN WALLS', 'CLEAN INSECT CATCHER', 'CLEAN LIGHTS', 'CLEAN CEILING', 'DOOR & HANDLES', 'CLEAN PALLETS', 'WIPE FLAT SURFACES', 'SWEEP FLOORS', 'SCRUB FLOORS', 'CLEAN PASS THROUGH BOX', 'CLEAN CONTAINERS', 'QC/QA CHECKED'),
  },
  {
    title: 'Cleaning Schedule — Receiving (Daily)',
    description: `ILCO processing cleaning schedule. EU GMP source ${CH3}. Day-grid cleaning tasks; QC/QA checked.`,
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: fields('DATE', 'CLEAN PASS THROUGH', 'CLEAN CONTAINERS', 'CLEAN SHELVES', 'CLEAN WALLS', 'CLEAN DOOR & HANDLES', 'CLEAN CEILING & LIGHT', 'WIPE FLAT SURFACES', 'SWEEP FLOORS', 'SCRUB FLOORS', 'CHECK & CLEAN DUSTBIN', 'QC/QA CHECKED'),
  },
  {
    title: 'Cleaning Schedule — Rejected Goods',
    description: `ILCO processing cleaning schedule. EU GMP source ${CH3}. Day-grid cleaning tasks; QC/QA checked.`,
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: fields('DATE', 'CLEAN WALLS', 'CLEAN STORAGE DRUM', 'CLEAN LIGHTS', 'CLEAN CEILING', 'DOOR & HANDLES', 'CLEAN PALLETS', 'WIPE FLAT SURFACES', 'SWEEP FLOORS', 'SCRUB FLOORS', 'CHECK & CLEAN DISPENSERS', 'QC/QA CHECKED'),
  },
  {
    title: 'Cleaning Checklist — Sample Room',
    description: `ILCO processing cleaning checklist. EU GMP source ${CH3}. Day-grid cleaning tasks; QC/QA checked.`,
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: fields('DATE', 'CLEAN WALLS', 'CLEAN TABLE', 'CLEAN LIGHTS', 'CLEAN MOISTURE TESTER & SCALE', 'DOOR & HANDLES', 'CLEAN CEILING', 'WIPE FLAT SURFACES', 'SWEEP FLOORS', 'SCRUB FLOORS', 'CHECK & CLEAN DISPENSERS', 'QC/QA CHECKED'),
  },
  {
    title: 'Cleaning Schedule — Storage Hallway',
    description: `ILCO processing cleaning schedule. EU GMP source ${CH3}. Day-grid cleaning tasks; QC/QA checked.`,
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: fields('DATE', 'CLEAN WALLS', 'CLEAN ACCESS CONTROL', 'CLEAN LIGHTS', 'DOOR & HANDLES', 'CLEAN CEILING', 'WIPE FLAT SURFACES', 'SWEEP FLOORS', 'SCRUB FLOORS', 'CHECK & CLEAN DISPENSERS', 'QC/QA CHECKED'),
  },
  {
    title: 'Cleaning Schedule — Trimming Room (Daily)',
    description: `ILCO processing cleaning schedule. EU GMP source ${CH3}. Day-grid cleaning tasks; QA/QC checked.`,
    roleRequired: 'HOUSEKEEPING',
    frequency: 'DAILY',
    category: 'CLEANING',
    checklist: fields('DAY', 'CLEAN TRAYS', 'CLEAN CONTAINERS', 'CLEAN TABLE TOPS', 'SPOT-CLEAN WALLS', 'WIPE DOOR HANDLES', 'CLEAN SCISSORS', 'WIPE FLAT SURFACES', 'SWEEP FLOORS', 'MOP FLOORS', 'CHECK & CLEAN DISPENSERS', 'WASH SHOES', 'CLEAN EMPTY TOTE BINS', 'EMPTY DUSTBIN', 'CLEAN SCISSOR SCRUBBERS', 'QA/QC CHECKED'),
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
        autoCreate: false,
        triggerEvent: null,
        active: true,
        tenantId: TENANT_ID,
      },
    });
    created.push(spec.title);
  }

  console.log(
    JSON.stringify(
      {
        tenant: tenant.name,
        tenantId: TENANT_ID,
        totalSpecs: SPECS.length,
        processingFormsCreated: created.length,
        created,
        skippedExisting: skipped.length,
        skipped,
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
