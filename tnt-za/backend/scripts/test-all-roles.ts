/**
 * TnT-ZA Full Role + Endpoint Test
 * Run: cd backend && npx tsx scripts/test-all-roles.ts
 * Requires: backend running on port 6000
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import http from 'http';

const PORT = 6000;
const prisma = new PrismaClient();

const ROLES_ORDER = ['SUPER_ADMIN', 'TENANT_ADMIN', 'FACILITY_MANAGER', 'CULTIVATOR', 'LAB_TECH', 'SECURITY_OFFICER', 'VIEWER'];
const LEVELS: Record<string, number> = { SUPER_ADMIN: 5, TENANT_ADMIN: 4, FACILITY_MANAGER: 3, CULTIVATOR: 2, LAB_TECH: 2, SECURITY_OFFICER: 1, VIEWER: 0 };

const ENDPOINTS: [string, string, number][] = [
  ['GET', '/api/auth/me', 0],
  ['GET', '/api/world-model/state', 0],
  ['GET', '/api/world-model/risk', 0],
  ['GET', '/api/world-model/inferences', 0],
  ['GET', '/api/plants?limit=3', 0],
  ['GET', '/api/plants/stats', 0],
  ['GET', '/api/containers', 0],
  ['GET', '/api/batches', 0],
  ['GET', '/api/facilities', 0],
  ['GET', '/api/notifications', 0],
  ['GET', '/api/transport/manifests', 0],
  ['GET', '/api/qms/sops', 0],
  ['GET', '/api/qms/deviations', 0],
  ['GET', '/api/qms/equipment', 0],
  ['GET', '/api/compliance/destruction', 1],
  ['GET', '/api/audit?limit=5', 3],
  ['GET', '/api/anomalies?resolved=false', 3],
];

function httpGet(path: string, token: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port: PORT, path, method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode!, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode!, body: null }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║       TnT-ZA ROLE x ENDPOINT TEST MATRIX          ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // Verify server is up
  try {
    const h = await httpGet('/api/health', '');
    console.log(`Server: ${h.body?.status || 'unknown'}\n`);
  } catch {
    console.error('Backend not running on port 6000. Start it first: npm run dev');
    process.exit(1);
  }

  const users = await prisma.user.findMany();
  const sorted = ROLES_ORDER.map(r => users.find(u => u.role === r)!).filter(Boolean);

  const tokens: Record<string, string> = {};
  for (const u of sorted) {
    tokens[u.role] = jwt.sign(
      { userId: u.id, email: u.email, role: u.role, tenantId: u.tenantId, facilityId: u.facilityId },
      process.env.JWT_SECRET || 'dev-secret-change-in-production',
      { expiresIn: '1h' } as jwt.SignOptions,
    );
  }

  let passed = 0, failed = 0, total = 0;
  const failures: string[] = [];
  const matrix: string[][] = [];

  for (const [method, path, minLevel] of ENDPOINTS) {
    const row: string[] = [];
    for (const u of sorted) {
      total++;
      const shouldAccess = (LEVELS[u.role] ?? 0) >= minLevel;

      try {
        const { status, body } = await httpGet(path, tokens[u.role]);
        const gotAccess = status === 200 || status === 201;
        const gotDenied = status === 403 || status === 401;

        if ((shouldAccess && gotAccess) || (!shouldAccess && gotDenied)) {
          passed++;
          row.push(gotAccess ? ' \x1b[32m✓\x1b[0m ' : ' \x1b[90m-\x1b[0m ');
        } else {
          failed++;
          row.push(`\x1b[31m${status}\x1b[0m`);
          failures.push(`${u.role} ${method} ${path.split('?')[0]} -> ${status} (expected ${shouldAccess ? '2xx' : '403'})`);
        }
      } catch (err: any) {
        failed++;
        row.push(' \x1b[31mE\x1b[0m ');
        failures.push(`${u.role} ${method} ${path.split('?')[0]} -> ERROR`);
      }
    }
    matrix.push(row);
  }

  // Print matrix
  const hdr = ROLES_ORDER.map(r => r.substring(0, 5).padEnd(6)).join('|');
  console.log(`${'ENDPOINT'.padEnd(35)}|${hdr}`);
  console.log('-'.repeat(35) + '+' + '------+'.repeat(6) + '------');

  ENDPOINTS.forEach(([m, p], i) => {
    const label = `${m} ${p.split('?')[0]}`.padEnd(35);
    console.log(`${label}|${matrix[i].map(c => c.padEnd(6)).join('|')}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`  ${passed} passed  ${failed} failed  ${total} total`);
  if (failures.length) {
    console.log('\n  FAILURES:');
    failures.forEach(f => console.log(`    x ${f}`));
  } else {
    console.log('\n  ALL TESTS PASSED ✓');
  }
  console.log('');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
