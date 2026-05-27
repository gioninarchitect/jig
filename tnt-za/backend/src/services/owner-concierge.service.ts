import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../config/db';
import { computeState } from './worldModel.service';
import { logAICall } from './ai-audit.service';

// =====================================================================
// Owner Concierge agent (Opus 4.7 + adaptive thinking)
//
// Cross-unit synthesis for the Owner home. Bundles each unit's state
// digest + ticket queues + SMF drift + sign-off bottlenecks, and asks
// Opus 4.7 to produce a tight morning brief.
//
// v1: cannabis-only (chicken/mielies/cattle units fold in once their
// data exists; the prompt and bundler already accept the shape).
// =====================================================================

const client = new Anthropic();

const SYSTEM_PROMPT = `You are the Owner Concierge for ILCO Farming, briefing the owner each morning on the state of all farm operations.

You speak directly to **Ilse Venter** (CEO and Authorised Representative) and her co-CEO **Coenie Venter** (Deputy AR). Tone: confident, clear, South African business English. No fluff, no hedging.

Your job: synthesise the data bundle below into a tight morning brief structured as:

**1. Today's calls** — 1-3 things needing the owner's decision today, ranked by urgency. If nothing, say "No decisions needed today — operations are healthy."

**2. Per-unit pulse** — one short paragraph per active farming unit. Mention: notable wins, things trending wrong, what's breaking the rhythm. Skip units that have no data yet.

**3. Compliance & SMF** — current Site Master File health: how many sections stale, any signed sections drifting, any pending RP sign-offs.

**4. Patterns I'd flag** — a single observation about a pattern across units that the daily numbers don't show on their own. Genuinely insightful, not generic. Skip if there's nothing notable.

Total length: 200-350 words. Use markdown headers (## Today's calls, etc.). Use the actual names of staff (Berne, Lourens, Renae, Jeanette) where relevant — never role labels alone. Round numbers sensibly. Use ZAR for currency, SA date format.

Do not invent facts. If the bundle doesn't support a claim, do not make it.`;

export interface OwnerBrief {
  brief: string;            // markdown
  thinkingSummary?: string; // adaptive thinking summary if present
  generatedAt: string;
  bundleSize: number;
  sources?: Record<string, any>;
  usage?: any;
}

