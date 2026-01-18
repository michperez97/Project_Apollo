import { Response, NextFunction } from 'express';
import {
  CourseInput,
  createCourse,
  deleteCourse,
  getCourseById,
  listCourses,
  updateCourse
} from '../models/courseModel';
import { AuthenticatedRequest } from '../types/auth';

export const getCourses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const courses = await listCourses();
    return res.json({ courses });
  } catch (error) {
    return next(error);
  }
};

export const getCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.id);
    const course = await getCourseById(courseId);
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
    const requiredFields: Array<keyof CourseInput> = [
      'code',
      'name',
      'credit_hours',
      'price_per_credit',
      'semester',
      'year'
    ];

    const missing = requiredFields.filter((field) => payload[field] === undefined);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    const course = await createCourse(payload);
    return res.status(201).json({ course });
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key value')) {
      return res.status(409).json({ error: 'Course code already exists' });
    }
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


