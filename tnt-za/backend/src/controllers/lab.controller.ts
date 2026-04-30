import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as labService from '../services/lab.service';

export async function submitResult(req: AuthRequest, res: Response) {
  try {
    const result = await labService.submitResult({
      batchId: req.body.batchId, testType: req.body.testType,
      resultData: req.body.resultData, passed: req.body.passed,
      tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.status(201).json({ success: true, result });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function getResults(req: AuthRequest, res: Response) {
  try {
    const data = await labService.getResults(p(req.query.batchId as string), req.user!.tenantId);
    res.json({ success: true, ...data });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function flagRetest(req: AuthRequest, res: Response) {
  try {
    const data = await labService.flagForRetest(p(req.params.id), {
      tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, ...data });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}
