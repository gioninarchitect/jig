import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as wm from '../services/worldModel.service';

export async function getState(req: AuthRequest, res: Response) {
  try {
    const state = await wm.computeState(req.user!.tenantId);
    res.json({ success: true, state });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function getRisk(req: AuthRequest, res: Response) {
  try {
    const risk = await wm.getRiskScores(req.user!.tenantId);
    res.json({ success: true, risk });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function getInferences(req: AuthRequest, res: Response) {
  try {
    const alerts = await wm.getInferences(req.user!.tenantId);
    res.json({ success: true, alerts });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}
