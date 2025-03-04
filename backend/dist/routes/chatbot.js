import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { chatbotController } from '../controllers/chatbot.controller.js';
import { encryptResponse, decryptRequest } from '../middleware/encryption.js';
const router = Router();
// Apply protection middleware to all routes
router.use(protect);
// Apply encryption middleware in production
if (process.env.NODE_ENV === 'production') {
    router.use(decryptRequest);
    router.use(encryptResponse);
}
// Chatbot routes - accessible to all authenticated users
router.route('/sessions')
    .post(chatbotController.startChatSession);
router.route('/sessions/:sessionId/messages')
    .post(chatbotController.sendMessage)
    .get(chatbotController.getChatHistory);
router.route('/sessions/:sessionId/end')
    .post(chatbotController.endChatSession);
export default router;
//# sourceMappingURL=chatbot.js.map