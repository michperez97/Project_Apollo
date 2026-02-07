import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { enrollStudent, getEnrollments } from '../services/enrollmentService';
import { notifyEnrollmentCreated } from '../services/notificationService';

const parseOptionalPositiveInt = (value: unknown): number | undefined | null => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

export const listEnrollmentsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const rawStudentFilter = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const requestedStudentId = parseOptionalPositiveInt(rawStudentFilter);

    if (requestedStudentId === null) {
      return res.status(400).json({ error: 'Invalid studentId query param' });
    }

    if (req.user.role === 'student') {
      if (requestedStudentId !== undefined && requestedStudentId !== req.user.sub) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const enrollments = await getEnrollments(req.user.sub);
      return res.json({ enrollments });
    }

    if (req.user.role === 'instructor' && requestedStudentId === undefined) {
      return res.status(400).json({ error: 'studentId query param is required for instructors' });
    }

    const enrollments = await getEnrollments(requestedStudentId);
    return res.json({ enrollments });
  } catch (error) {
    return next(error);
  }
};

export const enrollHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const courseId = parseOptionalPositiveInt(req.body.course_id);
    if (courseId === null || courseId === undefined) {
      return res.status(400).json({ error: 'course_id is required' });
    }

    const requestedStudentId = parseOptionalPositiveInt(req.body.student_id);
    if (requestedStudentId === null) {
      return res.status(400).json({ error: 'Invalid student_id' });
    }

    if (req.user.role === 'student' && requestedStudentId !== undefined && requestedStudentId !== req.user.sub) {
      return res.status(403).json({ error: 'Students can only enroll themselves' });
    }

    const targetStudentId = req.user.role === 'student'
      ? req.user.sub
      : requestedStudentId ?? req.user.sub;

    const enrollment = await enrollStudent(targetStudentId, courseId);
    await notifyEnrollmentCreated(enrollment);
    return res.status(201).json({ enrollment });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Course not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('duplicate key value')) {
        return res.status(409).json({ error: 'Student is already enrolled in this course' });
      }
    }
    return next(error);
  }
};
