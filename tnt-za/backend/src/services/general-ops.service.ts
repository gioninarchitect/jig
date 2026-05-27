import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../config/db';
import { computeState } from './worldModel.service';
import { logAICall } from './ai-audit.service';

// =====================================================================
// General Ops Q&A (Sonnet 4.6)
//
// Handles OPS_QUESTION / SMF_QUERY / TICKETS_QUERY intents from Maestro.
// Tool-less for v1 — gets a digest of tenant state + asks Sonnet to
// answer. Future: real tool calls (list_tickets, get_section, etc.).
// =====================================================================

const client = new Anthropic();

const SYSTEM_PROMPT = `You are the TnT-ZA role assistant for ILCO Farming. Speak directly and concisely. Use specific names and numbers from the live state digest provided. Do not invent facts. Reply in 2-4 short paragraphs.

Format using simple markdown when helpful (## headings, - bullets). Use ZAR for currency, SA date format. Keep it under 250 words unless the question genuinely requires more.

Always answer through the caller's role operating lens. Prioritise the decisions, queues, and evidence that role is responsible for. If the role is read-only or audit-focused, avoid operational instructions that imply they can change records.

If the data is insufficient to answer, say so directly and suggest what the user should check next inside TnT-ZA.`;

const ROLE_PROFILES: Record<string, { name: string; focus: string[]; promptHints: string[] }> = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    focus: ['UAT readiness', 'audit health', 'role access', 'system blockers', 'EU GMP/QMS evidence', 'SMF and BCR completion'],
    promptHints: ['lead with production blockers', 'call out cross-role gaps', 'include exact modules to inspect'],
  },
  TENANT_ADMIN: {
    name: 'Owner / Tenant Admin',
    focus: ['owner decisions', 'open approvals', 'facility risk', 'compliance deadlines', 'resource bottlenecks'],
    promptHints: ['summarise by business impact', 'flag decisions needed today'],
  },
  FACILITY_MANAGER: {
    name: 'Facility Manager',
    focus: ['daily site operations', 'facility tickets', 'containers', 'staff execution', 'open deviations', 'overdue tasks'],
    promptHints: ['turn findings into a floor action list', 'prioritise today and this shift'],
  },
  RESPONSIBLE_PHARMACIST: {
    name: 'Responsible Pharmacist',
    focus: ['SMF sign-off', 'QMS evidence', 'release blockers', 'deviation/CAPA quality', 'audit trail', 'EU GMP source mapping'],
    promptHints: ['focus on compliance defensibility', 'separate evidence gaps from operational noise'],
  },
  QA_INSPECTOR: {
    name: 'QA Inspector',
    focus: ['deviations', 'CAPA', 'BCR review', 'label control', 'training evidence', 'inspection readiness'],
    promptHints: ['list what needs review or closure', 'mention linked evidence and missing evidence'],
  },
  HEAD_OF_CULTIVATION: {
    name: 'Head of Cultivation',
    focus: ['plant health', 'mothers/clones', 'BayGrid', 'daily checks', 'mortality', 'harvest readiness'],
    promptHints: ['focus on cultivation execution', 'surface plant or bay risks first'],
  },
  CULTIVATOR: {
    name: 'Cultivator',
    focus: ['today tasks', 'plant actions', 'bay work', 'feeding', 'environment checks', 'scan workflow'],
    promptHints: ['keep it practical and shift-focused', 'avoid management-only detail unless safety/compliance critical'],
  },
  NURSERY_MANAGER: {
    name: 'Nursery Manager',
    focus: ['mother plants', 'clone trays', 'root checks', 'transplants', 'nursery environment'],
    promptHints: ['focus on clone readiness and early lifecycle risks'],
  },
  PROCESSING_MANAGER: {
    name: 'Processing Manager',
    focus: ['batches', 'trim', 'drying/curing', 'container movement', 'weight variance', 'BCR evidence'],
    promptHints: ['focus on batch flow and process bottlenecks'],
  },
  PROCESSING_SUPERVISOR: {
    name: 'Processing Supervisor',
    focus: ['trim sessions', 'crew assignments', 'container scans', 'drying/curing checks', 'weight records'],
    promptHints: ['give shift-level actions and exceptions'],
  },
  LAB_TECH: {
    name: 'Lab Tech',
    focus: ['lab results', 'COA status', 'failed tests', 'retests', 'sample chain of custody'],
    promptHints: ['focus on testing queue and release impact'],
  },
  SECURITY_OFFICER: {
    name: 'Security Officer',
    focus: ['security tickets', 'access events', 'incident evidence', 'destruction witness support', 'label/asset exceptions'],
    promptHints: ['focus on controlled access, incident escalation, and evidence preservation'],
  },
  MAINTENANCE_MANAGER: {
    name: 'Maintenance Manager',
    focus: ['assets', 'calibration', 'equipment tickets', 'preventative maintenance', 'facility readiness'],
    promptHints: ['prioritise equipment risk and due/overdue maintenance'],
  },
  IT_MANAGER: {
    name: 'IT Manager',
    focus: ['system health', 'AI audit trail', 'QR scanners/printers', 'users/access', 'data integrity'],
    promptHints: ['focus on technical controls and support actions'],
  },
  VIEWER: {
    name: 'Viewer / Auditor',
    focus: ['read-only evidence review', 'audit trail', 'SMF sections', 'BCR records', 'label accountability'],
    promptHints: ['explain what the evidence shows', 'do not suggest write actions'],
  },
  GMP_PARTNER: {
    name: 'GMP Partner',
    focus: ['EU GMP alignment', 'findings', 'observations', 'SMF evidence', 'QMS maturity'],
    promptHints: ['frame answers as audit observations and evidence requests'],
  },
};

