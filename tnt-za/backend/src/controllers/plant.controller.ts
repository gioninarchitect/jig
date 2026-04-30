import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as plantService from '../services/plant.service';

export async function register(req: AuthRequest, res: Response) {
  try {
    const plant = await plantService.registerPlant({
      strain: req.body.strain,
      facilityId: req.body.facilityId,
      zoneId: req.body.zoneId,
      motherPlantId: req.body.motherPlantId,
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
    });
    res.status(201).json({ success: true, plant });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const result = await plantService.listPlants({
      tenantId: req.user!.tenantId,
      page: parseInt(p(req.query.page as string)) || 1,
      limit: parseInt(p(req.query.limit as string)) || 25,
      phase: p(req.query.phase as string),
      strain: p(req.query.strain as string),
      facilityId: p(req.query.facilityId as string),
      zoneId: p(req.query.zoneId as string),
      search: p(req.query.search as string),
      status: p(req.query.status as string),
    });
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function getById(req: AuthRequest, res: Response) {
  try {
    const plant = await plantService.getPlant(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, plant });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function transitionPhase(req: AuthRequest, res: Response) {
  try {
    const plant = await plantService.transitionPhase(p(req.params.id), {
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
      weight: req.body.weight ? parseFloat(req.body.weight) : undefined,
    });
    res.json({ success: true, plant });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function flag(req: AuthRequest, res: Response) {
  try {
    const plant = await plantService.flagPlant(p(req.params.id), {
      tenantId: req.user!.tenantId, userId: req.user!.userId, reason: req.body.reason,
    });
    res.json({ success: true, plant });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function scan(req: AuthRequest, res: Response) {
  try {
    const plant = await plantService.scanPlant(p(req.params.id), {
      tenantId: req.user!.tenantId, userId: req.user!.userId, zoneId: req.body.zoneId,
    });
    res.json({ success: true, plant });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function genealogy(req: AuthRequest, res: Response) {
  try {
    const data = await plantService.getGenealogy(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, ...data });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function stats(req: AuthRequest, res: Response) {
  try {
    const data = await plantService.getPlantStats(req.user!.tenantId);
    res.json({ success: true, ...data });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}
