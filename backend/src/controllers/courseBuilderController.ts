import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { getCourseById } from '../models/courseModel';
import {
  listSectionsByCourse,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  CourseSectionInput
} from '../models/courseSectionModel';
import {
  listLessonsBySection,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  CourseLessonInput
} from '../models/courseLessonModel';

/** Verify the caller owns the course (instructor) or is admin. */
const verifyCourseOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  courseId: number
): Promise<boolean> => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }

  const course = await getCourseById(courseId);
  if (!course) {
    res.status(404).json({ error: 'Course not found' });
    return false;
  }

  if (req.user.role === 'instructor' && course.instructor_id !== req.user.sub) {
    res.status(403).json({ error: 'You do not own this course' });
    return false;
  }

  return true;
};

// ─── Sections ───────────────────────────────────────────────────────────────

export const listSectionsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    if (!(await verifyCourseOwnership(req, res, courseId))) return;

    const sections = await listSectionsByCourse(courseId);
    return res.json({ sections });
  } catch (error) {
    return next(error);
  }
};

export const createSectionHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    if (!(await verifyCourseOwnership(req, res, courseId))) return;

    const { title, position } = req.body as CourseSectionInput;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Section title is required' });
    }

    // If no position provided, place at the end
    let pos = position;
    if (pos === undefined || pos === null) {
      const existing = await listSectionsByCourse(courseId);
      pos = existing.length;
    }

    const section = await createSection(courseId, { title: title.trim(), position: pos });
    return res.status(201).json({ section });
  } catch (error) {
    return next(error);
  }
};

export const updateSectionHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const sectionId = Number(req.params.sectionId);
    if (!Number.isFinite(courseId) || !Number.isFinite(sectionId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    if (!(await verifyCourseOwnership(req, res, courseId))) return;

    const section = await getSectionById(sectionId);
    if (!section || section.course_id !== courseId) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const updated = await updateSection(sectionId, req.body);
    return res.json({ section: updated });
  } catch (error) {
    return next(error);
  }
};

export const deleteSectionHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const sectionId = Number(req.params.sectionId);
    if (!Number.isFinite(courseId) || !Number.isFinite(sectionId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    if (!(await verifyCourseOwnership(req, res, courseId))) return;

    const section = await getSectionById(sectionId);
    if (!section || section.course_id !== courseId) {
      return res.status(404).json({ error: 'Section not found' });
    }

    await deleteSection(sectionId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const reorderSectionsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    if (!(await verifyCourseOwnership(req, res, courseId))) return;

    const { order } = req.body as { order: number[] };
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array of section ids' });
    }

    // Update each section's position
    const updates = order.map((sectionId, index) =>
      updateSection(sectionId, { position: index })
    );
    await Promise.all(updates);

    const sections = await listSectionsByCourse(courseId);
    return res.json({ sections });
  } catch (error) {
    return next(error);
  }
};

// ─── Lessons ────────────────────────────────────────────────────────────────

export const listLessonsBySectionHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const sectionId = Number(req.params.sectionId);
    if (!Number.isFinite(courseId) || !Number.isFinite(sectionId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    if (!(await verifyCourseOwnership(req, res, courseId))) return;

    const section = await getSectionById(sectionId);
    if (!section || section.course_id !== courseId) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const lessons = await listLessonsBySection(sectionId);
    return res.json({ lessons });
  } catch (error) {
    return next(error);
  }
};

export const createLessonHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const sectionId = Number(req.params.sectionId);
    if (!Number.isFinite(courseId) || !Number.isFinite(sectionId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    if (!(await verifyCourseOwnership(req, res, courseId))) return;

    const section = await getSectionById(sectionId);
    if (!section || section.course_id !== courseId) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const body = req.body as CourseLessonInput;
    if (!body.title || !body.title.trim()) {
      return res.status(400).json({ error: 'Lesson title is required' });
    }
    if (!body.lesson_type) {
      return res.status(400).json({ error: 'Lesson type is required' });
    }

    // Auto-position at end if not specified
    let pos = body.position;
    if (pos === undefined || pos === null) {
      const existing = await listLessonsBySection(sectionId);
      pos = existing.length;
    }

    const lesson = await createLesson(courseId, sectionId, {
      ...body,
      title: body.title.trim(),
      position: pos
    });
    return res.status(201).json({ lesson });
  } catch (error) {
    return next(error);
  }
};

export const updateLessonHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const sectionId = Number(req.params.sectionId);
    const lessonId = Number(req.params.lessonId);
    if (!Number.isFinite(courseId) || !Number.isFinite(sectionId) || !Number.isFinite(lessonId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    if (!(await verifyCourseOwnership(req, res, courseId))) return;

    const lesson = await getLessonById(lessonId);
    if (!lesson || lesson.section_id !== sectionId || lesson.course_id !== courseId) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const updated = await updateLesson(lessonId, req.body);
    return res.json({ lesson: updated });
  } catch (error) {
    return next(error);
  }
};

export const deleteLessonHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const sectionId = Number(req.params.sectionId);
    const lessonId = Number(req.params.lessonId);
    if (!Number.isFinite(courseId) || !Number.isFinite(sectionId) || !Number.isFinite(lessonId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    if (!(await verifyCourseOwnership(req, res, courseId))) return;

    const lesson = await getLessonById(lessonId);
    if (!lesson || lesson.section_id !== sectionId || lesson.course_id !== courseId) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    await deleteLesson(lessonId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const reorderLessonsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const sectionId = Number(req.params.sectionId);
    if (!Number.isFinite(courseId) || !Number.isFinite(sectionId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    if (!(await verifyCourseOwnership(req, res, courseId))) return;

    const { order } = req.body as { order: number[] };
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'order must be an array of lesson ids' });
    }

    const updates = order.map((lessonId, index) =>
      updateLesson(lessonId, { position: index })
    );
    await Promise.all(updates);

    const lessons = await listLessonsBySection(sectionId);
    return res.json({ lessons });
  } catch (error) {
    return next(error);
  }
};
