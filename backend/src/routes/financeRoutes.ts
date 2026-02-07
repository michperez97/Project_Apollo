import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';
import {
  getBalanceHandler,
  listTransactionsHandler,
  getFinancialSummaryHandler,
  listStudentBalancesHandler
} from '../controllers/financeController';
import {
  getInstructorEarningsHandler,
  getInstructorCourseRevenueHandler,
  getInstructorTransactionsHandler
} from '../controllers/instructorFinanceController';

const router = Router();

router.get('/balance', authenticate, getBalanceHandler);
router.get('/balance/:studentId', authenticate, authorizeRoles('admin', 'instructor'), getBalanceHandler);
router.get('/transactions', authenticate, listTransactionsHandler);
router.get('/summary', authenticate, authorizeRoles('admin'), getFinancialSummaryHandler);
router.get('/students', authenticate, authorizeRoles('admin'), listStudentBalancesHandler);

router.get('/instructor/earnings', authenticate, authorizeRoles('admin', 'instructor'), getInstructorEarningsHandler);
router.get('/instructor/courses', authenticate, authorizeRoles('admin', 'instructor'), getInstructorCourseRevenueHandler);
router.get('/instructor/transactions', authenticate, authorizeRoles('admin', 'instructor'), getInstructorTransactionsHandler);

export default router;
