import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  sendMessage,
  getMessages,
  getMessage,
  deleteMessage,
  updateMessage,
  getConversations,
} from '../controllers/message.controller.js';
import { RequestHandler } from 'express';

const router = express.Router();

// Protected routes
router.use(protect);

// Message routes
router.post('/', sendMessage as RequestHandler);
router.get('/', getMessages as RequestHandler);
router.get('/conversations', getConversations as RequestHandler);
router.get('/:id', getMessage as RequestHandler);
router.patch('/:id', updateMessage as RequestHandler);
router.delete('/:id', deleteMessage as RequestHandler);

export default router; 