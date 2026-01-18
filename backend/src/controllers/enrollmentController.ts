import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { enrollStudent, getEnrollments } from '../services/enrollmentService';

export const listEnrollmentsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentFilter = req.query.studentId ? Number(req.query.studentId) : undefined;
    const enrollments = await getEnrollments(studentFilter);
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
    const { course_id, student_id } = req.body;
    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required' });
    }

    const targetStudentId = student_id ?? req.user?.sub;
    if (!targetStudentId) {
      return res.status(400).json({ error: 'student_id is required' });
    }

    const enrollment = await enrollStudent(Number(targetStudentId), Number(course_id));
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


