import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as containerService from '../services/container.service';

export async function register(req: AuthRequest, res: Response) {
  try {
    const container = await containerService.registerContainer({
      containerType: req.body.containerType,
      facilityId: req.body.facilityId,
      batchId: req.body.batchId,
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
    });
    res.status(201).json({ success: true, container });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const containers = await containerService.listContainers({
      tenantId: req.user!.tenantId,
      batchId: p(req.query.batchId as string),
      zoneId: p(req.query.zoneId as string),
      status: p(req.query.status as string),
      containerType: p(req.query.containerType as string),
    });
    res.json({ success: true, containers });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function getById(req: AuthRequest, res: Response) {
  try {
    const container = await containerService.getContainer(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, container });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function load(req: AuthRequest, res: Response) {
  try {
    const event = await containerService.loadContainer(p(req.params.id), {
      weight: parseFloat(req.body.weight), weightUnit: req.body.weightUnit || 'g',
      zoneId: req.body.zoneId, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, event });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function unload(req: AuthRequest, res: Response) {
  try {
    const event = await containerService.unloadContainer(p(req.params.id), {
      weight: parseFloat(req.body.weight), weightUnit: req.body.weightUnit || 'g',
      zoneId: req.body.zoneId, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, event });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function move(req: AuthRequest, res: Response) {
  try {
    const event = await containerService.moveContainer(p(req.params.id), {
      toZoneId: req.body.toZoneId, weight: parseFloat(req.body.weight),
      tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, event });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function handover(req: AuthRequest, res: Response) {
  try {
    const event = await containerService.handoverContainer(p(req.params.id), {
      incomingHandlerId: req.body.incomingHandlerId, weight: parseFloat(req.body.weight),
      tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, event });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function reconciliation(req: AuthRequest, res: Response) {
  try {
    const data = await containerService.getReconciliation(p(req.params.batchId), req.user!.tenantId);
    res.json({ success: true, ...data });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}
