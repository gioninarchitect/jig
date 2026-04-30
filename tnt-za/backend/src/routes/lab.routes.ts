import { Router } from 'express';
import { requireAuth, requireLevel } from '../middleware/auth';
import * as lab from '../controllers/lab.controller';

const router = Router();
router.use(requireAuth);

router.post('/results', requireLevel(2), lab.submitResult);
router.get('/results', requireLevel(0), lab.getResults);
router.post('/results/:id/flag', requireLevel(2), lab.flagRetest);

export default router;
