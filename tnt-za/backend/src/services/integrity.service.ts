import { prisma } from '../config/db';
import { eventBus } from './eventBus';

// ─────────────────────────────────────────────────────────────────────────────
// Data-integrity self-check.
//
// The class of bug that bit us: 191 rows were orphaned under a tenantId with no
// Tenant row — invisible to every role and untouched by tenant-scoped automation,
// caught only by accident. This asserts that NEVER silently happens again: on
// boot and on the heartbeat it scans every tenantId table for rows whose tenant
// has no Tenant row, and screams if it finds any.
// ─────────────────────────────────────────────────────────────────────────────

export interface IntegrityResult {
  ok: boolean;
  orphanTenants: { table: string; count: number }[];
  checkedTables: number;
  ranAt: string;
}

let last: IntegrityResult | null = null;
export function lastIntegrity(): IntegrityResult | null { return last; }

export async function checkIntegrity(): Promise<IntegrityResult> {
  const orphanTenants: { table: string; count: number }[] = [];
  let checkedTables = 0;

  // Every table that carries a tenantId.
  const cols = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.columns
     WHERE column_name = 'tenantId' AND table_schema = 'public'
     ORDER BY table_name`,
  );

  for (const c of cols) {
    const tbl = c.table_name;
    checkedTables++;
    const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM "${tbl}" x
       WHERE x."tenantId" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t.id = x."tenantId")`,
    );
    const n = Number(rows[0]?.n || 0);
    if (n > 0) orphanTenants.push({ table: tbl, count: n });
  }

  const result: IntegrityResult = {
    ok: orphanTenants.length === 0,
    orphanTenants,
    checkedTables,
    // new Date() is unavailable in some sandboxes but fine in the running server.
    ranAt: new Date().toISOString(),
  };
  last = result;
  return result;
}

/**
 * Tenant set for automation — the UNION of Tenant rows AND distinct tenantIds
 * actually present in operational data. This means no data is ever silently
 * skipped because its tenant lacks a Tenant row (the orphan bug). Always
 * includes every registered Tenant even if it has no data yet.
 */
export async function getActiveTenantIds(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Tenant"
     UNION SELECT DISTINCT "tenantId" FROM "Ticket"        WHERE "tenantId" IS NOT NULL
     UNION SELECT DISTINCT "tenantId" FROM "GrowSchedule"  WHERE "tenantId" IS NOT NULL
     UNION SELECT DISTINCT "tenantId" FROM "TaskTemplate"  WHERE "tenantId" IS NOT NULL
     UNION SELECT DISTINCT "tenantId" FROM "TrainingRecord" WHERE "tenantId" IS NOT NULL`,
  );
  return rows.map((r) => r.id).filter(Boolean);
}

export async function runIntegrityCheck(reason = 'boot'): Promise<IntegrityResult> {
  try {
    const r = await checkIntegrity();
    if (r.ok) {
      console.log(`[integrity] ${reason} OK — ${r.checkedTables} tenant tables, no orphans`);
    } else {
      const detail = r.orphanTenants.map((o) => `${o.table}=${o.count}`).join(' ');
      console.error(`[integrity] ${reason} CRITICAL — orphan-tenant rows: ${detail}`);
      eventBus.emit('INTEGRITY_ALERT', {
        entityType: 'Integrity', entityId: 'orphan-tenant',
        metadata: { orphanTenants: r.orphanTenants },
      });
    }
    return r;
  } catch (e: any) {
    console.error('[integrity] check failed:', e.message);
    return { ok: false, orphanTenants: [], checkedTables: 0, ranAt: '' };
  }
}
