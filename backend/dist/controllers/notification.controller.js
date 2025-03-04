import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/appError.js';
const prisma = new PrismaClient();
export const getNotifications = async (req, res) => {
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
        res.json({ data: notifications });
    }
    catch (error) {
        throw new AppError('Error fetching notifications', 500);
    }
};
export const markNotificationAsRead = async (req, res) => {
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
        res.json({ data: updatedNotification });
    }
    catch (error) {
        if (error instanceof AppError)
            throw error;
        throw new AppError('Error marking notification as read', 500);
    }
};
export const deleteNotification = async (req, res) => {
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
        res.json({ message: 'Notification deleted successfully' });
    }
    catch (error) {
        if (error instanceof AppError)
            throw error;
        throw new AppError('Error deleting notification', 500);
    }
};
//# sourceMappingURL=notification.controller.js.map