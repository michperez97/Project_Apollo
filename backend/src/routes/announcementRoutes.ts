import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';
import {
  createAnnouncementHandler,
  listAnnouncementsHandler,
  updateAnnouncementHandler,
  deleteAnnouncementHandler
} from '../controllers/announcementController';

const router = Router();

router.post('/', authenticate, authorizeRoles('admin', 'teacher'), createAnnouncementHandler);
router.get('/', authenticate, listAnnouncementsHandler);
router.put('/:id', authenticate, authorizeRoles('admin', 'teacher'), updateAnnouncementHandler);
router.delete('/:id', authenticate, authorizeRoles('admin', 'teacher'), deleteAnnouncementHandler);

export default router;
