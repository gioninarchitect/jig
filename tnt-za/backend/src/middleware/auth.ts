import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ROLE_LEVELS, GHOST_ALLOWED_EMAILS } from '../config/constants';
import { prisma } from '../config/db';
import { requestContext } from '../utils/requestContext';

export interface AuthUser {
  userId: string;
  email?: string;       // OPTIONAL — JWT may omit; verified at runtime, not type-trusted
  role: string;
  tenantId: string;
  facilityId: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;       // EFFECTIVE user (ghost target if ghosting, else real)
  realUser?: AuthUser;   // Original JWT identity (always present when authed)
  ghostAs?: string;      // userId of ghost target if active
}

// Roles that get VIEW-ONLY oversight into operational areas they don't own.
// Keyed by role → list of /api path prefixes the role may READ but never write.
// QA (Keke) reviews product-quality evidence across cultivation + processing.
const READ_ONLY_AREAS: Record<string, string[]> = {
  QA_INSPECTOR: [
    // Cultivation quality signals
    '/api/baygrid', '/api/env-log', '/api/daily-checks', '/api/ipm-scouting',
    '/api/cleaning-schedule', '/api/mortality',
    // Processing / product side
    '/api/batches', '/api/containers', '/api/lab', '/api/coa', '/api/trim',
  ],
};

// True when `role` may only read `url` — i.e. the path is in its read-only set
// and the request is a write (anything other than GET).
function isReadOnlyArea(role: string, method: string, url: string): boolean {
  if (method === 'GET') return false;
  const prefixes = READ_ONLY_AREAS[role];
  if (!prefixes) return false;
  const path = url.split('?')[0];
  return prefixes.some((p) => path === p || path.startsWith(p + '/'));
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded;
    req.realUser = decoded;
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  // ── View-only oversight enforcement ──────────────────────────────────
  // Some roles get READ access to operational areas they don't own (QA oversees
  // product quality across cultivation + processing) but must never edit those
  // records — the owning role stays the single source of truth. Block every
  // non-GET on those prefixes; reads pass through untouched.
  if (isReadOnlyArea(req.user!.role, req.method, req.originalUrl)) {
    return res.status(403).json({
      success: false,
      error: 'View-only: you can review this area for QA oversight, but edits stay with the team that owns it.',
    });
  }

  // ── Ghost Mode handling ──────────────────────────────────────────────
  const ghostId = req.headers['x-ghost-as'] as string | undefined;
  if (!ghostId) {
    // No ghost — still set request context so audit listener has the actor id
    return requestContext.run({ realUserId: req.realUser!.userId }, () => next());
  }

  // Look up the real caller to verify they're allowed to ghost
  const realUserRecord = await prisma.user.findUnique({ where: { id: req.realUser!.userId } });
  if (!realUserRecord || !(GHOST_ALLOWED_EMAILS as readonly string[]).includes(realUserRecord.email)) {
    return res.status(403).json({ success: false, error: 'Ghost mode not permitted for your account' });
  }

  // Read-only by default. To allow writes the caller must ALSO send
  // X-Ghost-Act: 1, which signals "Act-As" mode. Backend records the
  // resulting AuditLog with both real userId AND ghostAsUserId so the
  // accountability chain stays intact.
  const actAs = req.headers['x-ghost-act'] === '1';
  if (req.method !== 'GET' && !actAs) {
    return res.status(403).json({
      success: false,
      error: 'Ghost mode is read-only. Switch to Act-As mode (audited as both names) or exit ghost to take action.',
    });
  }

  // Resolve the ghost target
  const ghost = await prisma.user.findFirst({
    where: { id: ghostId, tenantId: req.realUser!.tenantId, active: true },
  });
  if (!ghost) {
    return res.status(404).json({ success: false, error: 'Ghost target not found' });
  }

  // Swap effective user. Real user retained on req.realUser for audit.
  req.user = {
    userId: ghost.id,
    email: ghost.email,
    role: ghost.role,
    tenantId: ghost.tenantId,
    facilityId: ghost.facilityId,
  };
  req.ghostAs = ghost.id;
  // Run downstream chain inside the ghost-aware async context so
  // audit.service.ts can record both real + ghost identities.
  requestContext.run({ realUserId: req.realUser!.userId, ghostAsUserId: ghost.id }, () => next());
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

export function requireLevel(minLevel: number) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    const userLevel = ROLE_LEVELS[req.user.role] ?? 0;
    if (userLevel < minLevel) {
      return res.status(403).json({ success: false, error: 'Insufficient permission level' });
    }
    next();
  };
}

export function requireTenant(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  // SUPER_ADMIN bypasses tenant check
  if (req.user.role === 'SUPER_ADMIN') return next();
  // Tenant ID is enforced in queries by controllers using req.user.tenantId
  next();
}