export interface ChatAction {
  id: string;
  label: string;
  href: string;
  prompt?: string;
  tone?: 'primary' | 'warning' | 'danger' | 'neutral';
}

function roleProfile(role: string) {
  return ROLE_PROFILES[role] || {
    name: role.replace(/_/g, ' '),
    focus: ['assigned work', 'open tickets', 'training', 'compliance alerts'],
    promptHints: ['answer within the caller role and permissions'],
  };
}

function uniqActions(actions: ChatAction[]) {
  const seen = new Set<string>();
  return actions.filter(action => {
    const key = `${action.label}:${action.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

function actionFor(id: string): ChatAction | null {
  const actions: Record<string, ChatAction> = {
    dashboard: { id: 'dashboard', label: 'Open Dashboard', href: '/dashboard', tone: 'neutral' },
    tickets: { id: 'tickets', label: 'Open Tickets', href: '/tickets', tone: 'primary' },
    qms: { id: 'qms', label: 'Open QMS', href: '/qms', tone: 'primary' },
    deviations: { id: 'deviations', label: 'Review CAPA', href: '/qms', tone: 'warning' },
    batches: { id: 'batches', label: 'Open Batches', href: '/batches', tone: 'primary' },
    bcr: { id: 'bcr', label: 'Review BCRs', href: '/batches', tone: 'warning' },
    smf: { id: 'smf', label: 'Open SMF', href: '/site-master-file', tone: 'primary' },
    smfSignoff: { id: 'smf-signoff', label: 'Review Sign-Off', href: '/site-master-file', tone: 'warning' },
    sop: { id: 'sop', label: 'Open SOP Library', href: '/sop-library', tone: 'neutral' },
    training: { id: 'training', label: 'Open Training', href: '/hr', tone: 'neutral' },
    labels: { id: 'labels', label: 'Open Labels', href: '/qms', tone: 'danger' },
    audit: { id: 'audit', label: 'Open Audit', href: '/audit', tone: 'neutral' },
    plants: { id: 'plants', label: 'Open Plants', href: '/plants', tone: 'neutral' },
    baygrid: { id: 'baygrid', label: 'Open BayGrid', href: '/baygrid', tone: 'neutral' },
    scan: { id: 'scan', label: 'Open Scanner', href: '/scan', tone: 'primary' },
    containers: { id: 'containers', label: 'Open Containers', href: '/containers', tone: 'neutral' },
    assets: { id: 'assets', label: 'Open Assets', href: '/assets', tone: 'neutral' },
    mortality: { id: 'mortality', label: 'Open Mortality', href: '/mortality', tone: 'warning' },
    dailyCheck: { id: 'daily-check', label: 'Open Daily Checks', href: '/daily-check', tone: 'neutral' },
    envLog: { id: 'env-log', label: 'Open Env Log', href: '/env-log', tone: 'neutral' },
    feeding: { id: 'feeding', label: 'Open Feeding', href: '/feeding', tone: 'neutral' },
    harvest: { id: 'harvest', label: 'Open Harvest Requests', href: '/harvest-request', tone: 'neutral' },
    trim: { id: 'trim', label: 'Open Trim', href: '/trim', tone: 'neutral' },
    lab: { id: 'lab', label: 'Open Lab', href: '/lab', tone: 'neutral' },
    coa: { id: 'coa', label: 'Open COA', href: '/lab', tone: 'neutral' },
    security: { id: 'security', label: 'Open Security', href: '/security', tone: 'neutral' },
    users: { id: 'users', label: 'Open Users', href: '/users', tone: 'neutral' },
    owner: { id: 'owner', label: 'Open Owner 360', href: '/owner', tone: 'primary' },
    tasks: { id: 'tasks', label: 'Open Checklists', href: '/tasks', tone: 'neutral' },
  };
  return actions[id] || null;
}

export function buildChatActions(opts: {
  role: string;
  intent?: string;
  message: string;
  answer: string;
}): ChatAction[] {
  const text = `${opts.intent || ''} ${opts.message} ${opts.answer}`.toLowerCase();
  const actions: ChatAction[] = [];

  const add = (...ids: string[]) => {
    ids.forEach(id => {
      const action = actionFor(id);
      if (action) actions.push(action);
    });
  };

  if (text.includes('smf') || text.includes('site master file') || text.includes('sign-off') || text.includes('signed')) add('smf', 'smfSignoff');
  if (text.includes('bcr') || text.includes('batch cultivation') || text.includes('batch')) add('batches', 'bcr');
  if (text.includes('label') || text.includes('stationery') || text.includes('missing')) add('labels', 'tickets');
  if (text.includes('deviation') || text.includes('capa') || text.includes('root cause')) add('qms', 'deviations');
  if (text.includes('training') || text.includes('sop')) add('training', 'sop');
  if (text.includes('audit') || text.includes('hash')) add('audit');
  if (text.includes('plant') || text.includes('bay') || text.includes('clone') || text.includes('mother')) add('plants', 'baygrid');
  if (text.includes('container') || text.includes('weight') || text.includes('scan')) add('containers', 'scan');
  if (text.includes('equipment') || text.includes('calibration') || text.includes('asset')) add('assets');
  if (text.includes('mortality') || text.includes('death')) add('mortality');
  if (text.includes('daily check')) add('dailyCheck');
  if (text.includes('environment') || text.includes('humidity') || text.includes('temperature')) add('envLog');
  if (text.includes('feeding') || text.includes('irrigation')) add('feeding');
  if (text.includes('harvest')) add('harvest');
  if (text.includes('trim') || text.includes('processing')) add('trim');
  if (text.includes('lab') || text.includes('coa') || text.includes('test') || text.includes('retest')) add('lab', 'coa');
  if (text.includes('security') || text.includes('incident')) add('security', 'tickets');
  if (text.includes('ticket') || text.includes('overdue') || text.includes('blocker')) add('tickets');

  if (actions.length < 3) {
    switch (opts.role) {
      case 'SUPER_ADMIN':
        add('dashboard', 'audit', 'qms', 'smf', 'tickets');
        break;
      case 'RESPONSIBLE_PHARMACIST':
        add('smf', 'qms', 'audit', 'batches');
        break;
      case 'QA_INSPECTOR':
        add('qms', 'bcr', 'labels', 'audit');
        break;
      case 'FACILITY_MANAGER':
        add('dashboard', 'tickets', 'containers', 'dailyCheck');
        break;
      case 'HEAD_OF_CULTIVATION':
      case 'CULTIVATOR':
      case 'NURSERY_MANAGER':
        add('baygrid', 'plants', 'dailyCheck', 'mortality');
        break;
      case 'PROCESSING_MANAGER':
      case 'PROCESSING_SUPERVISOR':
        add('batches', 'containers', 'trim', 'scan');
        break;
      case 'LAB_TECH':
        add('lab', 'batches');
        break;
      case 'SECURITY_OFFICER':
        add('security', 'tickets', 'assets');
        break;
      case 'MAINTENANCE_MANAGER':
        add('assets', 'tickets');
        break;
      case 'IT_MANAGER':
        add('dashboard', 'users', 'audit');
        break;
      case 'VIEWER':
      case 'GMP_PARTNER':
        add('smf', 'audit', 'batches', 'qms');
        break;
      default:
        add('dashboard', 'tickets', 'tasks');
    }
  }

  return uniqActions(actions);
}

export async function answerOpsQuestion(opts: {
  message: string;
  role: string;
  realUserName: string | null;
  tenantId: string;
  intent?: string;
}): Promise<{ answer: string; usage?: any; sources: Record<string, any>; actions: ChatAction[] }> {
  const digest = await buildOpsDigest(opts.tenantId);
  const profile = roleProfile(opts.role);

  const userMsg =
    `# Caller\n` +
    `- Role: ${opts.role}\n` +
    `- Role assistant: ${profile.name}\n` +
    `- Name: ${opts.realUserName ?? 'unknown'}\n\n` +
    `# Role operating lens\n` +
    `- Focus: ${profile.focus.join(', ')}\n` +
    `- Response rules: ${profile.promptHints.join('; ')}\n\n` +
    `# Live state digest\n\n` +
    '```json\n' + JSON.stringify(digest, null, 2) + '\n```\n\n' +
    `# Question\n\n${opts.message}\n\n` +
    `Answer concisely.`;

  const t0 = Date.now();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    output_config: { effort: 'medium' },
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userMsg }],
  });

  const textBlock = response.content.find((b: any) => b.type === 'text');
  const answer = textBlock && 'text' in textBlock ? textBlock.text : '';

  // Sources = a compact summary of what data fed the answer
  const sources = {
    plants: digest.cultivation.totalPlants,
    activeBatches: digest.cultivation.activeBatches,
    openTickets: digest.tickets.openCount,
    smfSectionsByStatus: digest.smf.byStatus,
    smfStaleCount: digest.smf.stale.length,
    keyPersonnel: digest.keyPersonnel.length,
    licenceNumber: digest.compliance.licenceNumber,
    licenceExpiringDays: digest.compliance.licenceExpiringDays,
    roleAssistant: profile.name,
    digestBytes: JSON.stringify(digest).length,
  };

  void logAICall({
    tenantId: opts.tenantId,
    agent: 'GENERAL_OPS',
    model: 'claude-sonnet-4-6',
    intent: opts.intent,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: userMsg,
    response: answer,
    sources,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    cacheReadTokens: response.usage?.cache_read_input_tokens,
    cacheCreationTokens: response.usage?.cache_creation_input_tokens,
    durationMs: Date.now() - t0,
    entityType: 'ChatReply',
  });

  return {
    answer,
    usage: response.usage,
    sources,
    actions: buildChatActions({ role: opts.role, intent: opts.intent, message: opts.message, answer }),
  };
}

