import { Router } from 'express';
import authRoutes from './auth.routes';
import plantRoutes from './plant.routes';
import containerRoutes from './container.routes';
import batchRoutes from './batch.routes';
import labRoutes from './lab.routes';
import coaRoutes from './coa.routes';
import complianceRoutes from './compliance.routes';
import transportRoutes from './transport.routes';
import anomalyRoutes from './anomaly.routes';
import qmsRoutes from './qms.routes';
import worldModelRoutes from './worldModel.routes';
import notificationRoutes from './notification.routes';
import facilityRoutes from './facility.routes';
import auditRoutes from './audit.routes';
import scanRoutes from './scan.routes';
import onboardingRoutes from './onboarding.routes';
import qrRoutes from './qr.routes';
import documentRoutes from './documents.routes';
import usersRoutes from './users.routes';
import baygridRoutes from './baygrid.routes';
import tasksRoutes from './tasks.routes';
import assetsRoutes from './assets.routes';
import trimRoutes from './trim.routes';
import strainRoutes from './strain.routes';
import feedingRoutes from './feeding.routes';
import mortalityRoutes from './mortality.routes';
import cloneRoutes from './clone.routes';
import smfRoutes from './sitemasterfile.routes';
import shiftRoutes from './shift.routes';
import motherRoutes from './mother.routes';
import hrRoutes from './hr.routes';
import forecastRoutes from './forecast.routes';
import smartRoutes from './smart.routes';
import cultivationSopsRoutes from './cultivation-sops.routes';
import gmpRoutes from './gmp.routes';
import ghostAuditRoutes from './ghost-audit.routes';
import conciergeRoutes from './concierge.routes';
import chatRoutes from './chat.routes';
import labelRoutes from './labels.routes';
import originRoutes from './origin.routes';
import driverRoutes from './driver.routes';
import chickenRoutes from './chicken.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/scan', scanRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/qr', qrRoutes);
router.use('/documents', documentRoutes);
router.use('/users', usersRoutes);
router.use('/baygrid', baygridRoutes);
router.use('/tasks', tasksRoutes);
router.use('/assets', assetsRoutes);
router.use('/trim', trimRoutes);
router.use('/strains', strainRoutes);
router.use('/feeding', feedingRoutes);
router.use('/mortality', mortalityRoutes);
router.use('/clones', cloneRoutes);
router.use('/site-master-file', smfRoutes);
router.use('/shifts', shiftRoutes);
router.use('/mothers', motherRoutes);
router.use('/hr', hrRoutes);
router.use('/forecast', forecastRoutes);
router.use('/smart', smartRoutes);
router.use('/plants', plantRoutes);
router.use('/containers', containerRoutes);
router.use('/batches', batchRoutes);
router.use('/lab', labRoutes);
router.use('/coa', coaRoutes);
router.use('/compliance', complianceRoutes);
router.use('/transport', transportRoutes);
router.use('/anomalies', anomalyRoutes);
router.use('/qms', qmsRoutes);
router.use('/world-model', worldModelRoutes);
router.use('/driver', driverRoutes);
router.use('/notifications', notificationRoutes);
router.use('/facilities', facilityRoutes);
router.use('/audit', auditRoutes);
router.use('/gmp', gmpRoutes);
router.use('/audit/ghost', ghostAuditRoutes);
router.use('/concierge', conciergeRoutes);
router.use('/chat', chatRoutes);
router.use('/labels', labelRoutes);
router.use('/origin', originRoutes);
router.use('/chickens', chickenRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tnt-za', timestamp: new Date().toISOString() });
});

// Full health/observability — process, DB, data-integrity, Driver liveness, per-tenant counts.
// This is the surface that would have made the tenant-split visible early. [W10.5]
router.get('/health/full', async (_req, res) => {
  const { prisma } = require('../config/db');
  const { lastIntegrity, runIntegrityCheck } = require('../services/integrity.service');
  const { getDriverHealth } = require('../services/driver.scheduler');
  const out: any = { service: 'tnt-za', timestamp: new Date().toISOString() };
  try {
    // DB reachable
    await prisma.$queryRawUnsafe('SELECT 1');
    out.db = 'reachable';
    // Integrity (use cached if present, else run once)
    out.integrity = lastIntegrity() || (await runIntegrityCheck('health'));
    // Driver heartbeat liveness
    out.driver = getDriverHealth();
    // Per-tenant counts of key tables (would surface orphan/empty tenants)
    const counts = await prisma.$queryRawUnsafe(
      `SELECT t.id AS "tenantId", t.name,
         (SELECT count(*)::int FROM "User" u WHERE u."tenantId"=t.id)         AS users,
         (SELECT count(*)::int FROM "Ticket" k WHERE k."tenantId"=t.id)        AS tickets,
         (SELECT count(*)::int FROM "TaskTemplate" tt WHERE tt."tenantId"=t.id AND tt.active) AS templates
       FROM "Tenant" t`,
    );
    out.tenants = counts;
    out.status = out.integrity?.ok && !out.driver?.stale ? 'ok' : 'degraded';
    res.status(out.status === 'ok' ? 200 : 503).json(out);
  } catch (e: any) {
    out.status = 'error';
    out.error = e.message;
    res.status(503).json(out);
  }
});

// Cultivation SOP surfaces — digitised paper SOPs (3-CUL / 8-CLN / 4-FAC)
router.use('/', cultivationSopsRoutes);

export default router;
