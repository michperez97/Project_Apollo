import { Router } from 'express';
import { createPaymentIntentHandler } from '../controllers/paymentController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.post('/intents', authenticate, authorizeRoles('student', 'admin'), createPaymentIntentHandler);

export default router;
