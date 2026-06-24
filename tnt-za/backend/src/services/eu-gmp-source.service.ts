import { prisma } from '../config/db';
import { eventBus } from './eventBus';

const OFFICIAL_URL = 'https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en';

const DEFAULT_SOURCES = [
  {
    sourceId: 'EU_GMP_VOL4_CH1_PQS',
    title: 'Part I, Chapter 1 - Pharmaceutical Quality System',
    part: 'Part I',
    chapter: 'Chapter 1',
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for PQS, QMS governance, deviation/CAPA, and quality risk management expectations.',
  },
  {
    sourceId: 'EU_GMP_VOL4_CH2_PERSONNEL',
    title: 'Part I, Chapter 2 - Personnel',
    part: 'Part I',
    chapter: 'Chapter 2',
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for responsibilities, training, hygiene, and medical fitness requirements.',
  },
  {
    sourceId: 'EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT',
    title: 'Part I, Chapter 3 - Premises and Equipment',
    part: 'Part I',
    chapter: 'Chapter 3',
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for facility, equipment, asset, and calibration controls.',
  },
  {
    sourceId: 'EU_GMP_VOL4_CH4_DOCUMENTATION',
    title: 'Part I, Chapter 4 - Documentation',
    part: 'Part I',
    chapter: 'Chapter 4',
    version: 'January 2011',
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for controlled records, batch records, label records, and documentation integrity.',
  },
  {
    sourceId: 'EU_GMP_VOL4_CH5_PRODUCTION',
    title: 'Part I, Chapter 5 - Production',
    part: 'Part I',
    chapter: 'Chapter 5',
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for production processing, contamination prevention, and production controls.',
  },
  {
    sourceId: 'EU_GMP_VOL4_CH6_QC',
    title: 'Part I, Chapter 6 - Quality Control',
    part: 'Part I',
    chapter: 'Chapter 6',
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for QC, testing, lab controls, and release evidence.',
  },
  {
    sourceId: 'EU_GMP_VOL4_CH8_COMPLAINTS_RECALL',
    title: 'Part I, Chapter 8 - Complaints, Quality Defects and Product Recalls',
    part: 'Part I',
    chapter: 'Chapter 8',
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for investigations, recalls, and defect handling.',
  },
  {
    sourceId: 'EU_GMP_VOL4_CH9_SELF_INSPECTION',
    title: 'Part I, Chapter 9 - Self Inspection',
    part: 'Part I',
    chapter: 'Chapter 9',
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for self-inspection, audit readiness, and internal review.',
  },
  {
    sourceId: 'EU_GMP_VOL4_PARTIII_SMF',
    title: 'Part III - Site Master File',
    part: 'Part III',
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for Site Master File structure and inspection pack outputs.',
  },
  {
    sourceId: 'EU_GMP_VOL4_PARTIII_Q9',
    title: 'Part III - ICH Q9 Quality Risk Management',
    part: 'Part III',
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for risk-based controls and smart severity logic.',
  },
  {
    sourceId: 'EU_GMP_VOL4_ANNEX11',
    title: 'Annex 11 - Computerised Systems',
    part: 'Annex',
    annex: 'Annex 11',
    version: 'January 2011',
    effectiveDate: new Date('2011-06-30T00:00:00.000Z'),
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for computerised systems, access controls, audit trails, and electronic records/signatures.',
  },
  {
    sourceId: 'EU_GMP_VOL4_ANNEX15',
    title: 'Annex 15 - Qualification and Validation',
    part: 'Annex',
    annex: 'Annex 15',
    effectiveDate: new Date('2015-10-01T00:00:00.000Z'),
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for process validation, qualification, and validation evidence.',
  },
  {
    sourceId: 'EU_GMP_VOL4_ANNEX16',
    title: 'Annex 16 - Certification by a Qualified Person and Batch Release',
    part: 'Annex',
    annex: 'Annex 16',
    effectiveDate: new Date('2016-04-15T00:00:00.000Z'),
    officialUrl: OFFICIAL_URL,
    notes: 'Primary source for certification and batch release controls.',
  },
];

