/**
 * W9.1 — Populate the ComplianceControl evidence graph from the REAL cultivation forms.
 *
 * One ComplianceControl per real ILCO cultivation-form TaskTemplate (the 19 forms seeded in
 * W8.1), each linked to the EU-GMP ComplianceSource(s) that form already cites in its
 * description. This fills the empty ComplianceControl mapping layer so the digitised forms
 * become CITED evidence of their EU-GMP clause — the inspection pack
 * (docs/cultivation-forms-digitization.md §5).
 *
 * GROUNDING (hard rules honoured):
 *  - sourceIds are NOT invented here. They are parsed verbatim from each live TaskTemplate's
 *    description (the authoritative per-form mapping from W8.1) and every parsed id is
 *    validated against the ComplianceSource table — unknown id ⇒ abort.
 *  - The form→chapter mapping is OPERATIONAL interpretation, recorded as such in the control
 *    description + link rationale. No regulatory wording is fabricated, no legal sufficiency
 *    asserted.
 *  - Where a control's regulatory basis is a SAHPRA/legal specific rather than an EU-GMP
 *    chapter (the Mortality / destruction registers → SAPS 22-series), the control is flagged
 *    needs-specialist-signoff in its description (NEEDS_SPECIALIST_SIGNOFF marker) per the
 *    no-unverified-regulatory-copy rule.
 *  - Canonical tenant ONLY (94460d80-7776-4143-b83f-6c9b014ffc3e).
 *  - Idempotent: ComplianceControl is keyed by unique controlId; existing controls are skipped
 *    (no update, no delete). Links are upserted on the (control, source) unique pair.
 *
 * Model note: ComplianceControl has no templateId FK and no JSON metadata column, so the form
 * linkage (form title + TaskTemplate id) and the signoff provenance are recorded in the
 * control.description and each ComplianceControlSource.rationale (same provenance shape the
 * eu-gmp-source.service.ts uses).
 *
 * Run (live): replicate this logic verbatim into a temp _run.js inside /var/www/tnt-za/backend
 * (live src/ is partial; require('./dist/...') / the committed shape), set DATABASE_URL from
 * .env, run, rm. Backup with pg_dump FIRST.
 */
import 'dotenv/config';
import { prisma } from '../config/db';

const TENANT_ID = '94460d80-7776-4143-b83f-6c9b014ffc3e';

// Forms whose regulatory basis is a SAHPRA/legal specific (SAPS 22-series destruction) on top
// of the EU-GMP chapters — these get the specialist-signoff flag. Matched by title prefix.
const NEEDS_SIGNOFF_TITLE_PREFIX = 'Mortality Register';
const SIGNOFF_REASON =
  'Regulatory basis for plant destruction (SAPS 22-series / chain-of-custody) is a SAHPRA/legal specific, not an EU-GMP chapter. EU-GMP CH5/CH8 cover the production/recall record; the destruction-witness legal copy is PLACEHOLDER pending medicines-law specialist sign-off.';

// Domain bucket for the evidence graph, derived from the form family.
function domainFor(title: string): string {
  if (title.startsWith('Cleaning Checklist')) return 'CLEANING';
  if (title.startsWith('Daily Check Sheet')) return 'FACILITY_READINESS';
  if (title.startsWith('Temp & Humidity')) return 'ENV_CONTROL';
  if (title.startsWith('IPM Scouting')) return 'IPM';
  if (title.startsWith('Mortality Register')) return 'QUARANTINE_DESTRUCTION';
  if (title.startsWith('Cultivation Activity Log')) return 'BCR';
  if (title.startsWith('Cloning')) return 'BCR';
  if (title.startsWith('Harvest Request')) return 'BCR';
  return 'CULTIVATION';
}

// Stable, unique controlId slug from the form title.
function controlIdFor(title: string): string {
  return (
    'CULT_FORM_' +
    title
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // strip combining diacritics
      .replace(/[—–]/g, '-') // em/en dash
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase()
  );
}

