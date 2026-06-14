import { prisma } from '../config/db';
import { eventBus } from './eventBus';

// ─────────────────────────────────────────────────────────────────────────────
// Calendar → Ticket connector
//
// The grow calendar (GrowSchedule.phases) already holds the day-by-day task plan
// for each cycle. This connector turns "today's task" into a real ticket, routed
// to the responsible role, so it lands in that role's dashboard + chat queue
// instead of sitting unread in the calendar.
//
// Idempotent: one ticket per (schedule, date, task). Re-running never duplicates.
// Reuses the existing Ticket engine — nothing new is built downstream.
// ─────────────────────────────────────────────────────────────────────────────

// Grow-calendar phase label → ticket workflow stage + responsible role.
const PHASE_STAGE: Record<string, string> = {
  VEG: 'VEGETATIVE', VEGETATIVE: 'VEGETATIVE',
  FLIP: 'FLOWERING', FLOWER: 'FLOWERING', FLOWERING: 'FLOWERING',
  HARVEST: 'HARVEST', POST: 'HARVEST',
};
const PHASE_ROLE: Record<string, string> = {
  VEG: 'CULTIVATOR', VEGETATIVE: 'CULTIVATOR',
  FLIP: 'CULTIVATOR', FLOWER: 'CULTIVATOR', FLOWERING: 'CULTIVATOR',
  HARVEST: 'HEAD_OF_CULTIVATION', POST: 'CULTIVATOR',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// W8.2 — Calendar entry → real TaskTemplate matcher
//
// Conservative, grounded matching of a free-text calendar task string to one of
// the tenant's active TaskTemplates. The point: when the calendar says "IPM
// scouting" we fire the *actual* IPM Scouting Sheet form (a Task with the real
// checklist), not just a generic ticket. Vague strings ("Water plants") must
// fall through to the existing generic-ticket flow.
// ─────────────────────────────────────────────────────────────────────────────

type MatchableTemplate = {
  id: string;
  title: string;
  description: string | null;
  roleRequired: string;
  category: string;
  checklist: any;
};

// Intent keywords — the *kind* of form. These carry the real signal; sharing
// one is what distinguishes "Mortality Register" from "Daily Check Sheet".
// NOTE: tokens are stemmed (cleaning→clean, cloning→clone, etc.) before
// comparison, so list the stemmed form here.
const INTENT_KEYWORDS = [
  'ipm', 'scouting', 'mortality', 'clean', 'harvest',
  'humidity', 'clone', 'transplant', 'spray', 'activity', 'temp',
];
// Weak keywords — location/common words that appear across many titles
// (greenhouse, mother bay, clone room, "check", "daily"). They corroborate a
// match but must not, on their own, decide between two forms.
const WEAK_KEYWORDS = [
  'check', 'sheet', 'log', 'daily', 'mother', 'greenhouse', 'room', 'bay',
  'schedule', 'register',
];
// A match requires at least one shared keyword from either tier (the gate),
// but intent keywords are what actually drive the score.
const STRONG_KEYWORDS = [...INTENT_KEYWORDS, ...WEAK_KEYWORDS];

// Multi-word phrases worth a strong-signal bonus when both sides contain them.
const STRONG_PHRASES = [
  'check sheet', 'activity log', 'daily check', 'ipm scouting',
  'temp humidity', 'mortality register', 'harvest request',
];

function normalize(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[‒-―]/g, ' ')   // figure/en/em dashes → space
    .replace(/[^a-z0-9 ]+/g, ' ')        // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// Light, domain-specific stemming so "clean"↔"cleaning" and "clone"↔"cloning"
// align (the calendar uses verbs, the forms use gerunds). Deliberately tiny —
// no general stemmer, just the handful of cultivation pairs that actually occur.
function stem(t: string): string {
  if (t === 'cleaning') return 'clean';
  if (t === 'cloning') return 'clone';
  if (t === 'transplanting') return 'transplant';
  if (t === 'checklist') return 'check';
  return t;
}

function tokens(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean).map(stem);
}

