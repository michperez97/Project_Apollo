import { Router } from 'express';
import authRoutes from './authRoutes';
import courseRoutes from './courseRoutes';
import enrollmentRoutes from './enrollmentRoutes';
import moduleRoutes from './moduleRoutes';
import assignmentRoutes from './assignmentRoutes';
import uploadRoutes from './uploadRoutes';
import paymentRoutes from './paymentRoutes';
import financeRoutes from './financeRoutes';
import announcementRoutes from './announcementRoutes';
import instructorRoutes from './instructorRoutes';
import moderationRoutes from './moderationRoutes';
import courseContentRoutes from './courseContentRoutes';
import progressRoutes from './progressRoutes';
import assistantRoutes from './assistantRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/courses', courseContentRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/', moduleRoutes);
router.use('/', assignmentRoutes);
router.use('/', uploadRoutes);
router.use('/payments', paymentRoutes);
router.use('/finance', financeRoutes);
router.use('/announcements', announcementRoutes);
router.use('/instructor', instructorRoutes);
router.use('/admin', moderationRoutes);
router.use('/lessons', progressRoutes);
router.use('/assistant', assistantRoutes);

export default router;
