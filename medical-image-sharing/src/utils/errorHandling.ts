import { useToast } from '@/contexts/ToastContext';

interface ErrorHandlerOptions {
  logToConsole?: boolean;
  showToast?: boolean;
  fallbackMessage?: string;
  context?: string;
  toast?: any;
}

/**
 * Standardized error handler that logs errors and returns user-friendly messages
 * 
 * @param error The error object to handle
 * @param options Options for error handling
 * @returns A user-friendly error message string
 */
export function handleError(
  error: unknown, 
  options: ErrorHandlerOptions = {}
): string {
  const {
    logToConsole = true,
    showToast = false,
    fallbackMessage = 'An unexpected error occurred. Please try again.',
    context = 'Operation',
    toast = null,
  } = options;

  // Extract error message from different error types
  let errorMessage: string;
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    errorMessage = error.message;
  } else {
    errorMessage = fallbackMessage;
  }

  // Prepend context if not already included
  if (!errorMessage.includes(context) && context !== 'Operation') {
    errorMessage = `${context} failed: ${errorMessage}`;
  }

  // Log to console if enabled
  if (logToConsole) {
    console.error(`[${context}]`, error);
  }

  // Show toast notification if enabled
  if (showToast && toast) {
    try {
      toast.showError(errorMessage);
    } catch (e) {
      console.warn('Toast provider not available for error notification');
    }
  }

  return errorMessage;
}

/**
 * Creates a standardized API error response handler
 * 
 * @param context The operation context (e.g., "Loading patients")
 * @returns A function to use in catch blocks
 */
export function createErrorHandler(context: string) {
  return (error: unknown, showToast = true): string => {
    return handleError(error, {
      logToConsole: true,
      showToast,
      context,
    });
  };
}

/**
 * Check if an API response indicates success
 * 
 * @param response The API response to check
 * @returns True if the response indicates success
 */
export function isSuccessResponse(response: any): boolean {
  return response && response.status === 'success' && response.data !== undefined;
}

/**
 * Extracts a user-friendly error message from an API response
 * 
 * @param response The API response object
 * @param fallback Fallback message if none can be extracted
 * @returns User-friendly error message
 */
export function getResponseErrorMessage(response: any, fallback = 'Operation failed'): string {
  if (!response) {
    return fallback;
  }
  
  // Check for standard error message
  if (response.message) {
    return response.message;
  }
  
  // Check for field validation errors
  if (response.errors && Array.isArray(response.errors) && response.errors.length > 0) {
    // If we have validation errors, combine them
    return response.errors.map((err: any) => {
      if (typeof err === 'string') return err;
      if (err.message) return err.message;
      if (err.field && err.message) return `${err.field}: ${err.message}`;
      return fallback;
    }).join('; ');
  }
  
  return fallback;
}

/**
 * Safely shows a toast notification with fallback to console
 * 
 * @param toast Toast object from useToast hook
 * @param message Message to display
 * @param type Type of toast notification
 * @param duration Optional duration in ms
 */
export function safeToast(
  toast: any,
  message: string, 
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  duration?: number
): void {
  try {
    if (!toast) {
      console.log(`[Toast ${type}]: ${message}`);
      return;
    }
    
    switch (type) {
      case 'success':
        toast.showSuccess(message, duration);
        break;
      case 'error':
        toast.showError(message, duration);
        break;
      case 'warning':
        toast.showWarning(message, duration);
        break;
      case 'info':
      default:
        toast.showInfo(message, duration);
        break;
    }
  } catch (e) {
    // Fallback to console
    const consoleMethod = type === 'error' ? console.error : 
                         type === 'warning' ? console.warn : console.log;
    consoleMethod(`[Toast not available] ${message}`);
  }
} 