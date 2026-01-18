import { Router } from 'express';
import {
  createCourseHandler,
  deleteCourseHandler,
  getCourse,
  getCourses,
  updateCourseHandler
} from '../controllers/courseController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, getCourses);
router.get('/:id', authenticate, getCourse);
router.post('/', authenticate, authorizeRoles('admin', 'teacher'), createCourseHandler);
router.put('/:id', authenticate, authorizeRoles('admin', 'teacher'), updateCourseHandler);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteCourseHandler);

export default router;

