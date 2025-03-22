import express from 'express';
import type { RequestHandler } from 'express';
import { protect } from '../middleware/auth.js';
import { 
  getNotifications, 
  markNotificationAsRead, 
  deleteNotification,
  markAllNotificationsAsRead 
} from '../controllers/notification.controller.js';

const router = express.Router();

// Protect all notification routes
router.use(protect as RequestHandler);

// Get all notifications for the authenticated user
router.get('/', getNotifications as RequestHandler);

// Mark a notification as read
router.patch('/:id/read', markNotificationAsRead as RequestHandler);

// Mark all notifications as read
router.patch('/read-all', markAllNotificationsAsRead as RequestHandler);

// Delete a notification
router.delete('/:id', deleteNotification as RequestHandler);

export default router;  