// Parse every EU_GMP_VOL4_* token out of the TaskTemplate description (authoritative mapping).
function parseSourceIds(description: string): string[] {
  const ids = description.match(/EU_GMP_VOL4_[A-Z0-9_]+/g) ?? [];
  return Array.from(new Set(ids));
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) throw new Error(`Canonical tenant ${TENANT_ID} not found — aborting (wrong DB?).`);

  // The real cultivation-form templates seeded in W8.1 (exclude abstract placeholders).
  const templates = await prisma.taskTemplate.findMany({
    where: {
      tenantId: TENANT_ID,
      active: true,
      NOT: [{ title: { startsWith: 'EU GMP ' } }, { title: { startsWith: 'Standard Operating' } }],
    },
    select: { id: true, title: true, description: true },
    orderBy: { title: 'asc' },
  });

  if (templates.length === 0) {
    throw new Error('No real cultivation-form TaskTemplates found — run seed-cultivation-forms.ts (W8.1) first.');
  }

  // Validate all parsed sourceIds against the live registry up front — never reference a
  // sourceId that does not exist.
  const liveSources = await prisma.complianceSource.findMany({ select: { id: true, sourceId: true } });
  const sourceByKey = new Map(liveSources.map((s) => [s.sourceId, s.id]));

  const created: { control: string; sources: string[]; needsSignoff: boolean }[] = [];
  const skipped: string[] = [];
  const signoffFlagged: string[] = [];

  for (const tpl of templates) {
    const sourceIds = parseSourceIds(tpl.description ?? '');
    if (sourceIds.length === 0) {
      throw new Error(`Form "${tpl.title}" cites no EU_GMP source in its description — cannot ground it; aborting.`);
    }
    const unknown = sourceIds.filter((id) => !sourceByKey.has(id));
    if (unknown.length > 0) {
      throw new Error(`Form "${tpl.title}" references unknown EU-GMP source(s): ${unknown.join(', ')} — aborting.`);
    }

    const controlId = controlIdFor(tpl.title);
    const needsSignoff = tpl.title.startsWith(NEEDS_SIGNOFF_TITLE_PREFIX);
    if (needsSignoff) signoffFlagged.push(tpl.title);

    const existing = await prisma.complianceControl.findUnique({ where: { controlId } });
    if (existing) {
      skipped.push(controlId);
      continue;
    }

    // Provenance baked into the description: which form, which TaskTemplate, what this is.
    const provenance =
      `Operational evidence mapping: ILCO cultivation form "${tpl.title}" (TaskTemplate ${tpl.id}) ` +
      `→ EU-GMP source(s) ${sourceIds.join(', ')}. ` +
      `This is an OPERATIONAL interpretation of where the form evidences EU-GMP; it does not assert ` +
      `legal sufficiency. ` +
      (needsSignoff
        ? `NEEDS_SPECIALIST_SIGNOFF: ${SIGNOFF_REASON}`
        : `Regulatory basis is the cited EU-GMP chapter(s).`);

    const linkRationale = needsSignoff
      ? `W9.1 form→EU-GMP evidence mapping (operational). NEEDS_SPECIALIST_SIGNOFF — ${SIGNOFF_REASON}`
      : 'W9.1 form→EU-GMP evidence mapping (operational interpretation, pending specialist sign-off; no legal sufficiency asserted).';

    await prisma.complianceControl.create({
      data: {
        controlId,
        domain: domainFor(tpl.title),
        title: `Form evidence: ${tpl.title}`,
        description: provenance,
        status: 'ACTIVE',
        tenantId: TENANT_ID,
        sources: {
          create: sourceIds.map((sid) => ({
            complianceSourceId: sourceByKey.get(sid)!,
            rationale: linkRationale,
          })),
        },
      },
    });

    created.push({ control: controlId, sources: sourceIds, needsSignoff });
  }

  console.log(
    JSON.stringify(
      {
        tenant: tenant.name,
        tenantId: TENANT_ID,
        realFormsFound: templates.length,
        controlsCreated: created.length,
        controlsSkippedExisting: skipped.length,
        skipped,
        needsSpecialistSignoff: signoffFlagged.length,
        signoffFlagged,
        created,
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
