import { runUncollectedExpiry } from './pharmacy-core.service';

let lastRunKey = '';

export function startOriginRetailScheduler(): void {
  console.log('[OriginRetail] Scheduler started');

  setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    const key = now.toISOString().slice(0, 10);
    const targetHour = Number(process.env.ORIGIN_RETAIL_EXPIRY_JOB_HOUR || 0);

    if (hour !== targetHour || lastRunKey === key) return;
    lastRunKey = key;

    runUncollectedExpiry({ actorType: 'system', actorId: 'origin-retail-expiry-job' })
      .then((results) => {
        console.log(`[OriginRetail] 21-day expiry job completed: ${results.length} order(s) expired`);
      })
      .catch((err) => {
        console.error('[OriginRetail] 21-day expiry job failed:', (err as Error).message);
      });
  }, 15 * 60 * 1000);
}
