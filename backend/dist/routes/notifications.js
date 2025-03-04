import express from 'express';
import { protect } from '../middleware/auth.js';
import { getNotifications, markNotificationAsRead, deleteNotification } from '../controllers/notification.controller.js';
const router = express.Router();
// Protect all notification routes
router.use(protect);
// Get all notifications for the authenticated user
router.get('/', getNotifications);
// Mark a notification as read
router.patch('/:id/read', markNotificationAsRead);
// Delete a notification
router.delete('/:id', deleteNotification);
export default router;
//# sourceMappingURL=notifications.js.map