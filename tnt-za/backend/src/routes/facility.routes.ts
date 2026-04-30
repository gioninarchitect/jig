import { Router } from 'express';
import { requireAuth, requireLevel } from '../middleware/auth';
import * as facility from '../controllers/facility.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requireLevel(0), facility.list);
router.get('/:id', requireLevel(0), facility.getById);

export default router;
