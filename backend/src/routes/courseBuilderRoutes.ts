import { Router } from 'express';
import {
  listSectionsHandler,
  createSectionHandler,
  updateSectionHandler,
  deleteSectionHandler,
  reorderSectionsHandler,
  listLessonsBySectionHandler,
  createLessonHandler,
  updateLessonHandler,
  deleteLessonHandler,
  reorderLessonsHandler
} from '../controllers/courseBuilderController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

const auth = [authenticate, authorizeRoles('admin', 'instructor')];

// Sections
router.get('/:courseId/sections', ...auth, listSectionsHandler);
router.post('/:courseId/sections', ...auth, createSectionHandler);
router.put('/:courseId/sections/reorder', ...auth, reorderSectionsHandler);
router.put('/:courseId/sections/:sectionId', ...auth, updateSectionHandler);
router.delete('/:courseId/sections/:sectionId', ...auth, deleteSectionHandler);

// Lessons
router.get('/:courseId/sections/:sectionId/lessons', ...auth, listLessonsBySectionHandler);
router.post('/:courseId/sections/:sectionId/lessons', ...auth, createLessonHandler);
router.put('/:courseId/sections/:sectionId/lessons/reorder', ...auth, reorderLessonsHandler);
router.put('/:courseId/sections/:sectionId/lessons/:lessonId', ...auth, updateLessonHandler);
router.delete('/:courseId/sections/:sectionId/lessons/:lessonId', ...auth, deleteLessonHandler);

export default router;
