import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import {
  createAiCourse,
  deleteAiCourse,
  getAiCourseById,
  listAiCoursesByStudent
} from '../models/aiCourseModel';
import { generateAiCourse } from '../services/aiCourseGeneratorService';

const normalizePrompt = (value: unknown) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const buildPlaceholderTitle = (prompt: string) => {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return 'AI Course: Untitled';
  }
  const snippet = trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
  return `AI Course: ${snippet}`;
};

export const generateAiCourseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const prompt = normalizePrompt(req.body?.prompt);
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ error: 'prompt is too long' });
    }

    const course = await createAiCourse({
      student_id: req.user.sub,
      title: buildPlaceholderTitle(prompt),
      description: null,
      category: null,
      prompt
    });

    setImmediate(() => {
      void generateAiCourse(req.user!.sub, prompt, course.id);
    });

    return res.status(201).json({ course });
  } catch (error) {
    return next(error);
  }
};

export const listAiCoursesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const courses = await listAiCoursesByStudent(req.user.sub);
    return res.json({ courses });
  } catch (error) {
    return next(error);
  }
};

export const getAiCourseHandler = async (
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

    const course = await getAiCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'AI course not found' });
    }

    if (req.user.role !== 'admin' && req.user.sub !== course.student_id) {
      return res.status(403).json({ error: 'Not authorized to view this AI course' });
    }

    return res.json({ course });
  } catch (error) {
    return next(error);
  }
};

export const deleteAiCourseHandler = async (
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

    const course = await getAiCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'AI course not found' });
    }

    if (req.user.role !== 'admin' && req.user.sub !== course.student_id) {
      return res.status(403).json({ error: 'Not authorized to delete this AI course' });
    }

    await deleteAiCourse(courseId);
    return res.json({ message: 'AI course deleted' });
  } catch (error) {
    return next(error);
  }
};
