import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';
import {
  createAnnouncementHandler,
  listAnnouncementsHandler,
  updateAnnouncementHandler,
  deleteAnnouncementHandler
} from '../controllers/announcementController';

const router = Router();

router.post('/', authenticate, authorizeRoles('admin', 'instructor'), createAnnouncementHandler);
router.get('/', authenticate, listAnnouncementsHandler);
router.put('/:id', authenticate, authorizeRoles('admin', 'instructor'), updateAnnouncementHandler);
router.delete('/:id', authenticate, authorizeRoles('admin', 'instructor'), deleteAnnouncementHandler);

export default router;
