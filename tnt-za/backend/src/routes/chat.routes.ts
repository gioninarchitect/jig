import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import { routeIntent } from '../services/maestro.service';
import { generateOwnerBrief } from '../services/owner-concierge.service';
import { answerOpsQuestion, buildChatActions, ChatAction } from '../services/general-ops.service';
import * as baygrid from '../services/baygrid.service';
import * as tasks from '../services/tasks.service';

// =====================================================================
// /api/chat — single endpoint, Maestro-routed
//
// Body:  { message: string }
// Returns: { route, answer, [extra] }
//
// Pipeline:
//   1. Maestro (Haiku 4.5) classifies intent
//   2. Endpoint dispatches to specialist
//   3. Returns specialist's output + the route decision (so UI can show it)
// =====================================================================

const router = Router();
router.use(requireAuth);

const ROLE_ALIASES: Array<[RegExp, string]> = [
  [/\bmaintenance\b|\bequipment\b|\bcalibration\b/i, 'MAINTENANCE_MANAGER'],
  [/\bqa\b|\bquality\b|\binspector\b|\bdeviation\b|\bcapa\b/i, 'QA_INSPECTOR'],
  [/\bsecurity\b|\baccess\b|\bincident\b/i, 'SECURITY_OFFICER'],
  [/\brp\b|\bresponsible pharmacist\b|\brelease\b|\bsign[- ]?off\b/i, 'RESPONSIBLE_PHARMACIST'],
  [/\bcultivation\b|\bhead of cultivation\b|\bplants?\b|\bbay\b/i, 'HEAD_OF_CULTIVATION'],
  [/\bprocessing\b|\btrim\b|\bdry(?:ing)?\b|\bcure\b/i, 'PROCESSING_MANAGER'],
  [/\bfacility\b|\bfm\b|\bfacility manager\b|\bclean(?:ing)?\b|\bhumidity\b|\btemperature\b/i, 'FACILITY_MANAGER'],
];

function inferPriority(message: string) {
  if (/\bcritical\b|\burgent\b|\bimmediate\b|\bsevere\b|\bout[- ]?of[- ]?range\b/i.test(message)) return 'CRITICAL';
  if (/\bhigh\b|\boverdue\b|\bescalate\b|\bblocked\b/i.test(message)) return 'HIGH';
  if (/\blow\b|\bminor\b/i.test(message)) return 'LOW';
  return 'MEDIUM';
}

function inferCategory(message: string) {
  if (/\blabel\b|\bqr\b|\bstationery\b/i.test(message)) return 'LABEL_CONTROL';
  if (/\bhumidity\b|\btemperature\b|\benv(?:ironment)?\b/i.test(message)) return 'ENVIRONMENT';
  if (/\bequipment\b|\bcalibration\b|\basset\b|\bscale\b/i.test(message)) return 'EQUIPMENT';
  if (/\bmaintenance\b|\brepair\b|\bfault\b/i.test(message)) return 'MAINTENANCE';
  if (/\bsop\b|\bchecklist\b|\btraining\b/i.test(message)) return 'COMPLIANCE_APPROVAL';
  if (/\bmortality\b|\bdead\b|\bdeath\b/i.test(message)) return 'MORTALITY';
  if (/\bpest\b/i.test(message)) return 'PEST';
  if (/\bmould\b|\bmold\b/i.test(message)) return 'MOULD';
  return 'GENERAL';
}

function inferStage(message: string) {
  if (/\bpropagation\b|\bclone\b|\bnursery\b|\bmother\b/i.test(message)) return 'PROPAGATION';
  if (/\bveg(?:etative)?\b/i.test(message)) return 'VEGETATIVE';
  if (/\bflower(?:ing)?\b/i.test(message)) return 'FLOWERING';
  if (/\bharvest\b/i.test(message)) return 'HARVEST';
  if (/\bdry(?:ing)?\b/i.test(message)) return 'DRYING';
  if (/\btrim\b/i.test(message)) return 'TRIM';
  if (/\bcure\b/i.test(message)) return 'CURE';
  if (/\bstore\b|\bqa\b|\brelease\b/i.test(message)) return 'STORE_QA';
  if (/\bdispatch\b/i.test(message)) return 'DISPATCH';
  if (/\bfacility\b|\bclean(?:ing)?\b|\bhumidity\b|\btemperature\b|\basset\b|\bequipment\b/i.test(message)) return 'FACILITY';
  return undefined;
}

