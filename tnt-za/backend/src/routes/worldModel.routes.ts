import { Router } from 'express';
import { requireAuth, requireLevel } from '../middleware/auth';
import * as wm from '../controllers/worldModel.controller';

const router = Router();
router.use(requireAuth);

router.get('/state', requireLevel(0), wm.getState);
router.get('/risk', requireLevel(0), wm.getRisk);
router.get('/inferences', requireLevel(0), wm.getInferences);

export default router;
