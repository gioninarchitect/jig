import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../config/db';
import { logAICall } from './ai-audit.service';

// =====================================================================
// SMF Composer agent (Opus 4.7 + adaptive thinking)
//
// On demand: takes a stale signed SMF section + fresh facility data,
// drafts a revised section text. RP reviews, then either accepts (which
// copies composedDraft into bodyText and resets the chain to DRAFT for
// re-sign) or discards.
//
// Uses prompt caching on the system prompt so subsequent calls are cheap.
// =====================================================================

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert technical writer specialising in South African medicinal-cannabis Site Master File (SMF) documentation.

The Site Master File is a SAHPRA-mandated document under Section 22C of the Medicines and Related Substances Act. Each section follows a strict GMP-aligned structure derived from the PIC/S Site Master File guidance.

Your job: given a single SMF section that has been flagged as stale (because operational state changed), draft a revised section text that:

1. Preserves the regulatory accuracy and tone of the original (formal, declarative, third-person)
2. Integrates the fresh facility data provided in the input
3. Addresses the specific drift reason
4. Stays faithful to the section's chapter purpose (do NOT add content from other chapters)
5. Is concise — typical SMF sections are 2-6 short paragraphs of plain prose, sometimes with bullet lists or tables
6. Does NOT include the section header (the host system already shows it)
7. Does NOT include sign-off blocks (those are appended by the system on AR approval)

Output ONLY the revised section text in plain prose. No JSON, no markdown headings, no commentary about your changes.

If the data provided is insufficient to draft a complete section, write what you can confidently support and end with a single italicised line in the form: "_Outstanding: <one-line list of the fields the RP still needs to gather>_"

Be terse. Be regulator-grade. Be exact.`;

interface ComposeContext {
  section: {
    sectionId: string;
    chapter: string;
    title: string;
    bodyText: string | null;
    staleReason: string | null;
    status: string;
  };
  freshData: Record<string, any>;  // tenant-scoped facility/world-model snapshot
}

export async function composeSectionDraft(sectionId: string, tenantId: string) {
  const section = await prisma.sMFSection.findFirst({
    where: { id: sectionId, tenantId },
  });
  if (!section) throw Object.assign(new Error('Section not found'), { status: 404 });

  // Pull fresh tenant facts the composer might need
  const freshData = await gatherFreshData(tenantId, section.sectionId);

  const ctx: ComposeContext = {
    section: {
      sectionId: section.sectionId,
      chapter: section.chapter,
      title: section.title,
      bodyText: section.bodyText,
      staleReason: section.staleReason,
      status: section.status,
    },
    freshData,
  };

  const userMsg =
    `# Section to revise\n\n` +
    `**Reference:** ${ctx.section.sectionId}\n` +
    `**Chapter:** ${ctx.section.chapter}\n` +
    `**Title:** ${ctx.section.title}\n` +
    `**Current sign-off status:** ${ctx.section.status}\n` +
    `**Why stale:** ${ctx.section.staleReason ?? '(not specified)'}\n\n` +
    `## Current body text\n\n` +
    (ctx.section.bodyText ? `\`\`\`\n${ctx.section.bodyText}\n\`\`\`` : '_(empty — first draft)_') +
    `\n\n## Fresh facility data (live from the operational system)\n\n` +
    '```json\n' + JSON.stringify(ctx.freshData, null, 2) + '\n```\n\n' +
    `## Task\n\nDraft the revised section body. Plain prose only. No JSON, no headings, no commentary.`;

  const t0 = Date.now();
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4000,
    thinking: { type: 'adaptive', display: 'summarized' },
    output_config: { effort: 'high' },
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userMsg }],
  });

  const textBlock = response.content.find((b: any) => b.type === 'text');
  const thinkingBlock = response.content.find((b: any) => b.type === 'thinking');
  const draft = textBlock && 'text' in textBlock ? textBlock.text : '';
  const thinkingSummary = thinkingBlock && 'thinking' in thinkingBlock ? (thinkingBlock as any).thinking : null;

  // Audit the call — sources = the keys of fresh data passed in
  void logAICall({
    tenantId,
    agent: 'COMPOSER',
    model: 'claude-opus-4-7',
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: userMsg,
    response: draft,
    thinkingSummary: thinkingSummary || undefined,
    sources: {
      sectionRef: section.sectionId,
      sectionTitle: section.title,
      sectionStatus: section.status,
      staleReason: section.staleReason,
      freshDataKeys: Object.keys(freshData),
      freshDataBytes: JSON.stringify(freshData).length,
    },
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    cacheReadTokens: response.usage?.cache_read_input_tokens,
    cacheCreationTokens: response.usage?.cache_creation_input_tokens,
    durationMs: Date.now() - t0,
    entityType: 'SMFSection',
    entityId: sectionId,
  });

  await prisma.sMFSection.update({
    where: { id: sectionId },
    data: {
      composedDraft: draft,
      composedDraftAt: new Date(),
      composedThinking: thinkingSummary || null,
    },
  });

  return {
    draft,
    thinking: thinkingSummary,
    usage: response.usage,
    inputContext: ctx,
  };
}

