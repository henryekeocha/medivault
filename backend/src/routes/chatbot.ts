import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { restrictTo } from '../middleware/auth.js'; 
import { chatbotController } from '../controllers/chatbot.controller.js';
import { Role } from '@prisma/client';
import type { RequestHandler } from 'express';
import { encryptResponse, decryptRequest, hipaaLogger } from '../middleware/encryption.js';

const router = Router();

// Apply protection middleware to all routes
router.use(protect as RequestHandler);

// Apply encryption middleware in production
if (process.env.NODE_ENV === 'production') {
  router.use(decryptRequest as RequestHandler);
  router.use(encryptResponse as RequestHandler);
}

// Chatbot routes - accessible to all authenticated users
router.route('/sessions')
  .post(chatbotController.startChatSession as RequestHandler);

router.route('/sessions/:sessionId/messages')
  .post(chatbotController.sendMessage as RequestHandler)
  .get(chatbotController.getChatHistory as RequestHandler);

router.route('/sessions/:sessionId/end')
  .post(chatbotController.endChatSession as RequestHandler);

export default router; 