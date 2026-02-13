import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';
import {
  generateAiCourseHandler,
  getAiCourseHandler,
  listAiCoursesHandler,
  deleteAiCourseHandler
} from '../controllers/aiCourseController';

const router = Router();

router.post('/generate', authenticate, authorizeRoles('student', 'admin'), generateAiCourseHandler);
router.get('/', authenticate, listAiCoursesHandler);
router.get('/:id', authenticate, getAiCourseHandler);
router.delete('/:id', authenticate, deleteAiCourseHandler);

export default router;
