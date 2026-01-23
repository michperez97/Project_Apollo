import { Router } from 'express';
import {
  createAssignmentHandler,
  deleteAssignmentHandler,
  listAssignmentsHandler,
  listSubmissionsHandler,
  gradeSubmissionHandler,
  gradebookHandler,
  gradebookCsvHandler,
  submitAssignmentHandler,
  updateAssignmentHandler
} from '../controllers/assignmentController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get(
  '/courses/:courseId/assignments',
  authenticate,
  listAssignmentsHandler
);
router.post(
  '/courses/:courseId/assignments',
  authenticate,
  authorizeRoles('admin', 'instructor'),
  createAssignmentHandler
);
router.put(
  '/assignments/:id',
  authenticate,
  authorizeRoles('admin', 'instructor'),
  updateAssignmentHandler
);
router.delete(
  '/assignments/:id',
  authenticate,
  authorizeRoles('admin', 'instructor'),
  deleteAssignmentHandler
);
router.get('/assignments/:id/submissions', authenticate, listSubmissionsHandler);
router.post('/assignments/:id/submissions', authenticate, submitAssignmentHandler);
router.post(
  '/submissions/:id/grade',
  authenticate,
  authorizeRoles('admin', 'instructor'),
  gradeSubmissionHandler
);
router.get(
  '/courses/:courseId/gradebook',
  authenticate,
  gradebookHandler
);
router.get(
  '/courses/:courseId/gradebook.csv',
  authenticate,
  authorizeRoles('admin', 'instructor'),
  gradebookCsvHandler
);

export default router;
