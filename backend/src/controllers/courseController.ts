import { Response, NextFunction } from 'express';
import {
  CourseInput,
  createCourse,
  deleteCourse,
  getCourseById,
  getPublishedCourseById,
  listCourses,
  listPublishedCourses,
  listCoursesByInstructor,
  updateCourse,
  updateCourseStatus
} from '../models/courseModel';
import { AuthenticatedRequest } from '../types/auth';

export const getCourses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'instructor')) {
      const scope = typeof req.query.scope === 'string' ? req.query.scope : '';
      if (scope === 'all') {
        const courses = await listCourses();
        return res.json({ courses });
      }
    }

    const courses = await listPublishedCourses();
    return res.json({ courses });
  } catch (error) {
    return next(error);
  }
};

export const getCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.id);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    if (req.user && (req.user.role === 'admin' || req.user.role === 'instructor')) {
      const course = await getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      return res.json({ course });
    }

    const course = await getPublishedCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    return res.json({ course });
  } catch (error) {
    return next(error);
  }
};

export const createCourseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const payload: CourseInput = req.body;
    const requiredFields: Array<keyof CourseInput> = ['title', 'description', 'category', 'price'];

    const missing = requiredFields.filter((field) => payload[field] === undefined);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    if (req.user?.role === 'instructor') {
      payload.instructor_id = req.user.sub;
      payload.status = payload.status ?? 'draft';
    } else if (req.user?.role === 'admin') {
      if (!payload.instructor_id || !Number.isFinite(Number(payload.instructor_id))) {
        return res.status(400).json({ error: 'Admin must specify a valid instructor_id' });
      }
      payload.status = payload.status ?? 'draft';
    }

    const course = await createCourse(payload);
    return res.status(201).json({ course });
  } catch (error) {
    return next(error);
  }
};

export const updateCourseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.id);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    const course = await getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (req.user?.role === 'instructor' && course.instructor_id !== req.user.sub) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const updated = await updateCourse(courseId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Course not found' });
    }
    return res.json({ course: updated });
  } catch (error) {
    return next(error);
  }
};

export const deleteCourseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.id);
    const deleted = await deleteCourse(courseId);
    if (!deleted) {
      return res.status(404).json({ error: 'Course not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const getInstructorCourses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let instructorId: number;
    if (req.user.role === 'admin' && req.query.instructorId) {
      const parsed = Number(req.query.instructorId);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return res.status(400).json({ error: 'Invalid instructorId' });
      }
      instructorId = parsed;
    } else if (req.user.role === 'instructor') {
      instructorId = req.user.sub;
    } else if (req.user.role === 'admin') {
      const courses = await listCourses();
      return res.json({ courses });
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const courses = await listCoursesByInstructor(instructorId);
    return res.json({ courses });
  } catch (error) {
    return next(error);
  }
};

export const submitCourseHandler = async (
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

    if (req.user.role === 'instructor' && course.instructor_id !== req.user.sub) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    if (course.status !== 'draft' && course.status !== 'rejected') {
      return res.status(400).json({ error: 'Only draft or rejected courses can be submitted' });
    }

    const updated = await updateCourseStatus(courseId, 'pending');
    return res.json({ course: updated });
  } catch (error) {
    return next(error);
  }
};