/**
 * Score how well a calendar task string matches a template title.
 * Returns a score; only scores at/above MATCH_MIN_SCORE are accepted by the
 * caller. roleRequired alignment with the routed role is rewarded as a tie-break.
 */
export function scoreTemplateMatch(
  taskStr: string,
  template: MatchableTemplate,
  routedRole?: string,
): number {
  const taskNorm = normalize(taskStr);
  const titleNorm = normalize(template.title);
  const taskTokens = new Set(tokens(taskStr));
  const titleTokens = new Set(tokens(template.title));

  // Gate: at least one shared keyword (intent or weak) — else not a candidate.
  const sharedKeywords = STRONG_KEYWORDS.filter(
    (k) => taskTokens.has(k) && titleTokens.has(k),
  );
  if (sharedKeywords.length === 0) return 0;

  // Intent keywords drive the score; weak (location/common) words only nudge.
  const sharedIntent = sharedKeywords.filter((k) => INTENT_KEYWORDS.includes(k));
  const sharedWeak = sharedKeywords.filter((k) => WEAK_KEYWORDS.includes(k));
  let score = sharedIntent.length * 3 + sharedWeak.length * 0.5;

  // Require a real intent signal OR a decisive phrase — a bare weak-word
  // overlap (e.g. only "check") is not enough to fire a specific form.
  if (sharedIntent.length === 0) {
    const hasPhrase = STRONG_PHRASES.some(
      (p) => taskNorm.includes(p) && titleNorm.includes(p),
    );
    if (!hasPhrase) return 0;
  }

  // Generic token overlap (any word) adds a little.
  let sharedAny = 0;
  for (const t of taskTokens) if (titleTokens.has(t)) sharedAny++;
  score += sharedAny * 0.3;

  // Strong phrase present on both sides = decisive signal.
  for (const phrase of STRONG_PHRASES) {
    if (taskNorm.includes(phrase) && titleNorm.includes(phrase)) score += 3;
  }

  // Prefer the template whose required role matches where we routed the ticket.
  if (routedRole && template.roleRequired === routedRole) score += 1;

  return score;
}

const MATCH_MIN_SCORE = 2.5; // require more than a single bare keyword

/**
 * Pick the best matching active template for a calendar task string, or null.
 * Conservative: returns null unless the best score clears MATCH_MIN_SCORE.
 */
export function matchTemplate(
  taskStr: string,
  templates: MatchableTemplate[],
  routedRole?: string,
): MatchableTemplate | null {
  let best: MatchableTemplate | null = null;
  let bestScore = 0;
  for (const tpl of templates) {
    const s = scoreTemplateMatch(taskStr, tpl, routedRole);
    if (s > bestScore) {
      bestScore = s;
      best = tpl;
    }
  }
  return bestScore >= MATCH_MIN_SCORE ? best : null;
}

/**
 * For each active grow schedule in a tenant, create a ticket for today's
 * calendar task(s) if one doesn't already exist. Returns how many were created.
 */