const DEFAULT_CONTROLS = [
  {
    controlId: 'LABEL_LIFECYCLE_RECONCILIATION',
    domain: 'LABELS',
    title: 'QR label lifecycle and reconciliation',
    description: 'Controlled label creation, issue, print, apply, void, damaged, destroyed, missing, reprint, and reconciliation workflow.',
    sourceIds: ['EU_GMP_VOL4_CH1_PQS', 'EU_GMP_VOL4_CH4_DOCUMENTATION', 'EU_GMP_VOL4_CH5_PRODUCTION', 'EU_GMP_VOL4_ANNEX11', 'EU_GMP_VOL4_PARTIII_Q9'],
  },
  {
    controlId: 'BATCH_CULTIVATION_RECORD',
    domain: 'BCR',
    title: 'Batch Cultivation Record generation',
    description: 'Auto-created batch cultivation record linking batch number to source, clones, daily checks, environmental records, labels, staff, deviations, and release evidence.',
    sourceIds: ['EU_GMP_VOL4_CH4_DOCUMENTATION', 'EU_GMP_VOL4_CH5_PRODUCTION', 'EU_GMP_VOL4_ANNEX15'],
  },
  {
    controlId: 'SOP_BASED_TRAINING',
    domain: 'TRAINING',
    title: 'SOP-based induction, on-the-job, and classroom training',
    description: 'Training records must identify training type, trainer, trainee, team ownership, SOP version, assessment, evidence, and expiry where applicable.',
    sourceIds: ['EU_GMP_VOL4_CH2_PERSONNEL', 'EU_GMP_VOL4_CH4_DOCUMENTATION', 'EU_GMP_VOL4_ANNEX11'],
  },
  {
    controlId: 'ANNUAL_MEDICAL_READINESS',
    domain: 'MEDICALS',
    title: 'Annual medical requirements',
    description: 'Role-based annual medical requirements with evidence, expiry, alerts, and QMS readiness impact.',
    sourceIds: ['EU_GMP_VOL4_CH1_PQS', 'EU_GMP_VOL4_CH2_PERSONNEL'],
  },
  {
    controlId: 'PROCESS_VALIDATION_SMART_FLAGS',
    domain: 'VALIDATION',
    title: 'Risk-based process validation with smart flags',
    description: 'Validation protocol, run evidence, missing/weak evidence flags, repeated failure detection, out-of-trend flags, and approval blocking.',
    sourceIds: ['EU_GMP_VOL4_CH1_PQS', 'EU_GMP_VOL4_ANNEX15', 'EU_GMP_VOL4_PARTIII_Q9'],
  },
  {
    controlId: 'ELECTRONIC_SIGNATURE_AUDIT_TRAIL',
    domain: 'SIGNATURES',
    title: 'Electronic signatures and immutable audit trails',
    description: 'Authenticated electronic signatures with meaning, timestamp, signed record state, access controls, and append-only audit history.',
    sourceIds: ['EU_GMP_VOL4_CH4_DOCUMENTATION', 'EU_GMP_VOL4_ANNEX11'],
  },
  {
    controlId: 'DIGITAL_SMF_INSPECTION_PACK',
    domain: 'SMF',
    title: 'Digital SMF and inspection pack output',
    description: 'Governed internal evidence record and inspection pack generated from records mapped to EU GMP requirements.',
    sourceIds: ['EU_GMP_VOL4_CH4_DOCUMENTATION', 'EU_GMP_VOL4_PARTIII_SMF', 'EU_GMP_VOL4_ANNEX11'],
  },
];

export async function ensureEuGmpRegistry(userId?: string, tenantId?: string) {
  for (const source of DEFAULT_SOURCES) {
    await prisma.complianceSource.upsert({
      where: { sourceId: source.sourceId },
      update: source,
      create: source,
    });
  }

  for (const spec of DEFAULT_CONTROLS) {
    const control = await prisma.complianceControl.upsert({
      where: { controlId: spec.controlId },
      update: {
        domain: spec.domain,
        title: spec.title,
        description: spec.description,
        status: 'ACTIVE',
      },
      create: {
        controlId: spec.controlId,
        domain: spec.domain,
        title: spec.title,
        description: spec.description,
        status: 'ACTIVE',
      },
    });

    const sources = await prisma.complianceSource.findMany({
      where: { sourceId: { in: spec.sourceIds } },
      select: { id: true },
    });

    for (const source of sources) {
      await prisma.complianceControlSource.upsert({
        where: {
          complianceControlId_complianceSourceId: {
            complianceControlId: control.id,
            complianceSourceId: source.id,
          },
        },
        update: {},
        create: {
          complianceControlId: control.id,
          complianceSourceId: source.id,
          rationale: 'Default production-readiness mapping from EU GMP PRD.',
        },
      });
    }
  }

  if (userId && tenantId) {
    eventBus.emit('EU_GMP_REGISTRY_SYNCED', {
      userId,
      tenantId,
      entityType: 'ComplianceSource',
      entityId: 'EU_GMP_REGISTRY',
    });
  }
}

