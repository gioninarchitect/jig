import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ROLE_LEVELS } from '../config/constants';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  facilityId: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
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
