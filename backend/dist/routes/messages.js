import express from 'express';
import { protect } from '../middleware/auth.js';
import { sendMessage, getMessages, getMessage, deleteMessage, updateMessage, getConversations, } from '../controllers/message.controller.js';
const router = express.Router();
// Protected routes
router.use(protect);
// Message routes
router.post('/', sendMessage);
router.get('/', getMessages);
router.get('/conversations', getConversations);
router.get('/:id', getMessage);
router.patch('/:id', updateMessage);
router.delete('/:id', deleteMessage);
export default router;
//# sourceMappingURL=messages.js.map