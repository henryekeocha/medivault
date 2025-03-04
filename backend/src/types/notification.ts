import { NotificationType } from '@prisma/client';

// Extend Prisma's NotificationType with our custom types using a string type
export type ExtendedNotificationType = NotificationType | 
  'FILE_ERROR' | 
  'APPOINTMENT_SCHEDULED' | 
  'APPOINTMENT_REMINDER';

// Map for convenience when needing to work with our extended types
export const CustomNotificationTypes = {
  FILE_ERROR: 'FILE_ERROR' as ExtendedNotificationType,
  APPOINTMENT_SCHEDULED: 'APPOINTMENT_SCHEDULED' as ExtendedNotificationType,
  APPOINTMENT_REMINDER: 'APPOINTMENT_REMINDER' as ExtendedNotificationType
};

// Type guard to check if a value is a valid NotificationType
export function isValidNotificationType(type: string): type is NotificationType {
  return Object.values(NotificationType).includes(type as NotificationType);
}

// Type guard to check if a value is a valid ExtendedNotificationType
export function isValidExtendedNotificationType(type: string): type is ExtendedNotificationType {
  return isValidNotificationType(type) ||
    Object.values(CustomNotificationTypes).includes(type as ExtendedNotificationType);
} 