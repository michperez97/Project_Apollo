import { Router } from 'express';
import {
  createCourseHandler,
  deleteCourseHandler,
  getCourse,
  getCourses,
  updateCourseHandler,
  submitCourseHandler
} from '../controllers/courseController';
import { authenticate, authorizeRoles, optionalAuthenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', optionalAuthenticate, getCourses);
router.get('/:id', optionalAuthenticate, getCourse);
router.post('/', authenticate, authorizeRoles('admin', 'instructor'), createCourseHandler);
router.put('/:id', authenticate, authorizeRoles('admin', 'instructor'), updateCourseHandler);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteCourseHandler);
router.post('/:id/submit', authenticate, authorizeRoles('admin', 'instructor'), submitCourseHandler);

export default router;
