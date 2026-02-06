import { Response, NextFunction } from 'express';
import { getCourseById, listPendingCourses, updateCourseStatus } from '../models/courseModel';
import { createCourseReview } from '../models/courseReviewModel';
import { AuthenticatedRequest } from '../types/auth';
import { notifyCourseStatus } from '../services/notificationService';

export const listPendingCoursesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courses = await listPendingCourses();
    return res.json({ courses });
  } catch (error) {
    return next(error);
  }
};

export const approveCourseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const courseId = Number(req.params.id);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    const course = await getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending courses can be approved' });
    }

    const feedback = typeof req.body.feedback === 'string' ? req.body.feedback : null;

    await createCourseReview({
      course_id: courseId,
      admin_id: req.user.sub,
      action: 'approved',
      feedback
    });

    const updated = await updateCourseStatus(courseId, 'approved', new Date());
    if (updated) {
      await notifyCourseStatus({ course: updated, status: 'approved', feedback });
    }
    return res.json({ course: updated });
  } catch (error) {
    return next(error);
  }
};

export const rejectCourseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const courseId = Number(req.params.id);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    const course = await getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending courses can be rejected' });
    }

    const feedback = req.body.feedback;
    if (typeof feedback !== 'string' || !feedback.trim()) {
      return res.status(400).json({ error: 'Feedback is required when rejecting a course' });
    }

    await createCourseReview({
      course_id: courseId,
      admin_id: req.user.sub,
      action: 'rejected',
      feedback: feedback.trim()
    });

    const updated = await updateCourseStatus(courseId, 'rejected', null);
    if (updated) {
      await notifyCourseStatus({ course: updated, status: 'rejected', feedback: feedback.trim() });
    }
    return res.json({ course: updated });
  } catch (error) {
    return next(error);
  }
};
