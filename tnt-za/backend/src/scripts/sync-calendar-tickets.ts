// One-off / cron-able runner for the calendar → ticket connector.
// Usage: npx tsx src/scripts/sync-calendar-tickets.ts [YYYY-MM-DD]
import { syncCalendarTicketsAllTenants } from '../services/calendar-tickets.service';

const dateArg = process.argv[2]; // optional YYYY-MM-DD; defaults to today

syncCalendarTicketsAllTenants(dateArg)
  .then((r) => {
    console.log(`[calendar-tickets] done — ${r.total} ticket(s) created`);
    process.exit(0);
  })
  .catch((e) => {
    console.error('[calendar-tickets] error:', e);
    process.exit(1);
  });
