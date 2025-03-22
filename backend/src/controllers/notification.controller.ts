import { Request, Response } from 'express';
import { AppError } from '../utils/appError.js';
import { AuthUser } from '../types/models.js';
import { prisma } from '../lib/prisma.js';

// Use the AuthenticatedRequest from auth.ts instead of defining a new interface
import { AuthenticatedRequest } from '../types/auth.js';

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ 
      status: 'success',
      data: notifications 
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new AppError('Error fetching notifications', 500);
  }
};

export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    const updatedNotification = await prisma.notification.update({
      where: {
        id,
      },
      data: {
        read: true,
      },
    });

    res.json({ 
      status: 'success',
      data: updatedNotification 
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Error marking notification as read:', error);
    throw new AppError('Error marking notification as read', 500);
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    await prisma.notification.delete({
      where: {
        id,
      },
    });

    res.json({ 
      status: 'success',
      message: 'Notification deleted successfully' 
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Error deleting notification:', error);
    throw new AppError('Error deleting notification', 500);
  }
};

export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;

    // Update all unread notifications for the user
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({ 
      status: 'success',
      message: 'All notifications marked as read' 
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw new AppError('Error marking notifications as read', 500);
  }
}; 