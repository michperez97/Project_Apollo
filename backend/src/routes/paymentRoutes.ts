import { Router } from 'express';
import {
  createPaymentIntentHandler,
  createCheckoutSessionHandler
} from '../controllers/paymentController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.post('/intents', authenticate, authorizeRoles('student', 'admin'), createPaymentIntentHandler);
router.post('/checkout', authenticate, authorizeRoles('student', 'admin'), createCheckoutSessionHandler);

export default router;
