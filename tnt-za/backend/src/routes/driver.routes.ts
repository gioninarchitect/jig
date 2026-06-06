import { Router } from 'express';
import { requireAuth, requireLevel } from '../middleware/auth';
import * as driver from '../controllers/driver.controller';

const router = Router();
router.use(requireAuth);
router.get('/queue', requireLevel(0), driver.queue);
router.get('/queue/me', requireLevel(0), driver.myQueue);
router.get('/roles', requireLevel(0), driver.roles);

export default router;
