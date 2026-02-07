import { Router } from 'express';
import { getInstructorCourses } from '../controllers/courseController';
import { getInstructorActivityFeedHandler } from '../controllers/instructorActivityController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/courses', authenticate, authorizeRoles('admin', 'instructor'), getInstructorCourses);
router.get(
  '/activity-feed',
  authenticate,
  authorizeRoles('admin', 'instructor'),
  getInstructorActivityFeedHandler
);

export default router;
