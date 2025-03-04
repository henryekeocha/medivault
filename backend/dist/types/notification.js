import { NotificationType } from '@prisma/client';
// Map for convenience when needing to work with our extended types
export const CustomNotificationTypes = {
    FILE_ERROR: 'FILE_ERROR',
    APPOINTMENT_SCHEDULED: 'APPOINTMENT_SCHEDULED',
    APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER'
};
// Type guard to check if a value is a valid NotificationType
export function isValidNotificationType(type) {
    return Object.values(NotificationType).includes(type);
}
// Type guard to check if a value is a valid ExtendedNotificationType
export function isValidExtendedNotificationType(type) {
    return isValidNotificationType(type) ||
        Object.values(CustomNotificationTypes).includes(type);
}
//# sourceMappingURL=notification.js.map