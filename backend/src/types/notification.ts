import { NotificationType } from '@prisma/client';

/**
 * This enum fills the gap between what's defined in Prisma and what's being used in the code.
 * It provides all the notification types that are used but not defined in the Prisma schema.
 */
export enum ExtendedNotificationTypes {
  // These are defined in Prisma
  APPOINTMENT = 'APPOINTMENT',
  MESSAGE = 'MESSAGE',
  SHARE = 'SHARE',
  SYSTEM = 'SYSTEM',
  
  // These are used in the code but not in Prisma
  NEW_SHARE = 'NEW_SHARE',
  NEW_MESSAGE = 'NEW_MESSAGE',
  ANNOTATION_ADDED = 'ANNOTATION_ADDED',
  SECURITY_ALERT = 'SECURITY_ALERT',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
  UPLOAD_COMPLETE = 'UPLOAD_COMPLETE',
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_COMPLETED = 'APPOINTMENT_COMPLETED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  APPOINTMENT_NO_SHOW = 'APPOINTMENT_NO_SHOW',
  FILE_SHARED = 'FILE_SHARED',
  FILE_DOWNLOADED = 'FILE_DOWNLOADED',
  FILE_DELETED = 'FILE_DELETED'
}

// Custom notification types that extend the base Prisma types
export enum CustomNotificationTypes {
  FILE_ERROR = 'FILE_ERROR',
  APPOINTMENT_SCHEDULED = 'APPOINTMENT_SCHEDULED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER'
}

// Combined type for all notification types
export type ExtendedNotificationType = NotificationType | ExtendedNotificationTypes | CustomNotificationTypes;

// Helper function to map extended type to Prisma type
export function mapToPrismaNotificationType(type: ExtendedNotificationType): NotificationType {
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
      if (Object.values(NotificationType).includes(type as NotificationType)) {
        return type as NotificationType;
      }
      return NotificationType.SYSTEM;
  }
}

// Notification metadata types
export interface NotificationMetadata {
  imageId?: string;
  fileId?: string;
  appointmentId?: string;
  senderId?: string;
  alertType?: string;
  updateType?: string;
  date?: string;
  extendedType?: ExtendedNotificationType;
}

// Type guard to check if a value is a valid NotificationType
export function isValidNotificationType(type: string): type is NotificationType {
  return Object.values(NotificationType).includes(type as NotificationType);
}

// Type guard to check if a value is a valid ExtendedNotificationType
export function isValidExtendedNotificationType(type: string): type is ExtendedNotificationTypes {
  return Object.values(ExtendedNotificationTypes).includes(type as ExtendedNotificationTypes);
}

// Type guard to check if a value is a valid CustomNotificationType
export function isValidCustomNotificationType(type: string): type is CustomNotificationTypes {
  return Object.values(CustomNotificationTypes).includes(type as CustomNotificationTypes);
}

// Type guard to check if a value is a valid notification type (any kind)
export function isValidAnyNotificationType(type: string): type is ExtendedNotificationType {
  return isValidNotificationType(type) || 
         isValidExtendedNotificationType(type) || 
         isValidCustomNotificationType(type);
} 