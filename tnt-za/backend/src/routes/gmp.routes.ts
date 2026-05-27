import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';

// =====================================================================
// /api/gmp — GMP Partner audit endpoints
//
// Backs the GMP Audit Dashboard (GMPAuditPage.tsx). Findings + observations
// are stored as Tickets with ticketType=GMP_FINDING / GMP_OBSERVATION so they
// reuse the substrate (sign-off chain, comments, audit log, RBAC).
//
// Severity → ticket priority:
//   CRITICAL    → CRITICAL
//   MAJOR       → HIGH
//   MINOR       → MEDIUM
//   OBSERVATION → LOW
// =====================================================================

const prisma = new PrismaClient();
const router = Router();
router.use(requireAuth);

const SEV_TO_PRIORITY: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = {
  CRITICAL: 'CRITICAL', MAJOR: 'HIGH', MINOR: 'MEDIUM', OBSERVATION: 'LOW',
};
const PRIORITY_TO_SEV: Record<string, string> = {
  CRITICAL: 'CRITICAL', HIGH: 'MAJOR', MEDIUM: 'MINOR', LOW: 'OBSERVATION',
};

// ─── Engagement ──────────────────────────────────────────────────────
// Returns the current GMP audit engagement scope.  Pulls real AR/RP from
// the User table so the dashboard displays accurate names.
router.get('/engagement', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const [tenant, facility, currentUser, ar, rp] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.facility.findFirst({ where: { tenantId } }),
      prisma.user.findUnique({ where: { id: req.user!.userId } }),
      prisma.user.findFirst({ where: { tenantId, role: 'TENANT_ADMIN', name: { contains: 'Ilse' } } }),
      prisma.user.findFirst({ where: { tenantId, role: 'RESPONSIBLE_PHARMACIST' } }),
    ]);

    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const periodStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
    const periodEnd = new Date(now.getFullYear(), quarter * 3, 0);

    res.json({
      success: true,
      engagement: {
        id: `eng-${now.getFullYear()}-q${quarter}`,
        reference: `GMP-${now.getFullYear()}-Q${quarter}`,
        auditor: currentUser?.name ?? currentUser?.email?.split('@')[0] ?? 'GMP Partner',
        facilities: [facility?.name ?? `${tenant?.name} Facility`],
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        status: 'IN_PROGRESS',
        responsiblePharmacist: rp ? { id: rp.id, name: rp.name, email: rp.email } : null,
        authorisedRepresentative: ar ? { id: ar.id, name: ar.name, email: ar.email } : null,
      },
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Findings ────────────────────────────────────────────────────────
router.get('/findings', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        tenantId: req.user!.tenantId,
        ticketType: 'GMP_FINDING',
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    const findings = tickets.map(t => ({
      id: t.id,
      severity: PRIORITY_TO_SEV[t.priority] ?? 'OBSERVATION',
      reference: t.title,
      description: t.description,
      observedAt: t.createdAt.toISOString(),
      responseStatus: t.status === 'COMPLETED' || t.status === 'CLOSED' ? 'closed'
                     : t.rpSignedAt ? 'response_received'
                     : 'awaiting_response',
      responseDueDate: undefined,
    }));
    res.json({ success: true, findings });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/findings', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const { severity, reference, description } = req.body;
    if (!reference || !description) return res.status(400).json({ success: false, error: 'reference + description required' });

    const priority = SEV_TO_PRIORITY[severity] ?? 'LOW';
    const ticket = await prisma.ticket.create({
      data: {
        tenantId: req.user!.tenantId,
        title: reference,
        description,
        priority,
        ticketType: 'GMP_FINDING',
        category: 'GMP_AUDIT',
        workflowStage: 'FACILITY',
        reportedById: req.user!.userId,
      },
    });

    res.status(201).json({
      success: true,
      finding: {
        id: ticket.id,
        severity,
        reference: ticket.title,
        description: ticket.description,
        observedAt: ticket.createdAt.toISOString(),
        responseStatus: 'awaiting_response',
      },
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Observations (lighter-weight than findings) ─────────────────────
router.get('/observations', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        tenantId: req.user!.tenantId,
        ticketType: 'GMP_OBSERVATION',
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, observations: tickets });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/observations', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const { reference, description, sopId, deviationId } = req.body;
    if (!description) return res.status(400).json({ success: false, error: 'description required' });

    const ticket = await prisma.ticket.create({
      data: {
        tenantId: req.user!.tenantId,
        title: reference || `Observation @ ${new Date().toISOString().slice(0, 16)}`,
        description,
        priority: 'LOW',
        ticketType: 'GMP_OBSERVATION',
        category: 'GMP_AUDIT',
        workflowStage: 'FACILITY',
        reportedById: req.user!.userId,
      },
    });
    res.status(201).json({ success: true, observation: ticket });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