function inferAssignedRole(message: string) {
  for (const [pattern, role] of ROLE_ALIASES) {
    if (pattern.test(message)) return role;
  }
  return undefined;
}

function cleanTitle(message: string, fallback: string) {
  return message
    .replace(/\b(please|can you|create|raise|log|open|a|an|new|ticket|task|reminder|next action|for|and assign it to|assign to)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140) || fallback;
}

function parseDueDate(message: string) {
  const due = new Date();
  if (/\btomorrow\b/i.test(message)) due.setDate(due.getDate() + 1);
  else if (/\bnext week\b/i.test(message)) due.setDate(due.getDate() + 7);
  else if (/\btoday\b|\bnow\b|\boverdue\b|\burgent\b/i.test(message)) {
    // keep today
  } else {
    due.setDate(due.getDate() + 2);
  }
  return due.toISOString().slice(0, 10);
}

async function tryHandlePersistedChatCommand(req: AuthRequest, message: string) {
  const text = message.trim();
  const wantsFmWizard =
    req.user!.role === 'FACILITY_MANAGER' &&
    /\b(wizard|guided|flow|sequence|start my day|do my job|oversight|all departments|department overview|department queues)\b/i.test(text);

  if (wantsFmWizard) {
    const [ticketsByRole, ticketsByStage, outstandingTasks] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['assignedToRole'],
        where: { tenantId: req.user!.tenantId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
        _count: true,
      }),
      prisma.ticket.groupBy({
        by: ['workflowStage'],
        where: { tenantId: req.user!.tenantId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
        _count: true,
      }),
      prisma.task.count({
        where: { tenantId: req.user!.tenantId, status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] } },
      }),
    ]);

    const roleLines = ticketsByRole
      .filter(r => r.assignedToRole)
      .slice(0, 8)
      .map(r => `- ${String(r.assignedToRole).replace(/_/g, ' ')}: **${r._count}** open ticket${r._count === 1 ? '' : 's'}`)
      .join('\n') || '- No role-assigned open tickets.';
    const stageLines = ticketsByStage
      .filter(s => s.workflowStage)
      .slice(0, 8)
      .map(s => `- ${String(s.workflowStage).replace(/_/g, ' ')}: **${s._count}**`)
      .join('\n') || '- No stage-tagged open tickets.';

    const actions: ChatAction[] = [
      { id: 'fm-create-ticket', label: 'Create Issue Ticket', href: '#', prompt: 'Create a ticket for an out-of-range humidity reading and assign it to Facility Manager.', tone: 'primary' },
      { id: 'fm-sop-reminder', label: 'Create SOP Reminder', href: '#', prompt: 'Create a SOP checklist reminder for facility readiness today.', tone: 'primary' },
      { id: 'fm-labels', label: 'Review Labels', href: '/assets', tone: 'warning' },
      { id: 'fm-tickets', label: 'Open Tickets', href: '/tickets', tone: 'primary' },
      { id: 'fm-tasks', label: 'Open Tasks', href: '/tasks', tone: 'neutral' },
      { id: 'fm-qms', label: 'Open QMS', href: '/qms', tone: 'warning' },
    ];

    return {
      route: { intent: 'OPS_QUESTION', reason: 'FM guided oversight wizard' },
      answer:
        `## FM oversight flow\n\n` +
        `You have oversight across all operational departments. Start with exceptions, then assign work into the controlled workflow.\n\n` +
        `**Department ticket queue**\n${roleLines}\n\n` +
        `**Workflow-stage pressure**\n${stageLines}\n\n` +
        `**Outstanding checklist/task load:** **${outstandingTasks}** open item${outstandingTasks === 1 ? '' : 's'}.\n\n` +
        `Choose the next action below. I can create a persisted ticket, create a SOP/checklist reminder, or take you straight into Tickets, Tasks, QMS, Labels, or Audit.`,
      actions,
      sources: {
        command: 'fm_oversight_wizard',
        ticketsByRole: ticketsByRole.length,
        ticketsByStage: ticketsByStage.length,
        outstandingTasks,
      },
    };
  }

  const wantsNurseryWizard =
    req.user!.role === 'NURSERY_MANAGER' &&
    /\b(wizard|guided|flow|sequence|start my day|do my job|nursery|mother|clone|root check|transplant)\b/i.test(text);

  if (wantsNurseryWizard) {
    const now = new Date();
    const [activeMothers, mothersDue, cloneTrays, cloneMortalityEvents, outstandingTasks] = await Promise.all([
      prisma.motherPlant.count({ where: { tenantId: req.user!.tenantId, status: 'ACTIVE' } }),
      prisma.motherPlant.count({ where: { tenantId: req.user!.tenantId, status: 'ACTIVE', nextHealthCheck: { lte: now } } }),
      prisma.cloneTray.findMany({
        where: { tenantId: req.user!.tenantId, status: { in: ['ROOTING', 'ROOTED'] } },
        select: { trayNumber: true, strain: true, totalCuttings: true, rooted: true, mortality: true, status: true, cloneDate: true, rootingDays: true },
        orderBy: { cloneDate: 'asc' },
        take: 12,
      }),
      prisma.mortalityRecord.count({
        where: { tenantId: req.user!.tenantId, cloneTrayId: { not: null }, createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } },
      }),
      prisma.task.count({
        where: {
          tenantId: req.user!.tenantId,
          status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
          OR: [
            { assignedToId: req.user!.userId },
            { category: { in: ['CULTIVATION', 'SAHPRA', 'GENERAL'] } },
          ],
        },
      }),
    ]);

    const trayLines = cloneTrays.length
      ? cloneTrays.slice(0, 6).map((t: any) => {
          const days = Math.floor((now.getTime() - t.cloneDate.getTime()) / 86400000);
          const due = days >= (t.rootingDays || 14) ? ' due' : '';
          return `- ${t.trayNumber} · ${t.strain}: **${t.rooted}/${t.totalCuttings}** rooted, ${t.mortality} mortality, day ${days}${due}`;
        }).join('\n')
      : '- No active rooting/rooted clone trays.';

    const actions: ChatAction[] = [
      { id: 'nursery-mothers', label: 'Open Mothers', href: '/mothers', tone: 'primary' },
      { id: 'nursery-root-ticket', label: 'Create Root Issue Ticket', href: '#', prompt: 'Create a ticket for nursery clone rooting risk and assign it to Nursery Manager.', tone: 'warning' },
      { id: 'nursery-sop-reminder', label: 'Create SOP Reminder', href: '#', prompt: 'Create a SOP checklist reminder for nursery readiness today.', tone: 'primary' },
      { id: 'nursery-mortality', label: 'Open Mortality', href: '/mortality', tone: 'warning' },
      { id: 'nursery-tasks', label: 'Open Tasks', href: '/tasks', tone: 'neutral' },
      { id: 'nursery-baygrid', label: 'Open BayGrid', href: '/baygrid', tone: 'neutral' },
    ];

    return {
      route: { intent: 'OPS_QUESTION', reason: 'Nursery Manager guided wizard' },
      answer:
        `## Nursery Manager flow\n\n` +
        `Start with mother health, then clone tray rooting, then mortality/transplant readiness. Push exceptions into tickets or SOP checklist reminders.\n\n` +
        `**Mother plant control**\n` +
        `- Active mothers: **${activeMothers}**\n` +
        `- Health checks due/overdue: **${mothersDue}**\n\n` +
        `**Clone tray queue**\n${trayLines}\n\n` +
        `**Clone mortality events this week:** **${cloneMortalityEvents}**\n` +
        `**Open nursery/cultivation checklist load:** **${outstandingTasks}**\n\n` +
        `Choose the next action below. I can route you to mothers, create a persisted nursery issue ticket, create a SOP/checklist reminder, or open mortality/tasks for evidence review.`,
      actions,
      sources: {
        command: 'nursery_manager_wizard',
        activeMothers,
        mothersDue,
        activeCloneTrays: cloneTrays.length,
        cloneMortalityEvents,
        outstandingTasks,
      },
    };
  }

  const wantsTicket =
    /\b(create|raise|log|open)\b.*\bticket\b/i.test(text) ||
    /\bcreate\b.*\b(next action|out[- ]?of[- ]?range|humidity|temperature|label accountability|facility issue)\b/i.test(text);
  const wantsTask =
    /\b(create|add|set|log)\b.*\b(task|reminder|checklist)\b/i.test(text) ||
    /\bremind me\b|\bsop reminder\b|\boutstanding checklist\b/i.test(text);
  const wantsAssign = /\bassign\b.*\bticket\b/i.test(text);

  if (wantsAssign) {
    const idMatch = text.match(/\b[0-9a-f]{6,}(?:-[0-9a-f]{4,}){0,4}\b/i);
    const assignedToRole = inferAssignedRole(text);
    if (!idMatch || !assignedToRole) {
      return {
        route: { intent: 'TICKETS_QUERY', reason: 'ticket assignment command needs a ticket id/prefix and target role' },
        answer:
          `I can assign a ticket from chat, but I need the ticket ID or visible ID prefix and the target role.\n\n` +
          `Example: **Assign ticket abc123 to Maintenance Manager**.`,
        actions: buildChatActions({ role: req.user!.role, intent: 'TICKETS_QUERY', message, answer: 'assign ticket tickets' }),
        sources: { command: 'assign_ticket', persisted: false },
      };
    }
    const ticket = await prisma.ticket.findFirst({
      where: { tenantId: req.user!.tenantId, id: { startsWith: idMatch[0] } },
      select: { id: true, title: true },
    });
    if (!ticket) {
      return {
        route: { intent: 'TICKETS_QUERY', reason: 'ticket assignment command did not match a ticket' },
        answer: `I could not find a ticket starting with **${idMatch[0]}** in this tenant. Open Tickets and copy the ticket ID from the record.`,
        actions: buildChatActions({ role: req.user!.role, intent: 'TICKETS_QUERY', message, answer: 'tickets' }),
        sources: { command: 'assign_ticket', persisted: false },
      };
    }
    const updated = await baygrid.updateTicket(ticket.id, {
      assignedToRole,
      assignedToId: '',
      status: 'ASSIGNED',
      actorId: req.user!.userId,
    });
    return {
      route: { intent: 'TICKETS_QUERY', reason: 'persisted ticket assignment command' },
      answer: `Assigned **${ticket.title}** to **${assignedToRole.replace(/_/g, ' ')}** and moved it to **ASSIGNED**.`,
      actions: buildChatActions({ role: req.user!.role, intent: 'TICKETS_QUERY', message, answer: 'tickets audit assigned' }),
      sources: { command: 'assign_ticket', persisted: true, ticketId: updated.id, assignedToRole },
    };
  }

  if (wantsTicket) {
    const category = inferCategory(text);
    const assignedToRole = inferAssignedRole(text) || (req.user!.role === 'FACILITY_MANAGER' ? 'FACILITY_MANAGER' : undefined);
    const workflowStage = inferStage(text);
    const title = cleanTitle(text, category === 'ENVIRONMENT' ? 'Out-of-range environmental reading' : 'FM operational issue');
    const ticket = await baygrid.createTicket({
      title,
      description: `Created from role assistant chat by ${req.user!.email}. Original request: ${text}`,
      priority: inferPriority(text),
      category,
      ticketType: category === 'COMPLIANCE_APPROVAL' ? 'APPROVAL' : 'ISSUE',
      workflowStage,
      assignedToRole,
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
    });
    return {
      route: { intent: 'TICKETS_QUERY', reason: 'persisted ticket creation command' },
      answer:
        `Created ticket **${ticket.title}**.\n\n` +
        `- Priority: **${ticket.priority}**\n` +
        `- Category: **${ticket.category}**\n` +
        `- Assigned role: **${ticket.assignedToRole?.replace(/_/g, ' ') || 'auto-route / unassigned'}**\n` +
        `- Ticket ID: \`${ticket.id}\``,
      actions: buildChatActions({ role: req.user!.role, intent: 'TICKETS_QUERY', message, answer: 'tickets audit ticket created' }),
      sources: { command: 'create_ticket', persisted: true, ticketId: ticket.id },
    };
  }

  if (wantsTask) {
    const title = cleanTitle(text, /\bsop\b/i.test(text) ? 'SOP checklist reminder' : 'FM checklist reminder');
    const task = await tasks.createTask({
      title,
      assignedToId: req.user!.userId,
      assignerId: req.user!.userId,
      dueDate: parseDueDate(text),
      priority: inferPriority(text),
      category: /\bsop\b|\btraining\b/i.test(text) ? 'SAHPRA' : inferCategory(text),
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
    });
    return {
      route: { intent: 'OPS_QUESTION', reason: 'persisted task/reminder creation command' },
      answer:
        `Created reminder task **${task.title}** and assigned it to you.\n\n` +
        `- Priority: **${task.priority}**\n` +
        `- Due: **${task.dueDate ? task.dueDate.toISOString().slice(0, 10) : 'not set'}**\n` +
        `- Task ID: \`${task.id}\``,
      actions: buildChatActions({ role: req.user!.role, intent: 'OPS_QUESTION', message, answer: 'tasks checklist sop reminders audit' }),
      sources: { command: 'create_task_reminder', persisted: true, taskId: task.id },
    };
  }

  return null;
}

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body ?? {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message required' });
    }

    const realUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { name: true, role: true },
    });

    const commandResult = await tryHandlePersistedChatCommand(req, message);
    if (commandResult) {
      return res.json({ success: true, ...commandResult });
    }

    // 1. Maestro classifies
    const route = await routeIntent(message, req.user!.role, req.user!.tenantId);

    // 2. Dispatch
    let answer = '';
    let extra: Record<string, any> = {};
    let actions: ChatAction[] = [];

    switch (route.intent) {
      case 'OWNER_BRIEF': {
        // Only owners can pull the brief. Others get a polite redirect.
        if (req.user!.role !== 'TENANT_ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
          answer = `The morning brief is reserved for Super Admin and Tenant Admin users. I can still answer from your role workspace if you ask about your queue, tasks, SOPs, tickets, batches, labels, or evidence.`;
          actions = buildChatActions({ role: req.user!.role, intent: route.intent, message, answer });
          break;
        }
        const brief = await generateOwnerBrief(req.user!.tenantId);
        answer = brief.brief;
        extra = { briefThinking: brief.thinkingSummary, briefGeneratedAt: brief.generatedAt };
        actions = buildChatActions({ role: req.user!.role, intent: route.intent, message, answer });
        break;
      }

      case 'SMF_COMPOSE': {
        // We don't auto-trigger Composer from chat (it needs a confirmed sectionId
        // and the RP's review on the SMF page). We point them to the right place.
        const sectionRef = route.sectionId ?? '(specify the section ID)';
        answer =
          `To draft or re-draft an SMF section with AI, please:\n\n` +
          `1. Open **Site Master File** (sidebar → Compliance → Site Master File)\n` +
          `2. Find section **${sectionRef}** in its chapter\n` +
          `3. Click the section, then **"Draft with AI"** in the modal\n\n` +
          `The Composer (Opus 4.7) takes ~15 seconds. You'll see the AI draft in an amber-bordered card with **Apply** / **Discard** buttons.`;
        actions = buildChatActions({ role: req.user!.role, intent: route.intent, message, answer });
        break;
      }

      case 'HUMAN_HANDOFF': {
        answer =
          `That's outside my scope. Try one of these humans:\n\n` +
          `- **People & HR** → Loraine\n` +
          `- **Cultivation calls** → Lourens (Head of Cultivation) or Renae (Facility Manager)\n` +
          `- **Compliance / sign-offs** → Berne (Responsible Pharmacist)\n` +
          `- **Owner-level decisions** → Ilse or Coenie\n` +
          `- **Anything IT-related** → Calvin\n` +
          `- **Platform issues** → Flo`;
        actions = buildChatActions({ role: req.user!.role, intent: route.intent, message, answer });
        break;
      }

      // SMF_QUERY, TICKETS_QUERY, OPS_QUESTION all flow to the general ops agent
      case 'SMF_QUERY':
      case 'TICKETS_QUERY':
      case 'OPS_QUESTION':
      default: {
        const result = await answerOpsQuestion({
          message,
          role: req.user!.role,
          realUserName: realUser?.name ?? null,
          tenantId: req.user!.tenantId,
          intent: route.intent,
        });
        answer = result.answer;
        actions = result.actions;
        extra = { usage: result.usage, sources: result.sources };
        break;
      }
    }

    res.json({
      success: true,
      route,
      answer,
      actions,
      ...extra,
    });
  } catch (err: any) {
    console.error('[Chat] failed:', err);
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

export default router;
