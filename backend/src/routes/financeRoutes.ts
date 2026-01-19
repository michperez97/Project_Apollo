import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';
import {
  getBalanceHandler,
  listTransactionsHandler,
  getFinancialSummaryHandler,
  listStudentBalancesHandler
} from '../controllers/financeController';

const router = Router();

router.get('/balance', authenticate, getBalanceHandler);
router.get('/balance/:studentId', authenticate, authorizeRoles('admin', 'teacher'), getBalanceHandler);
router.get('/transactions', authenticate, listTransactionsHandler);
router.get('/summary', authenticate, authorizeRoles('admin'), getFinancialSummaryHandler);
router.get('/students', authenticate, authorizeRoles('admin'), listStudentBalancesHandler);

export default router;
