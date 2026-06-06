import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getQueueForRole, DRIVER_ROLES } from '../services/driver.service';

export async function queue(req: AuthRequest, res: Response) {
  try {
    const role = String(req.query.role || req.user!.role);
    const items = await getQueueForRole(req.user!.tenantId, role);
    res.json({ success: true, role, items });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
}

export async function myQueue(req: AuthRequest, res: Response) {
  try {
    const items = await getQueueForRole(req.user!.tenantId, req.user!.role);
    res.json({ success: true, role: req.user!.role, items });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
}

export async function roles(_req: AuthRequest, res: Response) {
  res.json({ success: true, roles: DRIVER_ROLES });
}
