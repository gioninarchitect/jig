import { prisma } from '../config/db';
import { eventBus } from './eventBus';
import { evaluate } from './driver.service';
import { escalateStaleTickets } from './smart-tickets.service';
import { runIntegrityCheck, getActiveTenantIds } from './integrity.service';

const TICK_MS = 15 * 60 * 1000; // 15 min
let running = false;

// Heartbeat liveness — surfaced on /health/full so a stalled Driver is visible.
let lastRun: { at: string; reason: string; tenantsProcessed: number } | null = null;
export function getDriverHealth() {
  const stale = lastRun ? (Date.now() - new Date(lastRun.at).getTime()) > 2 * TICK_MS : true;
  return { lastRun, tickMs: TICK_MS, stale };
}

async function evaluateAllTenants(reason: string) {
  if (running) return; // never overlap
  running = true;
  try {
    // Tenant set derived from DATA (not just the Tenant table) so no data is
    // ever silently skipped because its tenant lacks a Tenant row. [W10.2]
    const tenantIds = await getActiveTenantIds();
    lastRun = { at: new Date().toISOString(), reason, tenantsProcessed: tenantIds.length };
    for (const tid of tenantIds) {
      const t = { id: tid };
      try {
        const r = await evaluate(t.id);
        console.log(`[driver] ${reason} tenant=${t.id} upserted=${r.upserted}`);
      } catch (e: any) {
        console.error(`[driver] evaluate failed tenant=${t.id}:`, e.message);
      }
      // SLA guardrail — overdue tickets escalate (4h→HIGH, 24h→CRITICAL+FM).
      try {
        const esc = await escalateStaleTickets(t.id);
        if (esc.escalated) console.log(`[driver] ${reason} tenant=${t.id} escalated=${esc.escalated}`);
      } catch (e: any) {
        console.error(`[driver] escalate failed tenant=${t.id}:`, e.message);
      }
    }
  } finally {
    running = false;
  }
}

export function startDriver() {
  // event-triggered (debounced): re-evaluate shortly after key domain events
  let debounce: NodeJS.Timeout | null = null;
  const trigger = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => evaluateAllTenants('event'), 5000);
  };
  ['ANOMALY_RESOLVED', 'TASK_CREATED', 'TASK_COMPLETED', 'SOP_GOVERNANCE_SYNCED', 'BATCH_QUARANTINED']
    .forEach((evt) => eventBus.on(evt, trigger));
  // scheduled heartbeat (+ data-integrity self-check)
  setInterval(() => { runIntegrityCheck('tick'); evaluateAllTenants('tick'); }, TICK_MS);
  // run once on boot
  evaluateAllTenants('boot');
  console.log('[driver] started — 15m tick + event listeners');
}
