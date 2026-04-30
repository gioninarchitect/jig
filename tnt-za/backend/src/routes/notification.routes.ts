import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as notif from '../controllers/notification.controller';

const router = Router();
router.use(requireAuth);

router.get('/', notif.list);
router.patch('/:id/read', notif.markRead);
router.patch('/read-all', notif.markAllRead);

export default router;
