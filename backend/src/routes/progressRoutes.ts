import { Router } from 'express';
import { updateLessonProgressHandler } from '../controllers/progressController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.post('/:lessonId/progress', authenticate, authorizeRoles('student'), updateLessonProgressHandler);

export default router;
