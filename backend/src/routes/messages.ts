import express from 'express';
import { protect } from '../middleware/clerk.js'; 
import {
  sendMessage,
  getMessages,
  getMessage,
  deleteMessage,
  updateMessage,
  getConversations,
  getMessageTemplates,
  getMessageTemplateCategories
} from '../controllers/message.controller.js';
import { RequestHandler } from 'express';

const router = express.Router();

// Protected routes
router.use(protect);

// Message routes
router.route('/')
  .post(sendMessage)
  .get(getMessages);

router.route('/conversations')
  .get(getConversations);

// Message template routes - MUST come before /:id to avoid route conflicts
router.route('/templates')
  .get(getMessageTemplates as RequestHandler);

router.route('/templates/categories')
  .get(getMessageTemplateCategories as RequestHandler);

// Single message route with ID parameter - MUST come after more specific routes
router.route('/:id')
  .get(getMessage)
  .patch(updateMessage)
  .delete(deleteMessage);

export default router; 