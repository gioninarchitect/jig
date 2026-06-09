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

/**
 * For each active grow schedule in a tenant, create a ticket for today's
 * calendar task(s) if one doesn't already exist. Returns how many were created.
 */
export async function syncCalendarTickets(tenantId: string, dateISO = todayISO()) {
  const schedules = await prisma.growSchedule.findMany({
    where: { tenantId, status: 'ACTIVE' },
  });

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

      const ipm = entry.ipmApplication
        ? `\nIPM: ${entry.ipmApplication}${entry.dosage ? ` (${entry.dosage})` : ''}`
        : '';
      const description =
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
