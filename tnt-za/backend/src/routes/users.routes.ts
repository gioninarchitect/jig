import { Router, Response } from 'express';
import { requireAuth, requireLevel, requireRole, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';
import { eventBus } from '../services/eventBus';

const router = Router();
router.use(requireAuth);

// List all users for tenant
router.get('/', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user!.tenantId },
      select: { id: true, name: true, email: true, role: true, active: true, facilityId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, users });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Create / invite user
router.post('/', requireLevel(4), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, facilityId } = req.body;
    if (!name || !email || !role) return res.status(400).json({ success: false, error: 'Name, email, and role are required' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ success: false, error: 'Email already registered' });

    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const pinHash = await bcrypt.hash(pin, 10);

    const user = await prisma.user.create({
      data: {
        name, email, role, pinHash,
        tenantId: req.user!.tenantId,
        facilityId: facilityId || req.user!.facilityId,
      },
    });

    console.log(`[Users] Created ${name} (${email}) as ${role} — PIN: ${pin}`);

    eventBus.emit('USER_CREATED', { userId: req.user!.userId, tenantId: req.user!.tenantId, entityType: 'User', entityId: user.id });

    res.status(201).json({ success: true, user: { id: user.id, name, email, role }, pin });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Update user role — FM (level 3) can switch staff roles
router.patch('/:id', requireRole('TENANT_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: p(req.params.id) },
      data: { role: req.body.role, name: req.body.name, active: req.body.active },
    });
    res.json({ success: true, user });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Deactivate user
router.delete('/:id', requireLevel(5), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({ where: { id: p(req.params.id) }, data: { active: false } });
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
