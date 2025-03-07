/**
 * Extension of the Date object to add a toRelativeTime method
 */
declare global {
  interface Date {
    /**
     * Returns a string representing the relative time from now (e.g., "2 minutes ago", "in 3 days")
     */
    toRelativeTime(): string;
  }
}

/**
 * Formats a date as a relative time string (e.g., "5 minutes ago", "in 2 days")
 * @param date - The date to format
 * @returns A relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 0) {
    return formatFutureTime(diffInSeconds);
  }
  
  if (diffInSeconds < 60) {
    return diffInSeconds === 1 ? '1 second ago' : `${diffInSeconds} seconds ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1 ? 'Yesterday' : `${diffInDays} days ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 5) {
    return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;
}

/**
 * Formats a future time difference as a relative time string (e.g., "in 5 minutes", "in 2 days")
 * @param diffInSeconds - Negative number representing seconds until the future time
 * @returns A relative time string for future dates
 */
function formatFutureTime(diffInSeconds: number): string {
  const positiveDiff = Math.abs(diffInSeconds);
  
  if (positiveDiff < 60) {
    return positiveDiff === 1 ? 'in 1 second' : `in ${positiveDiff} seconds`;
  }
  
  const diffInMinutes = Math.floor(positiveDiff / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? 'in 1 minute' : `in ${diffInMinutes} minutes`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? 'in 1 hour' : `in ${diffInHours} hours`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1 ? 'Tomorrow' : `in ${diffInDays} days`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 5) {
    return diffInWeeks === 1 ? 'in 1 week' : `in ${diffInWeeks} weeks`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? 'in 1 month' : `in ${diffInMonths} months`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? 'in 1 year' : `in ${diffInYears} years`;
}

// Add toRelativeTime method to Date prototype
if (typeof Date.prototype.toRelativeTime !== 'function') {
  Date.prototype.toRelativeTime = function(): string {
    return formatRelativeTime(this);
  };
}

/**
 * Formats a date as a localized string
 * @param date - The date to format
 * @param options - Intl.DateTimeFormatOptions object
 * @returns A formatted date string
 */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Converts a date string to a formatted date display
 * @param dateString - ISO date string
 * @param format - Display format ('short', 'medium', 'long', 'full')
 * @returns Formatted date string
 */
export function formatDateString(dateString: string, format: 'short' | 'medium' | 'long' | 'full' = 'medium'): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: format === 'short' ? 'numeric' : 'long', 
      day: 'numeric',
      hour: format === 'short' ? undefined : '2-digit',
      minute: format === 'short' ? undefined : '2-digit'
    };
    
    return formatDate(date, options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
} 