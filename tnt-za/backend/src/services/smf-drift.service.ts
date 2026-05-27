import { prisma } from '../config/db';
import { eventBus } from './eventBus';

// =====================================================================
// SMF Drift Daemon — deterministic v1
//
// Subscribes to TnT-ZA domain events. When an event is one that COULD
// invalidate a signed SMF section (e.g. new greenhouse → C.3.1 floor
// plan stale), the daemon:
//   1. Looks up affected sections that are currently signed (status != DRAFT)
//   2. Marks each as stale (staleSince + staleReason)
//   3. Raises a Ticket of type SMF_DRIFT routed to RP for re-sign
//
// Idempotent — won't double-mark a section, won't double-ticket.
//
// AI Composer (#75 Sonnet 4.6 / Opus 4.7) layers on top later: when
// drift is detected, it auto-drafts the new section text for human review.
// =====================================================================

interface DriftRule {
  /** Event type emitted via eventBus */
  eventType: string;
  /** SMF sectionIds that may need re-signing when this event fires */
  affectedSections: string[];
  /** Human-readable explanation written to the staleReason + ticket */
  reason: (event: any) => string;
  /** Optional priority override (defaults to MEDIUM) */
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const RULES: DriftRule[] = [
  // ── Premises (C.3) ─────────────────────────────────────────────
  {
    eventType: 'GREENHOUSE_CREATED',
    affectedSections: ['C.3.1', 'C.1.6', 'C.1.6.2'],
    reason: () => 'New greenhouse added — floor plan + site description need re-review',
    priority: 'HIGH',
  },
  {
    eventType: 'GREENHOUSE_UPDATED',
    affectedSections: ['C.3.1', 'C.1.6.2'],
    reason: () => 'Greenhouse layout updated — verify floor plan + room sizes',
  },
  {
    eventType: 'GREENHOUSE_DELETED',
    affectedSections: ['C.3.1', 'C.1.6'],
    reason: () => 'Greenhouse removed — floor plan + site description need refresh',
    priority: 'HIGH',
  },
  {
    eventType: 'GREENHOUSE_ARCHIVED',
    affectedSections: ['C.3.1'],
    reason: () => 'Greenhouse archived — floor plan no longer current',
  },
  {
    eventType: 'BAY_ALLOCATED',
    affectedSections: ['C.3.1'],
    reason: (e: any) => `Bay allocated (${e.entityId ?? '?'}) — bay-level layout shift`,
  },

  // ── Equipment (C.3.7 / C.3.6) ─────────────────────────────────
  {
    eventType: 'ASSET_CREATED',
    affectedSections: ['C.3.7'],
    reason: (e: any) => `New asset registered (${e.entityId ?? '?'}) — equipment register stale`,
  },

  // ── Documentation (C.4) ──────────────────────────────────────
  {
    eventType: 'SOP_CREATED',
    affectedSections: ['C.4.1', 'C.4.2'],
    reason: (e: any) => `New SOP created (${e.entityId ?? '?'}) — documentation register out of date`,
  },
  {
    eventType: 'SOP_UPDATED',
    affectedSections: ['C.4.1'],
    reason: (e: any) => `SOP revised (${e.entityId ?? '?'}) — confirm distribution + re-train where needed`,
  },

  // ── Quality system (C.1.9 / C.6.1) ──────────────────────────
  {
    eventType: 'DEVIATION_RAISED',
    affectedSections: ['C.1.9.5', 'C.6.1'],
    reason: (e: any) => `Deviation raised (${e.entityId ?? '?'}) — quality review process touched`,
    priority: 'HIGH',
  },
  {
    eventType: 'ANOMALY_DETECTED',
    affectedSections: ['C.1.9.4', 'C.1.9.5'],
    reason: (e: any) => `Anomaly detected — audit + review programmes need RP attention`,
    priority: 'HIGH',
  },
  {
    eventType: 'BATCH_QUARANTINED',
    affectedSections: ['C.5.4', 'C.6.1'],
    reason: (e: any) => `Batch quarantined (${e.entityId ?? '?'}) — reject-materials handling + QC active`,
    priority: 'HIGH',
  },
  {
    eventType: 'DESTRUCTION_RECORDED',
    affectedSections: ['C.5.4'],
    reason: (e: any) => `Destruction recorded — reject-materials process triggered`,
  },
  {
    eventType: 'COA_REVOKED',
    affectedSections: ['C.6.1', 'C.5.5'],
    reason: (e: any) => `COA revoked (${e.entityId ?? '?'}) — QC + validation policy implications`,
    priority: 'CRITICAL',
  },

  // ── Licensing (C.1.2) ─────────────────────────────────────────
  {
    eventType: 'PERMIT_EXPIRING',
    affectedSections: ['C.1.2'],
    reason: (e: any) => `Permit nearing expiry — licensing section may need update or renewal note`,
    priority: 'CRITICAL',
  },
  {
    eventType: 'QUOTA_UPDATED',
    affectedSections: ['C.1.5'],
    reason: () => 'Quota updated — manufactured-products scope may have shifted',
  },

  // ── Personnel (C.1.7 / C.2) ───────────────────────────────────
  // (No explicit USER_INVITED event today; when one is added, it slots in here.)

  // ── Onboarding kickoff — recheck everything ─────────────────
  {
    eventType: 'ONBOARDING_FACILITY',
    affectedSections: ['C.1.4', 'C.1.6', 'C.3.1'],
    reason: () => 'Facility onboarding complete — confirm address, description, and floor plan match new state',
    priority: 'HIGH',
  },
];

// Build a fast lookup
const RULES_BY_EVENT = RULES.reduce((m, r) => {
  (m[r.eventType] ||= []).push(r);
  return m;
}, {} as Record<string, DriftRule[]>);

async function findRpUserId(tenantId: string): Promise<string | null> {
  const rp = await prisma.user.findFirst({
    where: { tenantId, role: 'RESPONSIBLE_PHARMACIST', active: true },
    select: { id: true },
  });
  return rp?.id ?? null;
}

eventBus.on('*', async (event: any) => {
  const rules = RULES_BY_EVENT[event?.type];
  if (!rules || !event.tenantId) return;

  for (const rule of rules) {
    for (const sectionRef of rule.affectedSections) {
      try {
        // Only signed sections can drift — drafts have no chain to invalidate
        const section = await prisma.sMFSection.findFirst({
          where: {
            tenantId: event.tenantId,
            sectionId: sectionRef,
            status: { not: 'DRAFT' },
          },
        });
        if (!section) continue;

        const reason = rule.reason(event);

        // Mark stale (only if not already)
        if (!section.staleSince) {
          await prisma.sMFSection.update({
            where: { id: section.id },
            data: { staleSince: new Date(), staleReason: reason },
          });
        }

        // Raise an SMF_DRIFT ticket if no open one exists for this section
        const existing = await prisma.ticket.findFirst({
          where: {
            tenantId: event.tenantId,
            ticketType: 'SMF_DRIFT',
            category: 'SMF_DRIFT',
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            title: { contains: sectionRef },
          },
        });
        if (existing) continue;

        const rpUserId = await findRpUserId(event.tenantId);
        await prisma.ticket.create({
          data: {
            tenantId: event.tenantId,
            title: `SMF ${sectionRef} stale — ${section.title.slice(0, 60)}`,
            description:
              `Site Master File section ${sectionRef} (${section.title}) has been flagged stale by the Drift Daemon.\n\n` +
              `Triggering event: ${event.type}\n` +
              `Reason: ${reason}\n\n` +
              `Action: Responsible Pharmacist to review section content, edit if needed, then re-sign. ` +
              `Sign-off chain (RP → DAR → AR) will re-run.`,
            priority: rule.priority ?? 'MEDIUM',
            ticketType: 'SMF_DRIFT',
            category: 'SMF_DRIFT',
            workflowStage: 'FACILITY',
            assignedToRole: 'RESPONSIBLE_PHARMACIST',
            reportedById: event.userId ?? rpUserId ?? section.id, // event actor; fall back to RP
          },
        });
      } catch (err) {
        // Daemon must never throw — events are fire-and-forget
        console.error('[SMF Drift] rule processing failed:', err);
      }
    }
  }
});

console.log('[SMF Drift] daemon armed — listening to', RULES.length, 'event rules');
