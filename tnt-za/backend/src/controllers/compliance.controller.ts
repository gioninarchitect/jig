import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as complianceService from '../services/compliance.service';

export async function getQuota(req: AuthRequest, res: Response) {
  try {
    const data = await complianceService.getQuota(p(req.params.facilityId), req.user!.tenantId);
    res.json({ success: true, ...data });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function updateQuota(req: AuthRequest, res: Response) {
  try {
    const facility = await complianceService.updateQuota(p(req.params.facilityId), {
      annualQuota: req.body.annualQuota, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, facility });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function createDestruction(req: AuthRequest, res: Response) {
  try {
    const destruction = await complianceService.createDestruction({
      ...req.body, facilityId: req.body.facilityId,
      tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.status(201).json({ success: true, destruction });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function listDestructions(req: AuthRequest, res: Response) {
  try {
    const destructions = await complianceService.listDestructions(req.user!.tenantId);
    res.json({ success: true, destructions });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function getDestruction(req: AuthRequest, res: Response) {
  try {
    const destruction = await complianceService.getDestruction(p(req.params.id));
    res.json({ success: true, destruction });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function confirmDestruction(req: AuthRequest, res: Response) {
  try {
    const destruction = await complianceService.confirmDestruction(p(req.params.id), {
      userId: req.user!.userId, tenantId: req.user!.tenantId,
    });
    res.json({ success: true, destruction });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function listPermits(req: AuthRequest, res: Response) {
  try {
    const permits = await complianceService.listPermits(p(req.params.facilityId));
    res.json({ success: true, permits });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function createPermit(req: AuthRequest, res: Response) {
  try {
    const permit = await complianceService.createPermit({
      ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.status(201).json({ success: true, permit });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function updatePermit(req: AuthRequest, res: Response) {
  try {
    const permit = await complianceService.updatePermit(p(req.params.id), req.body);
    res.json({ success: true, permit });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}
