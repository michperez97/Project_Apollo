import { Router } from 'express';
import { getCourseContentHandler } from '../controllers/courseContentController';
import { getCourseProgressHandler } from '../controllers/progressController';
import { authenticate, authorizeRoles, optionalAuthenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/:courseId/content', optionalAuthenticate, getCourseContentHandler);
router.get('/:courseId/progress', authenticate, authorizeRoles('student'), getCourseProgressHandler);

export default router;
