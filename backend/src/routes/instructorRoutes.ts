import { Router } from 'express';
import { getInstructorCourses } from '../controllers/courseController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/courses', authenticate, authorizeRoles('admin', 'instructor'), getInstructorCourses);

export default router;
