import { Response, NextFunction } from 'express';
import {
  CourseInput,
  CourseRecord,
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

const isScopeAll = (scope: unknown): boolean => typeof scope === 'string' && scope === 'all';

const parsePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const canInstructorAccessCourse = (course: CourseRecord, instructorId: number): boolean =>
  course.instructor_id === instructorId || course.status === 'approved';

export const getCourses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const scopeAll = isScopeAll(req.query.scope);
    if (scopeAll) {
      if (req.user?.role === 'admin') {
        const courses = await listCourses();
        return res.json({ courses });
      }
      if (req.user?.role === 'instructor') {
        const courses = await listCoursesByInstructor(req.user.sub);
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
    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    if (req.user?.role === 'admin' || req.user?.role === 'instructor') {
      const course = await getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      if (req.user.role === 'instructor' && !canInstructorAccessCourse(course, req.user.sub)) {
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
      const instructorId = parsePositiveInt(payload.instructor_id);
      if (!instructorId) {
        return res.status(400).json({ error: 'Admin must specify a valid instructor_id' });
      }
      payload.instructor_id = instructorId;
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
    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
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
    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    const course = await getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (req.user?.role === 'instructor' && course.instructor_id !== req.user.sub) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    await deleteCourse(courseId);
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
    if (req.user.role === 'admin' && req.query.instructorId !== undefined) {
      const parsed = parsePositiveInt(req.query.instructorId);
      if (!parsed) {
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

    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
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
