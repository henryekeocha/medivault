import { EmailService } from './email.service.js';
import { NotificationType } from '@prisma/client';
import { CustomNotificationTypes, ExtendedNotificationTypes, mapToPrismaNotificationType } from '../types/notification.js';
import { AppError } from '../utils/appError.js';
import { format } from 'date-fns';
export class NotificationService {
    emailService;
    wsService;
    prisma;
    constructor(wsService, prisma) {
        this.emailService = new EmailService();
        this.wsService = wsService;
        this.prisma = prisma;
    }
    async createNotification(userId, type, content, metadata) {
        try {
            // If it's an extended type not in Prisma, use a default type and store the real type in metadata
            let notificationType = type;
            let updatedMetadata = metadata || {};
            if (!Object.values(NotificationType).includes(type)) {
                notificationType = ExtendedNotificationTypes.SYSTEM_UPDATE;
                updatedMetadata = {
                    ...updatedMetadata,
                    extendedType: type
                };
            }
            // Map the extended type to a Prisma type
            const prismaType = mapToPrismaNotificationType(type);
            const notification = await this.prisma.notification.create({
                data: {
                    userId,
                    type: prismaType,
                    content,
                    metadata: updatedMetadata ? updatedMetadata : undefined
                }
            });
            return notification;
        }
        catch (error) {
            console.error('Error creating notification:', error);
            throw new AppError('Failed to create notification', 500);
        }
    }
    async markAsRead(notificationId, userId) {
        try {
            const notification = await this.prisma.notification.update({
                where: {
                    id: notificationId,
                    userId
                },
                data: {
                    read: true
                }
            });
            return notification;
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }
    async getUserNotifications(userId, page = 1, limit = 20) {
        try {
            const [notifications, total] = await Promise.all([
                this.prisma.notification.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    include: {
                        user: true
                    }
                }),
                this.prisma.notification.count({
                    where: { userId }
                })
            ]);
            return {
                notifications,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        }
        catch (error) {
            console.error('Error getting user notifications:', error);
            throw error;
        }
    }
    async getUnreadCount(userId) {
        try {
            return await this.prisma.notification.count({
                where: {
                    userId,
                    read: false
                }
            });
        }
        catch (error) {
            console.error('Error getting unread notification count:', error);
            throw error;
        }
    }
    generateEmailContent(type, content) {
        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${this.getNotificationTitle(type)}</h2>
        <p>${content}</p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    `;
    }
    getNotificationTitle(type) {
        switch (type) {
            case ExtendedNotificationTypes.NEW_SHARE:
                return 'New Share';
            case ExtendedNotificationTypes.NEW_MESSAGE:
                return 'New Message';
            case ExtendedNotificationTypes.ANNOTATION_ADDED:
                return 'Annotation Added';
            case ExtendedNotificationTypes.SECURITY_ALERT:
                return 'Security Alert';
            case ExtendedNotificationTypes.SYSTEM_UPDATE:
                return 'System Update';
            case ExtendedNotificationTypes.UPLOAD_COMPLETE:
                return 'Upload Complete';
            case ExtendedNotificationTypes.APPOINTMENT_CREATED:
                return 'Appointment Created';
            case ExtendedNotificationTypes.FILE_SHARED:
                return 'File Shared';
            case ExtendedNotificationTypes.FILE_DOWNLOADED:
                return 'File Downloaded';
            case ExtendedNotificationTypes.FILE_DELETED:
                return 'File Deleted';
            case CustomNotificationTypes.FILE_ERROR:
                return 'File Processing Error';
            case CustomNotificationTypes.APPOINTMENT_SCHEDULED:
                return 'Appointment Scheduled';
            case ExtendedNotificationTypes.APPOINTMENT_CANCELLED:
                return 'Appointment Cancelled';
            case CustomNotificationTypes.APPOINTMENT_REMINDER:
                return 'Appointment Reminder';
            case ExtendedNotificationTypes.APPOINTMENT_NO_SHOW:
                return 'Appointment No Show';
            default:
                return 'Notification';
        }
    }
    // Convenience methods for common notifications
    async notifyNewShare(userId, sharedBy, imageId) {
        return this.createNotification(userId, ExtendedNotificationTypes.NEW_SHARE, `A new image has been shared with you by ${sharedBy}`, { imageId });
    }
    async notifyNewMessage(userId, senderId, messagePreview) {
        return this.createNotification(userId, ExtendedNotificationTypes.NEW_MESSAGE, `New message: ${messagePreview}`, { senderId });
    }
    async notifyAnnotationAdded(userId, imageId, addedBy) {
        return this.createNotification(userId, ExtendedNotificationTypes.ANNOTATION_ADDED, `New annotation added by ${addedBy}`, { imageId });
    }
    async notifySecurityAlert(userId, alertType, details) {
        return this.createNotification(userId, ExtendedNotificationTypes.SECURITY_ALERT, details, { alertType });
    }
    async notifySystemUpdate(userId, updateType, details) {
        return this.createNotification(userId, ExtendedNotificationTypes.SYSTEM_UPDATE, details, { updateType });
    }
    async notifyFileUploadComplete(userId, fileId, fileName) {
        return this.createNotification(userId, ExtendedNotificationTypes.UPLOAD_COMPLETE, `File "${fileName}" has been uploaded successfully`, { fileId });
    }
    async notifyFileShared(userId, sharedBy, fileId, fileName) {
        return this.createNotification(userId, ExtendedNotificationTypes.NEW_SHARE, `File "${fileName}" has been shared with you by ${sharedBy}`, { fileId });
    }
    async notifyFileDownloaded(userId, fileId, fileName, downloadedBy) {
        return this.createNotification(userId, ExtendedNotificationTypes.FILE_DOWNLOADED, `File "${fileName}" was downloaded by ${downloadedBy}`, { fileId });
    }
    async notifyFileDeleted(userId, fileId, fileName, deletedBy) {
        return this.createNotification(userId, ExtendedNotificationTypes.FILE_DELETED, `File "${fileName}" was deleted by ${deletedBy}`, { fileId });
    }
    async notifyFileProcessingError(userId, fileId, fileName, error) {
        return this.createNotification(userId, CustomNotificationTypes.FILE_ERROR, `Error processing file "${fileName}": ${error}`, { fileId });
    }
    // Type guard to check compatibility
    isAppointmentWithUsers(appointment) {
        return appointment
            && typeof appointment === 'object'
            && 'patient' in appointment
            && 'doctor' in appointment;
    }
    async sendAppointmentNotification(appointment) {
        const date = appointment.startTime.toLocaleDateString();
        const time = appointment.startTime.toLocaleTimeString();
        // Notify patient
        await this.createNotification(appointment.patientId, ExtendedNotificationTypes.APPOINTMENT_CREATED, `New appointment scheduled with Dr. ${appointment.doctor.name} on ${date} at ${time}`, { appointmentId: appointment.id, date: `${date} ${time}` });
        // Notify doctor
        await this.createNotification(appointment.doctorId, ExtendedNotificationTypes.APPOINTMENT_CREATED, `New appointment scheduled with ${appointment.patient.name} on ${date} at ${time}`, { appointmentId: appointment.id, date: `${date} ${time}` });
    }
    async sendAppointmentCompleted(appointment) {
        // Check if we need to fetch the full appointment with users
        if (!this.isAppointmentWithUsers(appointment)) {
            console.log('Converting Appointment to AppointmentWithUsers...');
            // Need to fetch user data
            return;
        }
        const patientMessage = `Your appointment with Dr. ${appointment.doctor.name} on ${format(appointment.startTime, 'PPP')} has been marked as completed.`;
        const doctorMessage = `Your appointment with ${appointment.patient.name} on ${format(appointment.startTime, 'PPP')} has been marked as completed.`;
        await Promise.all([
            this.createNotification(appointment.patientId, ExtendedNotificationTypes.APPOINTMENT_COMPLETED, patientMessage),
            this.createNotification(appointment.doctorId, ExtendedNotificationTypes.APPOINTMENT_COMPLETED, doctorMessage)
        ]);
    }
    async sendAppointmentCancelled(appointment) {
        // Check if we need to fetch the full appointment with users
        if (!this.isAppointmentWithUsers(appointment)) {
            console.log('Converting Appointment to AppointmentWithUsers...');
            // Need to fetch user data
            return;
        }
        const patientMessage = `Your appointment with Dr. ${appointment.doctor.name} on ${format(appointment.startTime, 'PPP')} has been cancelled.`;
        const doctorMessage = `Your appointment with ${appointment.patient.name} on ${format(appointment.startTime, 'PPP')} has been cancelled.`;
        await Promise.all([
            this.createNotification(appointment.patientId, ExtendedNotificationTypes.APPOINTMENT_CANCELLED, patientMessage),
            this.createNotification(appointment.doctorId, ExtendedNotificationTypes.APPOINTMENT_CANCELLED, doctorMessage)
        ]);
    }
    async sendAppointmentNoShow(appointment) {
        // Check if we need to fetch the full appointment with users
        if (!this.isAppointmentWithUsers(appointment)) {
            console.log('Converting Appointment to AppointmentWithUsers...');
            // Need to fetch user data
            return;
        }
        const patientMessage = `You missed your appointment with Dr. ${appointment.doctor.name} on ${format(appointment.startTime, 'PPP')}.`;
        const doctorMessage = `${appointment.patient.name} missed their appointment scheduled for ${format(appointment.startTime, 'PPP')}.`;
        await Promise.all([
            this.createNotification(appointment.patientId, ExtendedNotificationTypes.APPOINTMENT_NO_SHOW, patientMessage),
            this.createNotification(appointment.doctorId, ExtendedNotificationTypes.APPOINTMENT_NO_SHOW, doctorMessage)
        ]);
    }
    async sendAppointmentReminder(appointment) {
        const patientNotification = await this.createNotification(appointment.patient.id, CustomNotificationTypes.APPOINTMENT_REMINDER, `Reminder: You have an appointment with Dr. ${appointment.doctor.name} tomorrow at ${appointment.startTime.toLocaleString()}`, { appointmentId: appointment.id });
        const doctorNotification = await this.createNotification(appointment.doctor.id, CustomNotificationTypes.APPOINTMENT_REMINDER, `Reminder: You have an appointment with ${appointment.patient.name} tomorrow at ${appointment.startTime.toLocaleString()}`, { appointmentId: appointment.id });
        return { patientNotification, doctorNotification };
    }
}
//# sourceMappingURL=notification.service.js.map