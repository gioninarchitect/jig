import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as bg from '../services/baygrid.service';

const router = Router();
router.use(requireAuth);

// ── GREENHOUSES ──
router.get('/greenhouses', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const data = await bg.listGreenhouses(req.user!.tenantId);
    res.json({ success: true, greenhouses: data });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/greenhouses', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const gh = await bg.createGreenhouse({ ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, greenhouse: gh });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.patch('/greenhouses/:id', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const gh = await bg.updateGreenhouse(p(req.params.id), {
      ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId,
    });
    res.json({ success: true, greenhouse: gh });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.delete('/greenhouses/:id', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const result = await bg.deleteGreenhouse(p(req.params.id), req.user!.tenantId, req.user!.userId);
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── BAYS ──
router.get('/greenhouses/:id/bays', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const bays = await bg.getBays(p(req.params.id));
    res.json({ success: true, bays });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.get('/bays/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const bay = await bg.getBayDetail(p(req.params.id));
    res.json({ success: true, bay });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/bays/:id/allocate', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const allocs = await bg.allocateBay({ bayId: p(req.params.id), ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.json({ success: true, allocations: allocs });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/bays/:id/clear', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    await bg.clearBay(p(req.params.id), req.user!.userId, req.user!.tenantId);
    res.json({ success: true });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// Cultivation manager triggers — auto-generates the Harvest Request for this bay
router.post('/bays/:id/request-harvest', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const request = await bg.requestHarvestForBay(p(req.params.id), {
      reasonForHarvest: req.body?.reasonForHarvest,
      expectedHarvestDate: req.body?.expectedHarvestDate,
      expectedYieldPerPlantG: req.body?.expectedYieldPerPlantG,
      tenantId: req.user!.tenantId,
      userId: req.user!.userId,
      userName: (req.user as any)?.email?.split('@')[0],
    });
    res.status(201).json({ success: true, request });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── MOTHERS ──
router.get('/mothers', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const mothers = await bg.listMothers(req.user!.tenantId);
    res.json({ success: true, mothers });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.get('/mothers/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const mother = await bg.getMother(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, mother });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/mothers', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const mother = await bg.createMother({ ...req.body, facilityId: req.user!.facilityId!, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, mother });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.patch('/mothers/:id/status', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const mother = await bg.updateMotherStatus(p(req.params.id), req.body.status, req.user!.userId, req.user!.tenantId);
    res.json({ success: true, mother });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── CLONE TRAYS ──
router.get('/clone-trays', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const trays = await bg.listCloneTrays(req.user!.tenantId);
    res.json({ success: true, trays });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/clone-trays', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const tray = await bg.createCloneTray({ ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, tray });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.patch('/clone-trays/:id', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const tray = await bg.updateCloneTray(p(req.params.id), { ...req.body, userId: req.user!.userId });
    res.json({ success: true, tray });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── TICKETS ──
router.get('/tickets', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const tickets = await bg.listTickets({
      tenantId: req.user!.tenantId,
      status: p(req.query.status as string),
      priority: p(req.query.priority as string),
      ticketType: p(req.query.ticketType as string),
      workflowStage: p(req.query.workflowStage as string),
      role: req.user!.role,
      userId: req.user!.userId,
    });
    res.json({ success: true, tickets });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/tickets', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await bg.createTicket({ ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, ticket });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.get('/tickets/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await bg.getTicket(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, ticket });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.patch('/tickets/:id', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const ticket = await bg.updateTicket(p(req.params.id), req.body);
    res.json({ success: true, ticket });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/tickets/:id/comments', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const comment = await bg.addTicketComment({ ticketId: p(req.params.id), ...req.body, userId: req.user!.userId });
    res.json({ success: true, comment });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── GROW SCHEDULES ──
router.get('/schedules', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const schedules = await bg.listSchedules(req.user!.tenantId);
    res.json({ success: true, schedules });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/schedules', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const schedule = await bg.createSchedule({ ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, schedule });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

export default router;
