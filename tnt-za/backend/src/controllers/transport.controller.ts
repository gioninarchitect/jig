import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as transportService from '../services/transport.service';

export async function create(req: AuthRequest, res: Response) {
  try {
    const manifest = await transportService.createManifest({
      ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.status(201).json({ success: true, manifest });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function depart(req: AuthRequest, res: Response) {
  try {
    const manifest = await transportService.departManifest(p(req.params.id), {
      userId: req.user!.userId, tenantId: req.user!.tenantId,
    });
    res.json({ success: true, manifest });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function arrive(req: AuthRequest, res: Response) {
  try {
    const manifest = await transportService.arriveManifest(p(req.params.id), {
      userId: req.user!.userId, tenantId: req.user!.tenantId,
    });
    res.json({ success: true, manifest });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const manifests = await transportService.listManifests(req.user!.tenantId);
    res.json({ success: true, manifests });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}
