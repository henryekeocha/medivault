import express from 'express';
import { protect } from '../middleware/clerk.js';
import { getNotifications, markNotificationAsRead, deleteNotification, markAllNotificationsAsRead } from '../controllers/notification.controller.js';
const router = express.Router();
// Protect all notification routes
router.use(protect);
// Get all notifications for the authenticated user
router.get('/', getNotifications);
// Mark a notification as read
router.patch('/:id/read', markNotificationAsRead);
// Mark all notifications as read
router.patch('/read-all', markAllNotificationsAsRead);
// Delete a notification
router.delete('/:id', deleteNotification);
export default router;
//# sourceMappingURL=notifications.js.map