export async function getEuGmpRegistry() {
  await ensureEuGmpRegistry();
  const [sources, controls] = await Promise.all([
    prisma.complianceSource.findMany({ orderBy: [{ part: 'asc' }, { sourceId: 'asc' }] }),
    prisma.complianceControl.findMany({
      include: { sources: { include: { source: true } } },
      orderBy: [{ domain: 'asc' }, { controlId: 'asc' }],
    }),
  ]);

  return {
    officialUrl: OFFICIAL_URL,
    sources,
    controls: controls.map(control => ({
      ...control,
      sourceIds: control.sources.map(link => link.source.sourceId),
      sourceTitles: control.sources.map(link => link.source.title),
    })),
  };
}

// QA adds a regulatory source (the verified human types the citation; the AI only stores it).
// New sources start DRAFT_TRACKED; QA activates them once verified.
export async function createSource(data: { sourceId?: string; framework: string; title: string; part?: string; chapter?: string; officialUrl: string; notes?: string }) {
  if (!data.framework || !data.title || !data.officialUrl) throw Object.assign(new Error('framework, title and officialUrl are required'), { status: 400 });
  const sourceId = (data.sourceId || `${data.framework}_${data.title}`).toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 60);
  return prisma.complianceSource.create({
    data: {
      sourceId, framework: data.framework, title: data.title, part: data.part || data.framework,
      chapter: data.chapter || null, officialUrl: data.officialUrl, notes: data.notes || null, status: 'DRAFT_TRACKED',
    },
  });
}

export async function updateSource(id: string, data: { title?: string; framework?: string; chapter?: string; officialUrl?: string; notes?: string; status?: string }) {
  const src = await prisma.complianceSource.findUnique({ where: { id } });
  if (!src) throw Object.assign(new Error('Source not found'), { status: 404 });
  const updates: any = {};
  for (const k of ['title', 'framework', 'chapter', 'officialUrl', 'notes', 'status'] as const) if (data[k] !== undefined) updates[k] = data[k];
  return prisma.complianceSource.update({ where: { id }, data: updates });
}

export async function createComplianceControl(data: {
  controlId: string;
  domain: string;
  title: string;
  description: string;
  sourceIds: string[];
  tenantId?: string;
  userId: string;
}) {
  if (!data.sourceIds?.length) {
    throw Object.assign(new Error('At least one EU GMP source reference is required'), { status: 400 });
  }

  await ensureEuGmpRegistry();
  const sources = await prisma.complianceSource.findMany({ where: { sourceId: { in: data.sourceIds } } });
  if (sources.length !== data.sourceIds.length) {
    const found = new Set(sources.map(s => s.sourceId));
    const missing = data.sourceIds.filter(id => !found.has(id));
    throw Object.assign(new Error(`Unknown EU GMP source reference(s): ${missing.join(', ')}`), { status: 400 });
  }

  const control = await prisma.complianceControl.create({
    data: {
      controlId: data.controlId,
      domain: data.domain,
      title: data.title,
      description: data.description,
      tenantId: data.tenantId,
      sources: {
        create: sources.map(source => ({
          complianceSourceId: source.id,
          rationale: 'User-defined control mapped to EU GMP source registry.',
        })),
      },
    },
    include: { sources: { include: { source: true } } },
  });

  eventBus.emit('COMPLIANCE_CONTROL_CREATED', {
    userId: data.userId,
    tenantId: data.tenantId,
    entityType: 'ComplianceControl',
    entityId: control.id,
    sourceIds: data.sourceIds,
  });

  return control;
}
