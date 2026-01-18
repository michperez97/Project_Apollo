import { Router } from 'express';
import authRoutes from './authRoutes';
import courseRoutes from './courseRoutes';
import enrollmentRoutes from './enrollmentRoutes';
import moduleRoutes from './moduleRoutes';
import assignmentRoutes from './assignmentRoutes';
import uploadRoutes from './uploadRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/', moduleRoutes);
router.use('/', assignmentRoutes);
router.use('/', uploadRoutes);

export default router;

