import { format, parseISO } from 'date-fns';

/**
 * Format a date to a readable string
 * @param date The date to format (Date object or ISO string)
 * @param formatString The format string (default: 'MMM d, yyyy')
 * @returns The formatted date string
 */
export function formatDate(date: Date | string, formatString = 'MMM d, yyyy'): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format a date to a time string
 * @param date The date to format (Date object or ISO string)
 * @param formatString The format string (default: 'h:mm a')
 * @returns The formatted time string
 */
export function formatTime(date: Date | string, formatString = 'h:mm a'): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
}

/**
 * Format a date to a datetime string
 * @param date The date to format (Date object or ISO string)
 * @param formatString The format string (default: 'MMM d, yyyy h:mm a')
 * @returns The formatted datetime string
 */
export function formatDateTime(date: Date | string, formatString = 'MMM d, yyyy h:mm a'): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
} 