async function gatherFreshData(tenantId: string, sectionId: string): Promise<Record<string, any>> {
  // Pull common pieces every section might need
  const [tenant, facility, users, greenhouses, sopsCount, anomaliesOpen, permitsActive] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, slug: true } }),
    prisma.facility.findFirst({ where: { tenantId }, select: { name: true, location: true, gmpStatus: true } }),
    prisma.user.findMany({ where: { tenantId, active: true }, select: { name: true, role: true, email: true } }),
    prisma.greenhouse.findMany({ where: { tenantId }, select: { name: true, type: true, totalBays: true, active: true } }),
    prisma.sOP.count({ where: { tenantId, active: true } }),
    prisma.anomaly.count({ where: { tenantId, resolvedAt: null } }),
    prisma.permit.findMany({ where: { facility: { tenantId } }, select: { type: true, permitNumber: true, expiryDate: true } }),
  ]);

  // Section-targeted extras (lightweight discriminator on chapter)
  const extras: Record<string, any> = {};
  if (sectionId.startsWith('C.3.5')) {
    extras.waterSpecReference = 'Ph. Eur. Purified water 01/2009:0008';
    extras.testCadence = '6-monthly external lab';
  }
  if (sectionId.startsWith('C.3.7') || sectionId.startsWith('C.3.6')) {
    const [calibrations, assets] = await Promise.all([
      prisma.equipmentCalibration.findMany({ where: { facility: { tenantId } }, select: { equipmentName: true, lastCalibrated: true, nextDue: true } }),
      prisma.asset.findMany({ where: { tenantId, status: 'ACTIVE' }, select: { name: true, category: true, status: true } }).catch(() => []),
    ]);
    extras.equipmentCalibrations = calibrations;
    extras.assets = assets;
  }
  if (sectionId.startsWith('C.6')) {
    const [coas, deviations] = await Promise.all([
      prisma.cOA.count({ where: { batch: { tenantId }, valid: true } }),
      prisma.deviation.findMany({ where: { facility: { tenantId } }, select: { description: true, severity: true, closedAt: true }, take: 10 }),
    ]);
    extras.activeCoaCount = coas;
    extras.recentDeviations = deviations;
  }

  return {
    tenant,
    facility,
    staffCount: users.length,
    keyPersonnel: users.filter(u => ['SUPER_ADMIN', 'TENANT_ADMIN', 'RESPONSIBLE_PHARMACIST', 'HEAD_OF_CULTIVATION', 'PROCESSING_MANAGER', 'FACILITY_MANAGER', 'IT_MANAGER'].includes(u.role)),
    greenhouses,
    activeSopCount: sopsCount,
    openAnomalies: anomaliesOpen,
    permits: permitsActive,
    ...extras,
  };
}

export async function applyDraft(sectionId: string, tenantId: string, userId: string) {
  const section = await prisma.sMFSection.findFirst({ where: { id: sectionId, tenantId } });
  if (!section) throw Object.assign(new Error('Section not found'), { status: 404 });
  if (!section.composedDraft) throw Object.assign(new Error('No composed draft to apply'), { status: 400 });

  // Copy draft into bodyText, clear draft, reset sign-off chain to DRAFT (per signSection contract)
  return prisma.sMFSection.update({
    where: { id: sectionId },
    data: {
      bodyText: section.composedDraft,
      status: 'DRAFT',
      rpSignedById: null, rpSignedAt: null, rpNotes: null,
      darSignedById: null, darSignedAt: null, darNotes: null,
      arApprovedById: null, arApprovedAt: null, arNotes: null,
      staleSince: null,
      staleReason: null,
      composedDraft: null,
      composedDraftAt: null,
      composedThinking: null,
    },
  });
}

export async function discardDraft(sectionId: string, tenantId: string) {
  const section = await prisma.sMFSection.findFirst({ where: { id: sectionId, tenantId } });
  if (!section) throw Object.assign(new Error('Section not found'), { status: 404 });
  return prisma.sMFSection.update({
    where: { id: sectionId },
    data: { composedDraft: null, composedDraftAt: null, composedThinking: null },
  });
}
