import { Router } from 'express';
import { requireAuth, requireLevel } from '../middleware/auth';
import { validate, registerPlantSchema, transitionPhaseSchema, flagPlantSchema } from '../middleware/validate';
import * as plant from '../controllers/plant.controller';

const router = Router();
router.use(requireAuth);

router.post('/', requireLevel(2), validate(registerPlantSchema), plant.register);
router.get('/', requireLevel(0), plant.list);
router.get('/stats', requireLevel(0), plant.stats);
router.get('/:id', requireLevel(0), plant.getById);
router.get('/:id/genealogy', requireLevel(0), plant.genealogy);
router.patch('/:id/phase', requireLevel(2), plant.transitionPhase);
router.patch('/:id/flag', requireLevel(2), validate(flagPlantSchema), plant.flag);
router.post('/:id/scan', requireLevel(2), plant.scan);

export default router;