export async function generateOwnerBrief(tenantId: string): Promise<OwnerBrief> {
  // Bundle: state digest + ticket queues + SMF status + key personnel
  const [
    state,
    openTickets,
    rpQueue,
    approvalQueue,
    smfSections,
    smfStale,
    smfDriftTickets,
    keyPersonnel,
    facility,
    tenant,
  ] = await Promise.all([
    computeState(tenantId),
    prisma.ticket.findMany({
      where: { tenantId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      select: { priority: true, ticketType: true, category: true, title: true, createdAt: true, workflowStage: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ticket.count({ where: { tenantId, ticketType: 'RP_SIGNOFF', rpSignedAt: null, status: { not: 'COMPLETED' } } }),
    prisma.ticket.count({ where: { tenantId, ticketType: { in: ['REQUISITION', 'APPROVAL'] }, approvedAt: null, status: { not: 'COMPLETED' } } }),
    prisma.sMFSection.groupBy({ by: ['status'], where: { tenantId, unit: 'cannabis' }, _count: true }),
    prisma.sMFSection.count({ where: { tenantId, staleSince: { not: null } } }),
    prisma.ticket.count({ where: { tenantId, ticketType: 'SMF_DRIFT', status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.user.findMany({
      where: { tenantId, active: true, role: { in: ['RESPONSIBLE_PHARMACIST', 'HEAD_OF_CULTIVATION', 'PROCESSING_MANAGER', 'FACILITY_MANAGER', 'TENANT_ADMIN', 'QA_INSPECTOR'] } },
      select: { name: true, role: true },
    }),
    prisma.facility.findFirst({ where: { tenantId }, select: { name: true, gmpStatus: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ]);

  const ticketsByPriority = openTickets.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const smfByStatus = smfSections.reduce((acc, s) => {
    acc[s.status] = s._count;
    return acc;
  }, {} as Record<string, number>);

  const bundle = {
    today: new Date().toISOString().slice(0, 10),
    tenant: tenant?.name,
    facility: facility?.name,
    keyPersonnel,
    units: {
      cannabis: {
        status: 'live',
        plants: state.facility.totalPlants,
        plantsByPhase: state.facility.plantsByPhase,
        activeBatches: state.facility.activeBatches,
        quotaUsedPct: Math.round(state.facility.quotaUsedPercent),
        gmpStatus: state.facility.gmpStatus,
        compliance: {
          openAnomalies: state.compliance.openAnomalies,
          criticalAlerts: state.compliance.criticalAlerts,
          openDeviations: state.compliance.openDeviations,
          oldestDeviationDays: state.compliance.oldestDeviationDays,
          calibrationOverdue: state.compliance.calibrationOverdue,
          calibrationDueSoon: state.compliance.calibrationDueSoon,
          sopsDueForReview: state.compliance.sopsDueForReview,
          sopsTotal: state.compliance.sopsTotal,
          licenceNumber: state.compliance.licenceNumber,
          licenceExpiringDays: state.compliance.licenceExpiringDays,
        },
        containers: state.containers,
        lab: state.lab,
        risk: state.risk,
        smf: {
          totalSections: smfSections.reduce((n, s) => n + s._count, 0),
          byStatus: smfByStatus,
          staleCount: smfStale,
          driftTicketsOpen: smfDriftTickets,
        },
      },
      chickens: { status: 'placeholder — module not yet seeded' },
      mielies: { status: 'placeholder — module not yet seeded' },
      cattle: { status: 'placeholder — module not yet seeded' },
    },
    operationalQueues: {
      openTickets: openTickets.length,
      ticketsByPriority,
      rpSignOffPending: rpQueue,
      ownerApprovalsPending: approvalQueue,
      topThreeOpenTickets: openTickets
        .filter(t => t.priority === 'CRITICAL' || t.priority === 'HIGH')
        .slice(0, 3)
        .map(t => ({ priority: t.priority, title: t.title, type: t.ticketType, age_hours: Math.round((Date.now() - t.createdAt.getTime()) / 3600000) })),
    },
  };

  const userMsg = 'Today\'s data bundle:\n\n```json\n' + JSON.stringify(bundle, null, 2) + '\n```\n\nProduce the brief.';
  const t0 = Date.now();

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    thinking: { type: 'adaptive', display: 'summarized' },
    output_config: { effort: 'high' },
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userMsg }],
  });

  const textBlock = response.content.find((b: any) => b.type === 'text');
  const thinkingBlock = response.content.find((b: any) => b.type === 'thinking');
  const brief = textBlock && 'text' in textBlock ? textBlock.text : '';
  const thinkingSummary = thinkingBlock && 'thinking' in thinkingBlock ? (thinkingBlock as any).thinking : undefined;

  // Audit the call with the data bundle as sources
  void logAICall({
    tenantId,
    agent: 'CONCIERGE',
    model: 'claude-opus-4-7',
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: userMsg,
    response: brief,
    thinkingSummary,
    sources: {
      cultivationPlants: bundle.units.cannabis.plants,
      activeBatches: bundle.units.cannabis.activeBatches,
      openTickets: bundle.operationalQueues.openTickets,
      rpSignOffPending: bundle.operationalQueues.rpSignOffPending,
      smfStaleCount: bundle.units.cannabis.smf?.staleCount,
      smfDriftTickets: bundle.units.cannabis.smf?.driftTicketsOpen,
      keyPersonnelCount: bundle.keyPersonnel.length,
      bundleBytes: JSON.stringify(bundle).length,
    },
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    cacheReadTokens: response.usage?.cache_read_input_tokens,
    cacheCreationTokens: response.usage?.cache_creation_input_tokens,
    durationMs: Date.now() - t0,
    entityType: 'OwnerBrief',
  });

  return {
    brief,
    thinkingSummary,
    generatedAt: new Date().toISOString(),
    bundleSize: JSON.stringify(bundle).length,
    sources: {
      cultivationPlants: bundle.units.cannabis.plants,
      activeBatches: bundle.units.cannabis.activeBatches,
      openTickets: bundle.operationalQueues.openTickets,
      rpSignOffPending: bundle.operationalQueues.rpSignOffPending,
      smfStaleCount: bundle.units.cannabis.smf?.staleCount,
      smfDriftTickets: bundle.units.cannabis.smf?.driftTicketsOpen,
      keyPersonnelCount: bundle.keyPersonnel.length,
    },
    usage: response.usage,
  };
}
