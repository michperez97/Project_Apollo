import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { assistantChatHandler } from '../controllers/assistantController';

const router = Router();

router.post('/chat', authenticate, assistantChatHandler);

export default router;
