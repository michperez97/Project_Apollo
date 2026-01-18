import { Router } from 'express';
import { enrollHandler, listEnrollmentsHandler } from '../controllers/enrollmentController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, authorizeRoles('admin', 'teacher', 'student'), listEnrollmentsHandler);
router.post('/', authenticate, authorizeRoles('admin', 'teacher', 'student'), enrollHandler);

export default router;


