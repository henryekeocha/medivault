import { NotificationType } from '@prisma/client';
/**
 * This enum fills the gap between what's defined in Prisma and what's being used in the code.
 * It provides all the notification types that are used but not defined in the Prisma schema.
 */
export var ExtendedNotificationTypes;
(function (ExtendedNotificationTypes) {
    // These are defined in Prisma
    ExtendedNotificationTypes["APPOINTMENT"] = "APPOINTMENT";
    ExtendedNotificationTypes["MESSAGE"] = "MESSAGE";
    ExtendedNotificationTypes["SHARE"] = "SHARE";
    ExtendedNotificationTypes["SYSTEM"] = "SYSTEM";
    // These are used in the code but not in Prisma
    ExtendedNotificationTypes["NEW_SHARE"] = "NEW_SHARE";
    ExtendedNotificationTypes["NEW_MESSAGE"] = "NEW_MESSAGE";
    ExtendedNotificationTypes["ANNOTATION_ADDED"] = "ANNOTATION_ADDED";
    ExtendedNotificationTypes["SECURITY_ALERT"] = "SECURITY_ALERT";
    ExtendedNotificationTypes["SYSTEM_UPDATE"] = "SYSTEM_UPDATE";
    ExtendedNotificationTypes["UPLOAD_COMPLETE"] = "UPLOAD_COMPLETE";
    ExtendedNotificationTypes["APPOINTMENT_CREATED"] = "APPOINTMENT_CREATED";
    ExtendedNotificationTypes["APPOINTMENT_COMPLETED"] = "APPOINTMENT_COMPLETED";
    ExtendedNotificationTypes["APPOINTMENT_CANCELLED"] = "APPOINTMENT_CANCELLED";
    ExtendedNotificationTypes["APPOINTMENT_NO_SHOW"] = "APPOINTMENT_NO_SHOW";
    ExtendedNotificationTypes["FILE_SHARED"] = "FILE_SHARED";
    ExtendedNotificationTypes["FILE_DOWNLOADED"] = "FILE_DOWNLOADED";
    ExtendedNotificationTypes["FILE_DELETED"] = "FILE_DELETED";
})(ExtendedNotificationTypes || (ExtendedNotificationTypes = {}));
// Custom notification types that extend the base Prisma types
export var CustomNotificationTypes;
(function (CustomNotificationTypes) {
    CustomNotificationTypes["FILE_ERROR"] = "FILE_ERROR";
    CustomNotificationTypes["APPOINTMENT_SCHEDULED"] = "APPOINTMENT_SCHEDULED";
    CustomNotificationTypes["APPOINTMENT_REMINDER"] = "APPOINTMENT_REMINDER";
})(CustomNotificationTypes || (CustomNotificationTypes = {}));
// Helper function to map extended type to Prisma type
export function mapToPrismaNotificationType(type) {
    switch (type) {
        case ExtendedNotificationTypes.NEW_SHARE:
        case ExtendedNotificationTypes.FILE_SHARED:
            return NotificationType.SHARE;
        case ExtendedNotificationTypes.NEW_MESSAGE:
            return NotificationType.MESSAGE;
        case ExtendedNotificationTypes.APPOINTMENT_CREATED:
        case ExtendedNotificationTypes.APPOINTMENT_COMPLETED:
        case ExtendedNotificationTypes.APPOINTMENT_CANCELLED:
        case ExtendedNotificationTypes.APPOINTMENT_NO_SHOW:
        case CustomNotificationTypes.APPOINTMENT_SCHEDULED:
        case CustomNotificationTypes.APPOINTMENT_REMINDER:
            return NotificationType.APPOINTMENT;
        case ExtendedNotificationTypes.SYSTEM_UPDATE:
        case ExtendedNotificationTypes.SECURITY_ALERT:
        case ExtendedNotificationTypes.UPLOAD_COMPLETE:
        case ExtendedNotificationTypes.ANNOTATION_ADDED:
        case ExtendedNotificationTypes.FILE_DOWNLOADED:
        case ExtendedNotificationTypes.FILE_DELETED:
        case CustomNotificationTypes.FILE_ERROR:
            return NotificationType.SYSTEM;
        // If it's already a Prisma NotificationType, return it directly
        default:
            if (Object.values(NotificationType).includes(type)) {
                return type;
            }
            return NotificationType.SYSTEM;
    }
}
// Type guard to check if a value is a valid NotificationType
export function isValidNotificationType(type) {
    return Object.values(NotificationType).includes(type);
}
// Type guard to check if a value is a valid ExtendedNotificationType
export function isValidExtendedNotificationType(type) {
    return Object.values(ExtendedNotificationTypes).includes(type);
}
// Type guard to check if a value is a valid CustomNotificationType
export function isValidCustomNotificationType(type) {
    return Object.values(CustomNotificationTypes).includes(type);
}
// Type guard to check if a value is a valid notification type (any kind)
export function isValidAnyNotificationType(type) {
    return isValidNotificationType(type) ||
        isValidExtendedNotificationType(type) ||
        isValidCustomNotificationType(type);
}
//# sourceMappingURL=notification.js.map