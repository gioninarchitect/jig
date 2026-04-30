import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';

// =====================================================================
// Cultivation SOP routes — digitised paper SOPs (3-CUL / 8-CLN / 4-FAC)
//
//   /ipm-scouting       · SOP 3-CUL-2
//   /daily-checks       · SOPs 3-CUL-6, 3-CUL-8
//   /cleaning-schedule  · SOPs 8-CLN-7, 8-CLN-8, 8-CLN-9
//   /activity-log       · SOPs 3-CUL-6, 3-CUL-7, 3-CUL-9
//   /env-log            · SOP 4-FAC-2
//   /harvest-requests   · SOP 3-CUL-012
//
// Each surface: GET list + POST create. HIGH IPM observations create a
// deviation in QMS (left as a TODO for now; just flagged on response).
// =====================================================================

const prisma = new PrismaClient();
const router = Router();
router.use(requireAuth);

// ─── IPM Scouting ────────────────────────────────────────────────────
router.get('/ipm-scouting', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const zone = p(req.query.zone as string);
    const observations = await prisma.iPMObservation.findMany({
      where: { tenantId: req.user!.tenantId, ...(zone ? { zone } : {}) },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json({ success: true, observations });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/ipm-scouting', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const { zone, line, batchId, insectOrDisease, degree, pestType, stickyCardCount, notes } = req.body;
    const observation = await prisma.iPMObservation.create({
      data: {
        tenantId: req.user!.tenantId,
        doneBy: req.user!.userId,
        doneByName: (req.user as any)?.email?.split('@')[0] ?? req.user!.userId.slice(0, 8),
        zone, line, batchId: batchId || null,
        insectOrDisease, degree, pestType,
        stickyCardCount: stickyCardCount ?? null,
        notes: notes || null,
      },
    });
    res.status(201).json({ success: true, observation, deviationRaised: degree === 'HIGH' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Daily Checks ────────────────────────────────────────────────────
router.get('/daily-checks', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const zone = p(req.query.zone as string);
    const checks = await prisma.dailyCheckRecord.findMany({
      where: { tenantId: req.user!.tenantId, ...(zone ? { zone } : {}) },
      orderBy: { date: 'desc' },
      take: 60,
    });
    res.json({ success: true, checks });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/daily-checks', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const { zone, items, notes } = req.body;
    const check = await prisma.dailyCheckRecord.create({
      data: {
        tenantId: req.user!.tenantId,
        doneBy: req.user!.userId,
        doneByName: (req.user as any)?.email?.split('@')[0] ?? req.user!.userId.slice(0, 8),
        zone, items, notes: notes || null,
      },
    });
    res.status(201).json({ success: true, check });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Cleaning Schedule ───────────────────────────────────────────────
router.get('/cleaning-schedule', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const zone = p(req.query.zone as string);
    const records = await prisma.cleaningInitial.findMany({
      where: { tenantId: req.user!.tenantId, ...(zone ? { zone } : {}) },
      orderBy: { date: 'desc' },
      take: 500,
    });
    res.json({ success: true, records });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/cleaning-schedule', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const { zone, day, taskIndex, taskLabel } = req.body;
    const nameSource = ((req.user as any)?.email?.split('@')[0] ?? req.user!.userId.slice(0, 3)) || 'ZZZ';
    const initials = nameSource.slice(0, 3).toUpperCase();
    const record = await prisma.cleaningInitial.create({
      data: {
        tenantId: req.user!.tenantId,
        zone, day, taskIndex, taskLabel,
        initialled: initials,
        initialledByName: (req.user as any)?.email?.split('@')[0] ?? req.user!.userId.slice(0, 8),
      },
    });
    res.status(201).json({ success: true, record });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Cultivation Activity Log ────────────────────────────────────────
router.get('/activity-log', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const zone = p(req.query.zone as string);
    const entries = await prisma.cultivationActivity.findMany({
      where: { tenantId: req.user!.tenantId, ...(zone ? { zone } : {}) },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json({ success: true, entries });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/activity-log', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const { zone, activityPerformed, reason, strainId, batchNo, numberSize } = req.body;
    const now = new Date();
    const entry = await prisma.cultivationActivity.create({
      data: {
        tenantId: req.user!.tenantId,
        performedBy: req.user!.userId,
        performedByName: (req.user as any)?.email?.split('@')[0] ?? req.user!.userId.slice(0, 8),
        zone, activityPerformed, reason,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        strainId: strainId || null, batchNo: batchNo || null,
        numberSize: numberSize ?? null,
      },
    });
    res.status(201).json({ success: true, entry });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Environment (Temp/Humidity) Log ─────────────────────────────────
router.get('/env-log', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const zone = p(req.query.zone as string);
    const readings = await prisma.envReading.findMany({
      where: { tenantId: req.user!.tenantId, ...(zone ? { zone } : {}) },
      orderBy: { date: 'desc' },
      take: 200,
    });

    // Collapse 3 per-day rows into 1 row with temp8/rh8 etc. that the UI expects
    const byDay = new Map<string, any>();
    for (const r of readings) {
      const key = `${r.zone}::${new Date(r.date).toDateString()}`;
      const existing = byDay.get(key) ?? {
        id: r.id, date: r.date, zone: r.zone, checkedBy: r.checkedByName ?? r.checkedBy,
        temp8: null, rh8: null, temp12: null, rh12: null, temp17: null, rh17: null,
      };
      if (r.slot === '08:00') { existing.temp8  = r.temp; existing.rh8  = r.rh; }
      else if (r.slot === '11:50') { existing.temp12 = r.temp; existing.rh12 = r.rh; }
      else if (r.slot === '16:50') { existing.temp17 = r.temp; existing.rh17 = r.rh; }
      byDay.set(key, existing);
    }

    res.json({ success: true, readings: Array.from(byDay.values()) });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/env-log', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const { zone, slot, temp, rh, strainId, batchNo } = req.body;
    const reading = await prisma.envReading.create({
      data: {
        tenantId: req.user!.tenantId,
        checkedBy: req.user!.userId,
        checkedByName: (req.user as any)?.email?.split('@')[0] ?? req.user!.userId.slice(0, 8),
        zone, slot, temp, rh,
        strainId: strainId || null, batchNo: batchNo || null,
      },
    });
    res.status(201).json({ success: true, reading });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ─── Harvest Requests ────────────────────────────────────────────────
router.get('/harvest-requests', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.harvestRequest.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, requests });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/harvest-requests', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const {
      batchNo, strainId, floweringStartDate, batchSizePlants,
      greenhouse, bay, reasonForHarvest, requestedDate,
      expectedYieldPerPlantG, expectedYieldKg, expectedHarvestDate,
    } = req.body;

    // Potential yield — auto-compute if grower gave grams/plant but no total
    const perPlantG = expectedYieldPerPlantG ? Number(expectedYieldPerPlantG) : undefined;
    const plants = Number(batchSizePlants) || 0;
    const computedKg = perPlantG && plants ? (perPlantG * plants) / 1000 : undefined;

    const request = await prisma.harvestRequest.create({
      data: {
        tenantId: req.user!.tenantId,
        requestedBy: req.user!.userId,
        requestedByName: (req.user as any)?.email?.split('@')[0] ?? req.user!.userId.slice(0, 8),
        batchNo, strainId,
        floweringStartDate: new Date(floweringStartDate),
        batchSizePlants: plants,
        greenhouse, bay, reasonForHarvest,
        requestedDate: new Date(requestedDate),
        expectedYieldPerPlantG: perPlantG,
        expectedYieldKg: (expectedYieldKg ? Number(expectedYieldKg) : computedKg) as any,
        expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : undefined,
      },
    });
    res.status(201).json({ success: true, request });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/harvest-requests/:id/approve', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const { checklistAnswers, dryingRoomAllocated } = req.body;
    const request = await prisma.harvestRequest.update({
      where: { id: p(req.params.id) },
      data: {
        status: 'APPROVED',
        checklistAnswers,
        dryingRoomAllocated,
        hocApprovedBy: req.user!.userId,
        hocApprovedByName: (req.user as any)?.email?.split('@')[0] ?? req.user!.userId.slice(0, 8),
        qamApprovedBy: req.user!.userId,
        qamApprovedByName: (req.user as any)?.email?.split('@')[0] ?? req.user!.userId.slice(0, 8),
        approvedAt: new Date(),
      },
    });
    res.json({ success: true, request });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
