import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  createInboxConversationHandler,
  listInboxConversationMessagesHandler,
  listInboxConversationsHandler,
  listInboxRecipientsHandler,
  markInboxConversationReadHandler,
  sendInboxMessageHandler
} from '../controllers/inboxController';

const router = Router();

router.get('/conversations', authenticate, listInboxConversationsHandler);
router.get('/recipients', authenticate, listInboxRecipientsHandler);
router.get('/conversations/:conversationId/messages', authenticate, listInboxConversationMessagesHandler);
router.post('/conversations', authenticate, createInboxConversationHandler);
router.post('/conversations/:conversationId/messages', authenticate, sendInboxMessageHandler);
router.post('/conversations/:conversationId/read', authenticate, markInboxConversationReadHandler);

export default router;

