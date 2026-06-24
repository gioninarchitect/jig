import { Router } from 'express';
import { requireAuth, requireLevel } from '../middleware/auth';
import * as wm from '../controllers/worldModel.controller';

const router = Router();
router.use(requireAuth);

router.get('/state', requireLevel(3), wm.getState);
router.get('/risk', requireLevel(3), wm.getRisk);
router.get('/inferences', requireLevel(3), wm.getInferences);

export default router;
