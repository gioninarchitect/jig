import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as batchService from '../services/batch.service';
import { ensureBatchCultivationRecord } from '../services/bcr.service';
import { createTicket } from '../services/baygrid.service';

export async function create(req: AuthRequest, res: Response) {
  try {
    const batch = await batchService.createBatch({
      plantIds: req.body.plantIds, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.status(201).json({ success: true, batch });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const batches = await batchService.listBatches({
      tenantId: req.user!.tenantId,
      status: p(req.query.status as string),
      coaStatus: p(req.query.coaStatus as string),
      facilityId: p(req.query.facilityId as string),
      strain: p(req.query.strain as string),
    });
    res.json({ success: true, batches });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function getById(req: AuthRequest, res: Response) {
  try {
    const batch = await batchService.getBatch(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, batch });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function syncBcr(req: AuthRequest, res: Response) {
  try {
    const record = await ensureBatchCultivationRecord(p(req.params.id), req.user!.tenantId, req.user!.userId);
    res.json({ success: true, bcr: record });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function chain(req: AuthRequest, res: Response) {
  try {
    const data = await batchService.getChainOfCustody(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, ...data });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function split(req: AuthRequest, res: Response) {
  try {
    const children = await batchService.splitBatch(p(req.params.id), {
      weights: req.body.weights, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, batches: children });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function merge(req: AuthRequest, res: Response) {
  try {
    const batch = await batchService.mergeBatches({
      batchIds: req.body.batchIds, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, batch });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function requestDestruction(req: AuthRequest, res: Response) {
  try {
    const batch = await batchService.getBatch(p(req.params.id), req.user!.tenantId);
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });

    // Create destruction ticket — visible to FM + Head of Cultivation + Admin
    const ticket = await createTicket({
      title: `DESTRUCTION REQUEST — ${batch.batchNumber} (${batch.strain})`,
      description: `Batch ${batch.batchNumber} requested for destruction.\n\nReason: ${req.body.reason || 'Not specified'}\nWeight: ${batch.totalWeight || 'Unknown'}g\nStrain: ${batch.strain}\n\nRequires: FM authorization + SAPS witness + Head of Cultivation oversight.`,
      priority: 'CRITICAL',
      category: 'COMPLIANCE_APPROVAL',
      ticketType: 'APPROVAL',
      workflowStage: 'STORE_QA',
      batchId: batch.id,
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
    });

    // Set batch to quarantined pending destruction
    await batchService.updateStatus(p(req.params.id), {
      status: 'QUARANTINED', tenantId: req.user!.tenantId, userId: req.user!.userId,
    });

    res.json({ success: true, ticket, message: 'Destruction request created — awaiting FM authorization' });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function confirmDestruction(req: AuthRequest, res: Response) {
  try {
    const batch = await batchService.updateStatus(p(req.params.id), {
      status: 'DESTROYED', tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, batch, message: 'Batch marked as DESTROYED' });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function updateStatus(req: AuthRequest, res: Response) {
  try {
    const batch = await batchService.updateStatus(p(req.params.id), {
      status: req.body.status, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, batch });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

// ── Batch records (BMR / BPR / BDR) ──
export async function listRecords(req: AuthRequest, res: Response) {
  try {
    const records = await batchService.listBatchRecords(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, records });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function createRecord(req: AuthRequest, res: Response) {
  try {
    const record = await batchService.createBatchRecord({
      batchId: p(req.params.id), tenantId: req.user!.tenantId, facilityId: req.user!.facilityId,
      userId: req.user!.userId, recordType: req.body.recordType, summary: req.body.summary, data: req.body.data,
    });
    res.status(201).json({ success: true, record });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

export async function updateRecord(req: AuthRequest, res: Response) {
  try {
    const record = await batchService.updateBatchRecord(p(req.params.recordId), req.user!.tenantId, req.user!.userId, req.body.name || req.user!.email, req.body);
    res.json({ success: true, record });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}

// ── Processing stage weigh event ──
export async function recordStage(req: AuthRequest, res: Response) {
  try {
    const record = await batchService.recordProcessingStage({
      batchId: p(req.params.id), tenantId: req.user!.tenantId, facilityId: req.user!.facilityId,
      userId: req.user!.userId, userName: req.body.name,
      stage: req.body.stage,
      weight: req.body.weight !== undefined && req.body.weight !== null && req.body.weight !== '' ? Number(req.body.weight) : null,
      weightUnit: req.body.weightUnit, photoUrl: req.body.photoUrl, notes: req.body.notes,
    });
    res.status(201).json({ success: true, record });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
}
