import 'dotenv/config';
import http from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { ensureEuGmpRegistry } from '../services/eu-gmp-source.service';

const API_PORT = Number(process.env.PORT || 6000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const ROLE_LEVELS: Record<string, number> = {
  SUPER_ADMIN: 5,
  TENANT_ADMIN: 4,
  RESPONSIBLE_PHARMACIST: 4,
  FACILITY_MANAGER: 3,
  PROCESSING_MANAGER: 3,
  FACILITY_SUPERVISOR: 3,
  QA_INSPECTOR: 3,
  GMP_PARTNER: 3,
  MAINTENANCE_MANAGER: 3,
  HEAD_OF_CULTIVATION: 3,
  NURSERY_MANAGER: 3,
  CULTIVATOR: 2,
  LAB_TECH: 2,
  IRRIGATION_TECH: 2,
  IT_MANAGER: 2,
  PROCESSING_SUPERVISOR: 2,
  SECURITY_OFFICER: 1,
  DELIVERY_DRIVER: 1,
  TRIMMER: 1,
  GENERAL_WORKER: 1,
  HOUSEKEEPING: 1,
  LAUNDRY: 1,
  CLIENT: 0,
  VIEWER: 0,
};

const ROLE_ORDER = Object.keys(ROLE_LEVELS);

const CONTROL_DOMAINS = {
  LABELS: 'LABEL_LIFECYCLE_RECONCILIATION',
  BCR: 'BATCH_CULTIVATION_RECORD',
  TRAINING: 'SOP_BASED_TRAINING',
  MEDICALS: 'ANNUAL_MEDICAL_READINESS',
  VALIDATION: 'PROCESS_VALIDATION_SMART_FLAGS',
  SIGNATURES: 'ELECTRONIC_SIGNATURE_AUDIT_TRAIL',
  SMF: 'DIGITAL_SMF_INSPECTION_PACK',
} as const;

const ROLE_EXPECTATIONS: Record<string, { controls: string[]; categories: string[]; mustHaveRoutes: string[] }> = {
  SUPER_ADMIN: {
    controls: Object.values(CONTROL_DOMAINS),
    categories: [],
    mustHaveRoutes: ['/api/audit/verify', '/api/qms/eu-gmp-registry', '/api/site-master-file/sections'],
  },
  TENANT_ADMIN: {
    controls: [CONTROL_DOMAINS.SMF, CONTROL_DOMAINS.SIGNATURES, CONTROL_DOMAINS.TRAINING, CONTROL_DOMAINS.MEDICALS],
    categories: [],
    mustHaveRoutes: ['/api/concierge/brief', '/api/site-master-file/sections', '/api/qms/training-overview'],
  },
  RESPONSIBLE_PHARMACIST: {
    controls: [CONTROL_DOMAINS.SMF, CONTROL_DOMAINS.SIGNATURES, CONTROL_DOMAINS.BCR, CONTROL_DOMAINS.VALIDATION],
    categories: ['QA', 'QUARANTINE'],
    mustHaveRoutes: ['/api/site-master-file/sections', '/api/qms/deviations', '/api/audit?limit=3'],
  },
  FACILITY_MANAGER: {
    controls: [CONTROL_DOMAINS.LABELS, CONTROL_DOMAINS.BCR, CONTROL_DOMAINS.TRAINING, CONTROL_DOMAINS.MEDICALS, CONTROL_DOMAINS.VALIDATION],
    categories: ['SAHPRA', 'QUARANTINE', 'GENERAL'],
    mustHaveRoutes: ['/api/tasks/templates', '/api/qms/training-overview', '/api/labels'],
  },
  QA_INSPECTOR: {
    controls: [CONTROL_DOMAINS.LABELS, CONTROL_DOMAINS.BCR, CONTROL_DOMAINS.SIGNATURES, CONTROL_DOMAINS.VALIDATION],
    categories: ['SAHPRA', 'QA', 'QUARANTINE'],
    mustHaveRoutes: ['/api/qms/deviations', '/api/labels', '/api/audit?limit=3'],
  },
  HEAD_OF_CULTIVATION: {
    controls: [CONTROL_DOMAINS.BCR, CONTROL_DOMAINS.TRAINING, CONTROL_DOMAINS.VALIDATION],
    categories: ['SAHPRA', 'CULTIVATION', 'QUARANTINE'],
    mustHaveRoutes: ['/api/baygrid/greenhouses', '/api/mortality', '/api/tasks/templates'],
  },
  NURSERY_MANAGER: {
    controls: [CONTROL_DOMAINS.BCR, CONTROL_DOMAINS.TRAINING, CONTROL_DOMAINS.VALIDATION],
    categories: ['CULTIVATION'],
    mustHaveRoutes: ['/api/baygrid/mothers', '/api/baygrid/clone-trays', '/api/mortality'],
  },
  CULTIVATOR: {
    controls: [CONTROL_DOMAINS.BCR, CONTROL_DOMAINS.TRAINING],
    categories: ['CULTIVATION'],
    mustHaveRoutes: ['/api/tasks/templates', '/api/plants', '/api/daily-checks'],
  },
  IRRIGATION_TECH: {
    controls: [CONTROL_DOMAINS.BCR, CONTROL_DOMAINS.TRAINING],
    categories: ['CULTIVATION'],
    mustHaveRoutes: ['/api/feeding/records', '/api/env-log', '/api/tasks/templates'],
  },
  PROCESSING_MANAGER: {
    controls: [CONTROL_DOMAINS.BCR, CONTROL_DOMAINS.TRAINING, CONTROL_DOMAINS.VALIDATION],
    categories: ['SAHPRA', 'PROCESSING', 'QUARANTINE'],
    mustHaveRoutes: ['/api/batches', '/api/containers', '/api/trim'],
  },
  PROCESSING_SUPERVISOR: {
    controls: [CONTROL_DOMAINS.BCR, CONTROL_DOMAINS.TRAINING],
    categories: ['PROCESSING'],
    mustHaveRoutes: ['/api/containers', '/api/trim', '/api/tasks/templates'],
  },
  TRIMMER: {
    controls: [CONTROL_DOMAINS.BCR, CONTROL_DOMAINS.TRAINING],
    categories: ['PROCESSING'],
    mustHaveRoutes: ['/api/trim', '/api/tasks?mine=true'],
  },
  LAB_TECH: {
    controls: [CONTROL_DOMAINS.BCR, CONTROL_DOMAINS.TRAINING, CONTROL_DOMAINS.VALIDATION],
    categories: ['QA'],
    mustHaveRoutes: ['/api/lab/results?batchId=:firstBatchId', '/api/qms/deviations', '/api/tasks/templates'],
  },
  MAINTENANCE_MANAGER: {
    controls: [CONTROL_DOMAINS.VALIDATION, CONTROL_DOMAINS.TRAINING],
    categories: ['MAINTENANCE'],
    mustHaveRoutes: ['/api/assets', '/api/qms/equipment', '/api/tasks/templates'],
  },
  SECURITY_OFFICER: {
    controls: [CONTROL_DOMAINS.LABELS, CONTROL_DOMAINS.TRAINING, CONTROL_DOMAINS.SIGNATURES],
    categories: ['GENERAL'],
    mustHaveRoutes: ['/api/assets', '/api/tasks?mine=true', '/api/transport/manifests'],
  },
  HOUSEKEEPING: {
    controls: [CONTROL_DOMAINS.TRAINING, CONTROL_DOMAINS.VALIDATION],
    categories: ['CLEANING'],
    mustHaveRoutes: ['/api/cleaning-schedule', '/api/tasks?mine=true'],
  },
  LAUNDRY: {
    controls: [CONTROL_DOMAINS.TRAINING],
    categories: ['CLEANING'],
    mustHaveRoutes: ['/api/tasks?mine=true', '/api/hr/training'],
  },
  IT_MANAGER: {
    controls: [CONTROL_DOMAINS.SIGNATURES, CONTROL_DOMAINS.SMF],
    categories: ['GENERAL'],
    mustHaveRoutes: ['/api/auth/me', '/api/audit?limit=3'],
  },
  GMP_PARTNER: {
    controls: [CONTROL_DOMAINS.SMF, CONTROL_DOMAINS.SIGNATURES, CONTROL_DOMAINS.VALIDATION],
    categories: ['SAHPRA', 'QA'],
    mustHaveRoutes: ['/api/gmp/findings', '/api/gmp/observations', '/api/site-master-file/sections'],
  },
  VIEWER: {
    controls: [CONTROL_DOMAINS.SMF, CONTROL_DOMAINS.SIGNATURES],
    categories: [],
    mustHaveRoutes: ['/api/site-master-file/sections', '/api/audit?limit=3'],
  },
};

const ROUTES: Array<{ path: string; minLevel: number; role?: string }> = [
  { path: '/api/auth/me', minLevel: 0 },
  { path: '/api/tasks?mine=true', minLevel: 0 },
  { path: '/api/tasks/templates', minLevel: 2 },
  { path: '/api/qms/sops', minLevel: 0 },
  { path: '/api/qms/deviations', minLevel: 0 },
  { path: '/api/qms/training-overview', minLevel: 2 },
  { path: '/api/qms/eu-gmp-registry', minLevel: 0 },
  { path: '/api/site-master-file/sections', minLevel: 0 },
  { path: '/api/audit?limit=3', minLevel: 3 },
  { path: '/api/audit/verify', minLevel: 5, role: 'SUPER_ADMIN' },
  { path: '/api/labels', minLevel: 2 },
  { path: '/api/batches', minLevel: 0 },
  { path: '/api/containers', minLevel: 0 },
  { path: '/api/plants', minLevel: 0 },
  { path: '/api/baygrid/greenhouses', minLevel: 0 },
  { path: '/api/baygrid/mothers', minLevel: 0 },
  { path: '/api/baygrid/clone-trays', minLevel: 0 },
  { path: '/api/daily-checks', minLevel: 0 },
  { path: '/api/env-log', minLevel: 0 },
  { path: '/api/cleaning-schedule', minLevel: 0 },
  { path: '/api/feeding/records', minLevel: 0 },
  { path: '/api/mortality', minLevel: 0 },
  { path: '/api/trim', minLevel: 0 },
  { path: '/api/lab/results?batchId=:firstBatchId', minLevel: 0 },
  { path: '/api/assets', minLevel: 0 },
  { path: '/api/qms/equipment', minLevel: 0 },
  { path: '/api/transport/manifests', minLevel: 0 },
  { path: '/api/gmp/findings', minLevel: 0 },
  { path: '/api/gmp/observations', minLevel: 0 },
  { path: '/api/concierge/brief', minLevel: 4 },
];

function request(path: string, token: string): Promise<number> {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: API_PORT,
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

function makeToken(user: any) {
  return jwt.sign({
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    facilityId: user.facilityId,
  }, JWT_SECRET, { expiresIn: '1h' } as jwt.SignOptions);
}

function expectedAccess(role: string, route: { minLevel: number; role?: string }) {
  if (route.role) return role === route.role;
  return (ROLE_LEVELS[role] ?? -1) >= route.minLevel;
}

function statusLabel(status: number, shouldAccess: boolean) {
  const allowed = status >= 200 && status < 300;
  const denied = status === 401 || status === 403;
  if (shouldAccess && allowed) return 'PASS';
  if (!shouldAccess && denied) return 'PASS';
  if (status === 404) return 'WARN';
  return 'FAIL';
}

async function main() {
  await ensureEuGmpRegistry();

  const tenant = await prisma.tenant.findFirst({ where: { slug: 'ilco' } }) || await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found');

  const [
    users,
    templates,
    tasks,
    training,
    tickets,
    controls,
    sources,
    firstBatch,
  ] = await Promise.all([
    prisma.user.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: [{ role: 'asc' }, { name: 'asc' }] }),
    prisma.taskTemplate.findMany({ where: { tenantId: tenant.id, active: true } }),
    prisma.task.findMany({ where: { tenantId: tenant.id } }),
    prisma.trainingRecord.findMany({ where: { tenantId: tenant.id } }),
    prisma.ticket.findMany({ where: { tenantId: tenant.id } }),
    prisma.complianceControl.findMany({ where: { status: 'ACTIVE' }, include: { sources: { include: { source: true } } } }),
    prisma.complianceSource.findMany(),
    prisma.batch.findFirst({ where: { tenantId: tenant.id }, select: { id: true } }),
  ]);

  const roleRows = [];
  const routeRows = [];

  for (const role of ROLE_ORDER) {
    const roleUsers = users.filter(user => user.role === role);
    if (!roleUsers.length && !ROLE_EXPECTATIONS[role]) continue;

    const userIds = roleUsers.map(user => user.id);
    const expected = ROLE_EXPECTATIONS[role] || { controls: [], categories: [], mustHaveRoutes: [] };
    const roleTemplates = templates.filter(template => template.roleRequired === role);
    const roleTasks = tasks.filter(task => userIds.includes(task.assignedToId));
    const roleTraining = training.filter(record => userIds.includes(record.userId));
    const roleTickets = tickets.filter(ticket => ticket.assignedToRole === role || (ticket.assignedToId && userIds.includes(ticket.assignedToId)));
    const categoryCoverage = expected.categories.filter(category => roleTemplates.some(template => template.category === category));
    const missingCategories = expected.categories.filter(category => !categoryCoverage.includes(category));
    const missingControls = expected.controls.filter(controlId => !controls.some(control => control.controlId === controlId));
    const hasPendingTraining = roleTraining.some(record => record.status !== 'COMPLETED');
    const hasTemplates = expected.categories.length === 0 || missingCategories.length === 0;
    const status = !roleUsers.length || missingControls.length || !hasTemplates ? 'FAIL' : hasPendingTraining ? 'WARN' : 'PASS';

    roleRows.push({
      role,
      status,
      users: roleUsers.length,
      templates: roleTemplates.length,
      tasks: roleTasks.length,
      pendingTasks: roleTasks.filter(task => task.status !== 'COMPLETED').length,
      training: roleTraining.length,
      pendingTraining: roleTraining.filter(record => record.status !== 'COMPLETED').length,
      tickets: roleTickets.length,
      missingCategories,
      missingControls,
    });

    if (roleUsers.length) {
      const token = makeToken(roleUsers[0]);
      for (const route of ROUTES) {
        if (!expected.mustHaveRoutes.includes(route.path)) continue;
        const path = route.path.replace(':firstBatchId', firstBatch?.id || 'NO_BATCH_FOUND');
        const statusCode = await request(path, token);
        routeRows.push({
          role,
          route: path,
          statusCode,
          expected: expectedAccess(role, route) ? 'allow' : 'deny',
          result: statusLabel(statusCode, expectedAccess(role, route)),
        });
      }
    }
  }

  const failedRoles = roleRows.filter(row => row.status === 'FAIL');
  const warningRoles = roleRows.filter(row => row.status === 'WARN');
  const failedRoutes = routeRows.filter(row => row.result === 'FAIL');
  const warningRoutes = routeRows.filter(row => row.result === 'WARN');

  console.log('# TnT-ZA EU GMP Role Task Review');
  console.log(`\nTenant: ${tenant.name}`);
  console.log('Grounding source: EU GMP Volume 4 official European Commission registry');
  console.log(`EU GMP sources loaded: ${sources.length}`);
  console.log(`EU GMP controls loaded: ${controls.length}`);
  console.log(`Active users reviewed: ${users.length}`);
  console.log(`Task templates reviewed: ${templates.length}`);
  console.log(`Training records reviewed: ${training.length}`);
  console.log(`Tickets reviewed: ${tickets.length}`);
  console.log(`\nOverall: ${failedRoles.length || failedRoutes.length ? 'FAIL' : warningRoles.length || warningRoutes.length ? 'WARN' : 'PASS'}`);

  console.log('\n## Role Coverage');
  console.log('| Role | Result | Users | Templates | Tasks | Pending Tasks | Training | Pending Training | Tickets | Gaps |');
  console.log('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const row of roleRows) {
    const gaps = [
      row.missingCategories.length ? `Missing categories: ${row.missingCategories.join(', ')}` : '',
      row.missingControls.length ? `Missing controls: ${row.missingControls.join(', ')}` : '',
      !row.users ? 'No active user' : '',
    ].filter(Boolean).join('; ') || 'None';
    console.log(`| ${row.role} | ${row.status} | ${row.users} | ${row.templates} | ${row.tasks} | ${row.pendingTasks} | ${row.training} | ${row.pendingTraining} | ${row.tickets} | ${gaps} |`);
  }

  console.log('\n## Route Checks');
  console.log('| Role | Route | Expected | HTTP | Result |');
  console.log('| --- | --- | --- | ---: | --- |');
  for (const row of routeRows) {
    console.log(`| ${row.role} | ${row.route} | ${row.expected} | ${row.statusCode} | ${row.result} |`);
  }

  console.log('\n## Production Blockers');
  const blockers = [
    ...failedRoles.map(row => `${row.role}: ${row.missingCategories.length ? `missing task categories ${row.missingCategories.join(', ')}` : 'role coverage failed'}`),
    ...failedRoutes.map(row => `${row.role}: ${row.route} returned HTTP ${row.statusCode}, expected ${row.expected}`),
  ];
  if (!blockers.length) {
    console.log('- None found by this automated role/task review.');
  } else {
    blockers.forEach(blocker => console.log(`- ${blocker}`));
  }

  console.log('\n## Warnings');
  const warnings = [
    ...warningRoles.map(row => `${row.role}: ${row.pendingTraining} pending/non-completed training records`),
    ...warningRoutes.map(row => `${row.role}: ${row.route} returned HTTP ${row.statusCode}`),
  ];
  if (!warnings.length) {
    console.log('- None.');
  } else {
    warnings.forEach(warning => console.log(`- ${warning}`));
  }

  await prisma.$disconnect();
  process.exit(blockers.length ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
