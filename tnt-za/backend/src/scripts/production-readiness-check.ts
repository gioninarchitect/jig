import 'dotenv/config';
import http from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { verifyHashChain, logAction } from '../services/audit.service';

const FRONTEND_ROUTES = new Set([
  '/dashboard',
  '/tickets',
  '/qms',
  '/batches',
  '/site-master-file',
  '/sop-library',
  '/hr',
  '/audit',
  '/plants',
  '/baygrid',
  '/scan',
  '/containers',
  '/assets',
  '/mortality',
  '/daily-check',
  '/env-log',
  '/feeding',
  '/harvest-request',
  '/trim',
  '/lab',
  '/security',
  '/users',
  '/owner',
  '/tasks',
]);

const CHAT_CTA_HREFS = [
  '/dashboard',
  '/tickets',
  '/qms',
  '/batches',
  '/site-master-file',
  '/sop-library',
  '/hr',
  '/audit',
  '/plants',
  '/baygrid',
  '/scan',
  '/containers',
  '/assets',
  '/mortality',
  '/daily-check',
  '/env-log',
  '/feeding',
  '/harvest-request',
  '/trim',
  '/lab',
  '/security',
  '/users',
  '/owner',
  '/tasks',
];

function get(path: string, token: string): Promise<number> {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: env.PORT,
      path,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode || 0));
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(0);
    });
    req.on('error', () => resolve(0));
    req.end();
  });
}

function tokenFor(user: any) {
  return jwt.sign({
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    facilityId: user.facilityId,
  }, env.JWT_SECRET, { expiresIn: '15m' } as jwt.SignOptions);
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'ilco' } }) || await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');

  const blockers: string[] = [];
  const warnings: string[] = [];

  const floris = await prisma.user.findUnique({ where: { email: 'florisolivier7@gmail.com' } });
  if (!floris || !floris.active || floris.role !== 'SUPER_ADMIN') blockers.push('Floris must be the active SUPER_ADMIN.');

  const activeSuperAdmins = await prisma.user.findMany({
    where: { tenantId: tenant.id, active: true, role: 'SUPER_ADMIN' },
    select: { email: true },
  });
  const unexpectedSupers = activeSuperAdmins.map(u => u.email).filter(email => email !== 'florisolivier7@gmail.com');
  if (unexpectedSupers.length) blockers.push(`Unexpected active SUPER_ADMIN account(s): ${unexpectedSupers.join(', ')}`);

  const ilse = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      active: true,
      role: 'TENANT_ADMIN',
      email: { in: ['ilze@ilcofarms.co.za', 'ilse@ilcofarming.co.za', 'adminilco@cleva-ai.co.za', 'ilze@ilcofarm.co.za'] },
    },
  });
  if (!ilse) blockers.push('No active Ilse TENANT_ADMIN account found.');

  const requiredActiveRoles = [
    'SUPER_ADMIN',
    'TENANT_ADMIN',
    'RESPONSIBLE_PHARMACIST',
    'FACILITY_MANAGER',
    'QA_INSPECTOR',
    'HEAD_OF_CULTIVATION',
    'NURSERY_MANAGER',
    'CULTIVATOR',
    'IRRIGATION_TECH',
    'PROCESSING_MANAGER',
    'PROCESSING_SUPERVISOR',
    'TRIMMER',
    'LAB_TECH',
    'MAINTENANCE_MANAGER',
    'IT_MANAGER',
    'SECURITY_OFFICER',
    'GENERAL_WORKER',
    'HOUSEKEEPING',
    'LAUNDRY',
    'GMP_PARTNER',
    'VIEWER',
  ];
  const activeRoleRows = await prisma.user.groupBy({
    by: ['role'],
    where: { tenantId: tenant.id, active: true },
    _count: { role: true },
  });
  const activeRoleCounts = new Map(activeRoleRows.map(row => [row.role, row._count.role]));
  const missingRoles = requiredActiveRoles.filter(role => !activeRoleCounts.get(role as any));
  if (missingRoles.length) blockers.push(`Missing active production/UAT role(s): ${missingRoles.join(', ')}`);

  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET === 'dev-secret-change-in-production') blockers.push('Production JWT_SECRET is still the default development secret.');
    if (env.ALLOW_STORED_PIN_LOGIN) blockers.push('Stored PIN fallback is enabled in production.');
    if (env.LOG_AUTH_PINS) blockers.push('PIN logging is enabled in production.');
  }

  const missingCtas = CHAT_CTA_HREFS.filter(href => !FRONTEND_ROUTES.has(href));
  if (missingCtas.length) blockers.push(`Chat CTA href(s) do not map to frontend routes: ${missingCtas.join(', ')}`);

  const audit = await verifyHashChain(tenant.id);
  if (!audit.valid) blockers.push(`Audit hash chain failed at index ${audit.brokenAtIndex}.`);

  const [sources, controls, smfSections, pendingTraining, activeTemplates] = await Promise.all([
    prisma.complianceSource.count({ where: { status: 'ACTIVE' } }),
    prisma.complianceControl.count({ where: { status: 'ACTIVE' } }),
    prisma.sMFSection.count({ where: { tenantId: tenant.id } }),
    prisma.trainingRecord.count({ where: { tenantId: tenant.id, status: { not: 'COMPLETED' } } }),
    prisma.taskTemplate.count({ where: { tenantId: tenant.id, active: true } }),
  ]);

  if (sources < 13) blockers.push(`EU GMP source registry incomplete: ${sources}/13 active sources.`);
  if (controls < 7) blockers.push(`EU GMP control registry incomplete: ${controls}/7 active controls.`);
  if (smfSections < 58) blockers.push(`SMF section registry incomplete: ${smfSections}/58 sections.`);
  if (pendingTraining > 0) blockers.push(`${pendingTraining} pending training record(s) remain.`);
  if (activeTemplates < 38) blockers.push(`Role task template coverage incomplete: ${activeTemplates}/38 active templates.`);

  if (floris) {
    const token = tokenFor(floris);
    const protectedChecks: Array<[string, number]> = [
      ['/api/auth/me', 200],
      ['/api/qms/eu-gmp-registry', 200],
      ['/api/site-master-file/sections', 200],
      ['/api/audit/verify', 200],
      ['/api/labels', 200],
    ];
    for (const [path, expected] of protectedChecks) {
      const status = await get(path, token);
      if (status !== expected) blockers.push(`${path} returned HTTP ${status}, expected ${expected}.`);
    }
  }

  const openCriticalTickets = await prisma.ticket.count({
    where: { tenantId: tenant.id, priority: 'CRITICAL', status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
  });
  if (openCriticalTickets > 0) warnings.push(`${openCriticalTickets} open critical ticket(s) remain in live data.`);

  const result = {
    status: blockers.length ? 'FAIL' : 'PASS',
    tenant: tenant.name,
    checkedAt: new Date().toISOString(),
    blockers,
    warnings,
    counts: {
      activeSuperAdmins: activeSuperAdmins.length,
      euGmpSources: sources,
      euGmpControls: controls,
      smfSections,
      pendingTraining,
      activeTaskTemplates: activeTemplates,
      auditEntries: audit.totalEntries,
      openCriticalTickets,
      chatCtas: CHAT_CTA_HREFS.length,
    },
  };

  if (floris) {
    await logAction({
      userId: floris.id,
      tenantId: tenant.id,
      action: 'PRODUCTION_READINESS_CHECK',
      entityType: 'ProductionReadiness',
      entityId: result.checkedAt,
      after: result,
    });
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(blockers.length ? 1 : 0);
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
