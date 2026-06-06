import { prisma } from '../config/db';
import { eventBus } from './eventBus';
import { evaluate } from './driver.service';

const TICK_MS = 15 * 60 * 1000; // 15 min
let running = false;

async function evaluateAllTenants(reason: string) {
  if (running) return; // never overlap
  running = true;
  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const t of tenants) {
      try {
        const r = await evaluate(t.id);
        console.log(`[driver] ${reason} tenant=${t.id} upserted=${r.upserted}`);
      } catch (e: any) {
        console.error(`[driver] evaluate failed tenant=${t.id}:`, e.message);
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
  // scheduled heartbeat
  setInterval(() => evaluateAllTenants('tick'), TICK_MS);
  // run once on boot
  evaluateAllTenants('boot');
  console.log('[driver] started — 15m tick + event listeners');
}
