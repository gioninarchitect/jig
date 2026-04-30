import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import { prisma } from '../config/db';

export async function list(req: AuthRequest, res: Response) {
  try {
    const facilities = await prisma.facility.findMany({
      where: { tenantId: req.user!.tenantId },
      include: {
        zones: true,
        _count: { select: { plants: true, batches: true } },
      },
    });
    res.json({ success: true, facilities });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function getById(req: AuthRequest, res: Response) {
  try {
    const facility = await prisma.facility.findFirst({
      where: { id: p(req.params.id), tenantId: req.user!.tenantId },
      include: {
        zones: true,
        permits: true,
        _count: { select: { plants: true, batches: true, containers: true } },
      },
    });
    if (!facility) return res.status(404).json({ success: false, error: 'Facility not found' });
    res.json({ success: true, facility });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}
