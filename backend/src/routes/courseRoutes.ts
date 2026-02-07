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
import { validate } from '../middleware/validate';
import { createCourseSchema, updateCourseSchema, courseIdParamsSchema } from '../schemas/course';

const router = Router();

router.get('/', optionalAuthenticate, getCourses);
router.get('/:id', optionalAuthenticate, validate(courseIdParamsSchema, 'params'), getCourse);
router.post('/', authenticate, authorizeRoles('admin', 'instructor'), validate(createCourseSchema), createCourseHandler);
router.put('/:id', authenticate, authorizeRoles('admin', 'instructor'), validate(courseIdParamsSchema, 'params'), validate(updateCourseSchema), updateCourseHandler);
router.delete('/:id', authenticate, authorizeRoles('admin', 'instructor'), validate(courseIdParamsSchema, 'params'), deleteCourseHandler);
router.post('/:id/submit', authenticate, authorizeRoles('admin', 'instructor'), validate(courseIdParamsSchema, 'params'), submitCourseHandler);

export default router;
