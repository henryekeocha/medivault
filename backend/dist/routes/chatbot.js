import { Router } from 'express';
import { protect } from '../middleware/clerk.js';
import { chatbotController } from '../controllers/chatbot.controller.js';
const router = Router();
// Apply protection middleware to all routes
router.use(protect);
// Chat routes
router.route('/chat')
    .post(chatbotController.sendMessage)
    .get(chatbotController.getChatHistory);
// Remove routes that don't exist in the controller
// router.route('/chat/:id')
//   .get(chatbotController.getChatById as RequestHandler)
//   .delete(chatbotController.deleteChat as RequestHandler);
// router.route('/feedback')
//   .post(chatbotController.submitFeedback as RequestHandler)
//   .get(chatbotController.getFeedback as RequestHandler);
export default router;
//# sourceMappingURL=chatbot.js.map