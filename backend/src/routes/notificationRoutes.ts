import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  listNotificationsHandler,
  markNotificationsReadHandler
} from '../controllers/notificationController';

const router = Router();

router.get('/', authenticate, listNotificationsHandler);
router.post('/read', authenticate, markNotificationsReadHandler);

export default router;
