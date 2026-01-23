import { Router } from 'express';
import {
  createCourseHandler,
  deleteCourseHandler,
  getCourse,
  getCourses,
  updateCourseHandler
} from '../controllers/courseController';
import { authenticate, authorizeRoles, optionalAuthenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', optionalAuthenticate, getCourses);
router.get('/:id', optionalAuthenticate, getCourse);
router.post('/', authenticate, authorizeRoles('admin', 'instructor'), createCourseHandler);
router.put('/:id', authenticate, authorizeRoles('admin', 'instructor'), updateCourseHandler);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteCourseHandler);

export default router;
