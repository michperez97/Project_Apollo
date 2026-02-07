import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { getLessonById } from '../models/courseLessonModel';
import { recordSubscriptionUsage } from '../models/subscriptionUsageModel';
import { getStudentCourseAccess } from '../services/courseAccessService';
import {
  listProgressByStudentAndCourse,
  upsertProgress,
  ProgressStatus
} from '../models/studentProgressModel';

export const getCourseProgressHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    const access = await getStudentCourseAccess(req.user.sub, courseId);
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'No active access for this course' });
    }

    if (access.source === 'subscription') {
      await recordSubscriptionUsage(req.user.sub, courseId);
    }

    const progress = await listProgressByStudentAndCourse(req.user.sub, courseId);
    return res.json({ progress });
  } catch (error) {
    return next(error);
  }
};

export const updateLessonProgressHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const lessonId = Number(req.params.lessonId);
    if (!Number.isFinite(lessonId)) {
      return res.status(400).json({ error: 'Invalid lesson id' });
    }

    const lesson = await getLessonById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const access = await getStudentCourseAccess(req.user.sub, lesson.course_id);
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'No active access for this course' });
    }

    if (access.source === 'subscription') {
      await recordSubscriptionUsage(req.user.sub, lesson.course_id);
    }

    const { status, last_position_seconds } = req.body;

    const validStatuses: ProgressStatus[] = ['in_progress', 'completed'];
    const progressStatus = validStatuses.includes(status) ? status : 'in_progress';

    const progress = await upsertProgress({
      student_id: req.user.sub,
      lesson_id: lessonId,
      status: progressStatus,
      last_position_seconds: typeof last_position_seconds === 'number' ? last_position_seconds : undefined
    });

    return res.json({ progress });
  } catch (error) {
    return next(error);
  }
};
