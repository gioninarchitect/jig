import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { GHOST_ALLOWED_EMAILS } from '../config/constants';

// =====================================================================
// /api/audit/ghost — Ghost Mode audit feed
//
// Returns AuditLog rows where ghost mode was active (ghostAsUserId set).
// Visible only to the Ghost-allowed trio (Flo, Ilse, Coenie) and tenant
// admins so they can monitor "who saw what as whom, when".
// =====================================================================

const prisma = new PrismaClient();
const router = Router();
router.use(requireAuth);

router.get('/', requireLevel(4), async (req: AuthRequest, res: Response) => {
  // Defense in depth: only the 3 allowed accounts may see this audit.
  // requireLevel(4) is necessary but not sufficient — also check email.
  // BUT we DON'T enforce here so that any TENANT_ADMIN can review for
  // their tenant; the allowlist gate is on activation, not on audit reads.
  // Audit transparency is a feature, not a secret.
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '100')) || 100, 500);
    const realUserId = req.query.realUserId as string | undefined;
    const ghostAsUserId = req.query.ghostAsUserId as string | undefined;
    const since = req.query.since as string | undefined; // ISO date

    const entries = await prisma.auditLog.findMany({
      where: {
        tenantId: req.user!.tenantId,
        ghostAsUserId: { not: null },
        ...(realUserId ? { userId: realUserId } : {}),
        ...(ghostAsUserId ? { ghostAsUserId } : {}),
        ...(since ? { timestamp: { gte: new Date(since) } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        timestamp: true,
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        hashChain: true,
        userId: true,
        ghostAsUserId: true,
      },
    });

    // Hydrate user names for display
    const allUserIds = new Set<string>();
    entries.forEach(e => { allUserIds.add(e.userId); if (e.ghostAsUserId) allUserIds.add(e.ghostAsUserId); });
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(allUserIds) } },
      select: { id: true, name: true, email: true, role: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const hydrated = entries.map(e => ({
      ...e,
      realActor: userMap.get(e.userId) ?? null,
      ghostTarget: e.ghostAsUserId ? (userMap.get(e.ghostAsUserId) ?? null) : null,
    }));

    res.json({
      success: true,
      total: hydrated.length,
      ghostAllowedEmails: GHOST_ALLOWED_EMAILS,
      entries: hydrated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
