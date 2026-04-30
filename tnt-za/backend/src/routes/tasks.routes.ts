import { Router, Response } from 'express';
import { requireAuth, requireLevel, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import * as ts from '../services/tasks.service';
import * as kpiService from '../services/kpi.service';

const router = Router();
router.use(requireAuth);

// ── TEMPLATES ──
router.get('/templates', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const data = await ts.listTemplates(req.user!.tenantId, p(req.query.category as string));
    res.json({ success: true, templates: data });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/templates', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const tmpl = await ts.createTemplate({ ...req.body, tenantId: req.user!.tenantId });
    res.status(201).json({ success: true, template: tmpl });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// Seed SAHPRA SOP templates
router.post('/templates/seed-sahpra', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const created = [];
    for (const tmpl of ts.SAHPRA_SOP_TEMPLATES) {
      const existing = await ts.listTemplates(req.user!.tenantId, tmpl.category);
      const exists = existing.some(e => e.title === tmpl.title);
      if (!exists) {
        const t = await ts.createTemplate({ ...tmpl, tenantId: req.user!.tenantId });
        created.push(t);
      }
    }
    res.json({ success: true, created: created.length, templates: created });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── TASKS ──
router.get('/', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const data = await ts.listTasks({
      tenantId: req.user!.tenantId,
      assignedToId: p(req.query.mine as string) === 'true' ? req.user!.userId : undefined,
      status: p(req.query.status as string),
      batchId: p(req.query.batchId as string),
    });
    res.json({ success: true, tasks: data });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.get('/:id', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const task = await ts.getTask(p(req.params.id), req.user!.tenantId);
    res.json({ success: true, task });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.post('/', requireLevel(2), async (req: AuthRequest, res: Response) => {
  try {
    const task = await ts.createTask({ ...req.body, tenantId: req.user!.tenantId, userId: req.user!.userId });
    res.status(201).json({ success: true, task });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.patch('/:id/complete', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const task = await ts.completeTask(p(req.params.id), { ...req.body, userId: req.user!.userId });
    res.json({ success: true, task });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

router.patch('/:id/status', requireLevel(1), async (req: AuthRequest, res: Response) => {
  try {
    const task = await ts.updateTaskStatus(p(req.params.id), req.body.status);
    res.json({ success: true, task });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// Quarantine auto-tasks
router.post('/quarantine/:batchId', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await ts.createQuarantineTasks(p(req.params.batchId), req.user!.tenantId, req.user!.userId);
    res.json({ success: true, created: tasks.length, tasks });
  } catch (err: any) { res.status(err.status || 500).json({ success: false, error: err.message }); }
});

// ── KPIs ──
router.get('/kpis/definitions', requireLevel(0), async (req: AuthRequest, res: Response) => {
  try {
    const role = p(req.query.role as string) || req.user!.role;
    const kpis = await kpiService.getKpisForRole(req.user!.userId, req.user!.tenantId, role);
    res.json({ success: true, role, kpis });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
