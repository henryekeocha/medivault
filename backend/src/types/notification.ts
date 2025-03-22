import { NotificationType } from '@prisma/client';

// Custom notification types that extend the base Prisma types
export enum CustomNotificationTypes {
  FILE_ERROR = 'FILE_ERROR',
  APPOINTMENT_SCHEDULED = 'APPOINTMENT_SCHEDULED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER'
}

// Combined type for all notification types
export type ExtendedNotificationType = NotificationType | CustomNotificationTypes;

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

// Type guard to check if a value is a valid CustomNotificationType
export function isValidCustomNotificationType(type: string): type is CustomNotificationTypes {
  return Object.values(CustomNotificationTypes).includes(type as CustomNotificationTypes);
}

// Type guard to check if a value is a valid ExtendedNotificationType
export function isValidExtendedNotificationType(type: string): type is ExtendedNotificationType {
  return isValidNotificationType(type) || isValidCustomNotificationType(type);
} 