export async function syncCalendarTickets(tenantId: string, dateISO = todayISO()) {
  const schedules = await prisma.growSchedule.findMany({
    where: { tenantId, status: 'ACTIVE' },
  });

  // Load the tenant's active form templates once — used to fire the *actual*
  // due form (a Task with the real checklist) instead of a generic ticket.
  const templates = (await prisma.taskTemplate.findMany({
    where: { tenantId, active: true },
    select: { id: true, title: true, description: true, roleRequired: true, category: true, checklist: true },
  })) as MatchableTemplate[];

  // Cache role → assignee userId resolution within this tenant run.
  const assigneeCache = new Map<string, string | null>();
  async function resolveAssignee(routedRole: string, fallbackId: string): Promise<string> {
    if (!assigneeCache.has(routedRole)) {
      const user = await prisma.user.findFirst({
        where: { tenantId, active: true, role: routedRole as any },
        select: { id: true },
      });
      assigneeCache.set(routedRole, user?.id ?? null);
    }
    return assigneeCache.get(routedRole) || fallbackId;
  }

  let created = 0;
  for (const s of schedules) {
    const phases: any[] = Array.isArray(s.phases) ? (s.phases as any[]) : [];
    const entry = phases.find((p) => String(p?.date || '').slice(0, 10) === dateISO);
    if (!entry) continue;

    const tasks = [entry.task, entry.additionalTask]
      .map((t) => (t == null ? '' : String(t).trim()))
      .filter(Boolean);
    if (!tasks.length) continue;

    const phase = String(entry.phase || '').toUpperCase();
    const stage = PHASE_STAGE[phase] || 'VEGETATIVE';
    const role = PHASE_ROLE[phase] || 'CULTIVATOR';

    for (const task of tasks) {
      const title = `${s.title} · Day ${entry.dayNum} · ${task}`;

      // Idempotency: skip if this exact calendar ticket already exists.
      const existing = await prisma.ticket.findFirst({
        where: { tenantId, title, category: 'GROW_CALENDAR' },
        select: { id: true },
      });
      if (existing) continue;

      // W8.2 — try to fire the actual due form for this calendar task.
      const matched = matchTemplate(task, templates, role);
      let taskId: string | undefined;
      let formLine = '';
      if (matched) {
        const checklistItems: any[] = Array.isArray(matched.checklist)
          ? (matched.checklist as any[]) : [];
        const formTitle = `${matched.title} · ${dateISO}`;

        // Idempotent: reuse an existing Task for this template/date if present.
        let formTask = await prisma.task.findFirst({
          where: { tenantId, templateId: matched.id, title: formTitle },
          select: { id: true },
        });
        if (!formTask) {
          const assignedToId = await resolveAssignee(role, s.createdById);
          formTask = await prisma.task.create({
            data: {
              title: formTitle,
              templateId: matched.id,
              category: matched.category,
              assignedToId,
              assignerId: s.createdById,
              dueDate: new Date(`${dateISO}T00:00:00.000Z`),
              greenhouseId: s.greenhouseId,
              priority: 'MEDIUM',
              checklistDone: checklistItems.map((c: any) => ({
                item: typeof c === 'string' ? c : c?.item, done: false,
              })),
              tenantId,
            },
            select: { id: true },
          });
        }
        taskId = formTask.id;
        formLine = `Complete form: ${matched.title} (${checklistItems.length} checklist items).\n`;
        console.log(`[calendar-tickets] matched template=${matched.title}`);
      } else {
        console.log(`[calendar-tickets] generic task="${task}"`);
      }

      const ipm = entry.ipmApplication
        ? `\nIPM: ${entry.ipmApplication}${entry.dosage ? ` (${entry.dosage})` : ''}`
        : '';
      const description =
        formLine +
        `Scheduled grow task for ${s.title} (${s.strain}).\n` +
        `Phase: ${phase} · Day ${entry.dayNum} · ${dateISO}` +
        ipm;

      const ticket = await prisma.ticket.create({
        data: {
          title,
          description,
          priority: 'MEDIUM',
          category: 'GROW_CALENDAR',
          ticketType: 'ISSUE',
          workflowStage: stage,
          greenhouseId: s.greenhouseId,
          assignedToRole: role,
          reportedById: s.createdById,
          taskId,
          tenantId,
        },
      });
      eventBus.emit('TICKET_CREATED', {
        userId: s.createdById, tenantId, entityType: 'Ticket', entityId: ticket.id,
      });
      created++;
    }
  }
  return { created };
}

/** Run the connector across every tenant — used by the scheduler / one-off script. */
export async function syncCalendarTicketsAllTenants(dateISO = todayISO()) {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  let total = 0;
  for (const t of tenants) {
    try {
      const { created } = await syncCalendarTickets(t.id, dateISO);
      total += created;
      if (created) console.log(`[calendar-tickets] tenant=${t.id} created=${created}`);
    } catch (e: any) {
      console.error(`[calendar-tickets] failed tenant=${t.id}:`, e.message);
    }
  }
  return { total };
}
