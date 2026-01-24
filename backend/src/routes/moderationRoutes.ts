import { Router } from 'express';
import {
  listPendingCoursesHandler,
  approveCourseHandler,
  rejectCourseHandler
} from '../controllers/moderationController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/courses/pending', authenticate, authorizeRoles('admin'), listPendingCoursesHandler);
router.post('/courses/:id/approve', authenticate, authorizeRoles('admin'), approveCourseHandler);
router.post('/courses/:id/reject', authenticate, authorizeRoles('admin'), rejectCourseHandler);

export default router;
