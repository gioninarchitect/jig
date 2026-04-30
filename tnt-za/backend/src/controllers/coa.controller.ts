import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as coaService from '../services/coa.service';
import { join } from 'path';

export async function generate(req: AuthRequest, res: Response) {
  try {
    const coa = await coaService.generateCOA(p(req.params.batchId), {
      tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.status(201).json({ success: true, coa });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function getById(req: AuthRequest, res: Response) {
  try {
    const coa = await coaService.getCOA(p(req.params.id));
    if (req.query.download === 'true' && coa.pdfUrl) {
      const pdfPath = join(process.cwd(), coa.pdfUrl);
      return res.download(pdfPath);
    }
    res.json({ success: true, coa });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function revoke(req: AuthRequest, res: Response) {
  try {
    const coa = await coaService.revokeCOA(p(req.params.id), {
      reason: req.body.reason, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, coa });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}
