import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as qms from '../services/qms.service';

export async function createSOP(req: AuthRequest, res: Response) {
  try {
    const sop = await qms.createSOP({ ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, sop });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function listSOPs(req: AuthRequest, res: Response) {
  try {
    const sops = await qms.listSOPs({ tenantId: req.user!.tenantId, facilityId: p(req.query.facilityId as string) });
    res.json({ success: true, sops });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function updateSOP(req: AuthRequest, res: Response) {
  try {
    const sop = await qms.updateSOP(p(req.params.id), {
      content: req.body.content,
      category: req.body.category,
      rolesRequired: req.body.rolesRequired,
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
    });
    res.json({ success: true, sop });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function acknowledgeSOP(req: AuthRequest, res: Response) {
  try {
    const ack = await qms.acknowledgeSOP(p(req.params.id), { userId: req.user!.userId, tenantId: req.user!.tenantId });
    res.json({ success: true, acknowledgement: ack });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function createDeviation(req: AuthRequest, res: Response) {
  try {
    const dev = await qms.createDeviation({ ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, deviation: dev });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function listDeviations(req: AuthRequest, res: Response) {
  try {
    const open = req.query.open === 'true' ? true : req.query.open === 'false' ? false : undefined;
    const devs = await qms.listDeviations({
      tenantId: req.user!.tenantId, facilityId: p(req.query.facilityId as string),
      open, sopId: p(req.query.sopId as string),
    });
    res.json({ success: true, deviations: devs });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function updateDeviation(req: AuthRequest, res: Response) {
  try {
    const dev = await qms.updateDeviation(p(req.params.id), { ...req.body, userId: req.user!.userId, tenantId: req.user!.tenantId });
    res.json({ success: true, deviation: dev });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function approveDeviation(req: AuthRequest, res: Response) {
  try {
    const dev = await qms.approveDeviation(p(req.params.id), { userId: req.user!.userId, name: req.body?.name, tenantId: req.user!.tenantId });
    res.json({ success: true, deviation: dev });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}
export async function closeDeviation(req: AuthRequest, res: Response) {
  try {
    const dev = await qms.closeDeviation(p(req.params.id), { userId: req.user!.userId, name: req.body?.name, tenantId: req.user!.tenantId });
    res.json({ success: true, deviation: dev });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function createEquipment(req: AuthRequest, res: Response) {
  try {
    const eq = await qms.createEquipment({ ...req.body, userId: req.user!.userId, tenantId: req.user!.tenantId });
    res.status(201).json({ success: true, equipment: eq });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function calibrateEquipment(req: AuthRequest, res: Response) {
  try {
    const eq = await qms.calibrateEquipment(p(req.params.id), { nextDueDays: req.body.nextDueDays, userId: req.user!.userId });
    res.json({ success: true, equipment: eq });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function listEquipment(req: AuthRequest, res: Response) {
  try {
    const eq = await qms.listEquipment(p(req.query.facilityId as string) || req.user!.facilityId || '');
    res.json({ success: true, equipment: eq });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}
