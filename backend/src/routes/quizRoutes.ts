import { Router } from 'express';
import {
  getQuizzesByCourse,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  deleteQuestion,
  startAttempt,
  submitAttempt,
  getAttempts
} from '../controllers/quizController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

// Quiz CRUD routes
router.get('/courses/:courseId/quizzes', authenticate, getQuizzesByCourse);
router.get('/:id', authenticate, getQuiz);
router.post('/', authenticate, authorizeRoles('admin', 'instructor'), createQuiz);
router.put('/:id', authenticate, authorizeRoles('admin', 'instructor'), updateQuiz);
router.delete('/:id', authenticate, authorizeRoles('admin', 'instructor'), deleteQuiz);

// Question management routes
router.post('/:id/questions', authenticate, authorizeRoles('admin', 'instructor'), addQuestion);
router.delete('/:id/questions/:questionId', authenticate, authorizeRoles('admin', 'instructor'), deleteQuestion);

// Student quiz attempt routes
router.post('/:id/attempt', authenticate, authorizeRoles('student'), startAttempt);
router.post('/attempts/:attemptId/submit', authenticate, authorizeRoles('student'), submitAttempt);
router.get('/:id/attempts', authenticate, authorizeRoles('student'), getAttempts);

export default router;