async function buildOpsDigest(tenantId: string) {
  const [
    state,
    tickets,
    smfSummary,
    smfStale,
    keyPersonnel,
    facility,
  ] = await Promise.all([
    computeState(tenantId),
    prisma.ticket.findMany({
      where: { tenantId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      select: { priority: true, ticketType: true, category: true, title: true, createdAt: true, assignedToId: true, assignedToRole: true, workflowStage: true },
      take: 30,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.sMFSection.groupBy({ by: ['status'], where: { tenantId, unit: 'cannabis' }, _count: true }),
    prisma.sMFSection.findMany({
      where: { tenantId, staleSince: { not: null } },
      select: { sectionId: true, title: true, staleReason: true, status: true },
    }),
    prisma.user.findMany({
      where: { tenantId, active: true, role: { in: ['RESPONSIBLE_PHARMACIST','HEAD_OF_CULTIVATION','PROCESSING_MANAGER','FACILITY_MANAGER','TENANT_ADMIN','QA_INSPECTOR','IT_MANAGER'] } },
      select: { name: true, role: true, email: true },
    }),
    prisma.facility.findFirst({ where: { tenantId }, select: { name: true, gmpStatus: true } }),
  ]);

  return {
    today: new Date().toISOString().slice(0, 10),
    facility,
    keyPersonnel,
    cultivation: {
      totalPlants: state.facility.totalPlants,
      plantsByPhase: state.facility.plantsByPhase,
      activeBatches: state.facility.activeBatches,
      quotaUsedPct: Math.round(state.facility.quotaUsedPercent),
    },
    compliance: state.compliance,
    containers: state.containers,
    lab: state.lab,
    tickets: {
      openCount: tickets.length,
      topByPriority: tickets.slice(0, 10).map(t => ({
        priority: t.priority,
        title: t.title,
        type: t.ticketType,
        category: t.category,
        ageHours: Math.round((Date.now() - t.createdAt.getTime()) / 3600000),
      })),
    },
    smf: {
      byStatus: smfSummary.reduce((m, s) => { m[s.status] = s._count; return m; }, {} as Record<string, number>),
      stale: smfStale,
    },
  };
}
