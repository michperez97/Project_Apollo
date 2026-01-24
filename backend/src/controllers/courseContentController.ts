import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { getCourseById } from '../models/courseModel';
import { listSectionsByCourse, CourseSectionRecord } from '../models/courseSectionModel';
import { listLessonsByCourse, CourseLessonRecord } from '../models/courseLessonModel';
import { getEnrollmentByStudentAndCourse } from '../models/enrollmentModel';

interface SectionWithLessons extends CourseSectionRecord {
  lessons: CourseLessonRecord[];
}

const redactLessonContent = (lesson: CourseLessonRecord): CourseLessonRecord => ({
  ...lesson,
  video_url: null,
  content: null
});

export const getCourseContentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'Invalid course id' });
    }

    const course = await getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.status !== 'approved') {
      if (!req.user) {
        return res.status(404).json({ error: 'Course not found' });
      }
      const isOwner = req.user.role === 'instructor' && course.instructor_id === req.user.sub;
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(404).json({ error: 'Course not found' });
      }
    }

    const sections = await listSectionsByCourse(courseId);
    const lessons = await listLessonsByCourse(courseId);

    let hasFullAccess = false;
    if (req.user) {
      const isAdmin = req.user.role === 'admin';
      const isOwner = req.user.role === 'instructor' && course.instructor_id === req.user.sub;
      if (isAdmin || isOwner) {
        hasFullAccess = true;
      } else {
        const enrollment = await getEnrollmentByStudentAndCourse(req.user.sub, courseId);
        if (enrollment && enrollment.payment_status === 'paid') {
          hasFullAccess = true;
        }
      }
    }

    const sectionsWithLessons: SectionWithLessons[] = sections.map((section) => {
      const sectionLessons = lessons
        .filter((l) => l.section_id === section.id)
        .map((lesson) => {
          if (hasFullAccess) {
            return lesson;
          }
          if (lesson.is_preview) {
            return lesson;
          }
          return redactLessonContent(lesson);
        });

      return {
        ...section,
        lessons: sectionLessons
      };
    });

    return res.json({
      course,
      sections: sectionsWithLessons,
      hasFullAccess
    });
  } catch (error) {
    return next(error);
  }
};
