import { useState, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { handleError, isSuccessResponse, getResponseErrorMessage } from '@/utils/errorHandling';

interface ErrorHandlerHookOptions {
  context?: string;
  initialError?: string | null;
  initialLoading?: boolean;
  showToastByDefault?: boolean;
}

export interface ErrorHandlerHook {
  error: string | null;
  loading: boolean;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearError: () => void;
  clearErrors: () => void; // Alias for clearError for backward compatibility
  handleError: (error: unknown, showToast?: boolean) => string;
  isSuccess: (response: any) => boolean;
  getErrorMessage: (response: any, fallback?: string) => string;
  throwError: (message: string) => never;
  withErrorHandling: <T>(fn: () => Promise<T>, options?: { showToast?: boolean; successMessage?: string }) => Promise<T>;
  retry: () => void; // Function to retry the last operation
}

type RetryFunction = () => void;

/**
 * React hook for standardized error handling in components
 * 
 * @param options Configuration options for error handling
 * @returns Error handling utilities and state
 */
export function useErrorHandler(options: ErrorHandlerHookOptions = {}): ErrorHandlerHook {
  const {
    context = 'Operation',
    initialError = null,
    initialLoading = false,
    showToastByDefault = true
  } = options;
  
  // Initialize state
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [lastRetryFn, setLastRetryFn] = useState<RetryFunction | null>(null);
  const toast = useToast();
  
  // Clear current error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Alias for clearError for backward compatibility
  const clearErrors = clearError;
  
  // Handle errors and set error state
  const handleErrorWithState = useCallback((err: unknown, showToast = showToastByDefault): string => {
    // If error is an Error object, extract message
    const errorObj = err instanceof Error ? err : null;
    const errorMessage = handleError(err, {
      context,
      showToast: false, // We'll handle toast display ourselves
      logToConsole: true,
    });
    
    // Set error state
    setError(errorMessage);
    
    // Set loading to false when an error occurs
    setLoading(false);
    
    // Show toast if requested
    if (showToast) {
      try {
        toast.showError(errorMessage);
      } catch (e) {
        console.warn('Toast not available for error notification');
      }
    }
    
    return errorMessage;
  }, [context, showToastByDefault, toast]);
  
  // Check if response is successful
  const isSuccess = useCallback((response: any): boolean => {
    return isSuccessResponse(response);
  }, []);
  
  // Get error message from response
  const getErrorMessage = useCallback((response: any, fallback = `${context} failed`): string => {
    return getResponseErrorMessage(response, fallback);
  }, [context]);
  
  // Throw an error with a specific message
  const throwError = useCallback((message: string): never => {
    throw new Error(message);
  }, []);
  
  // Function to retry the last operation
  const retry = useCallback(() => {
    if (lastRetryFn) {
      // Clear error before retrying
      clearError();
      lastRetryFn();
    }
  }, [lastRetryFn, clearError]);
  
  // Higher-order function to wrap async functions with error handling
  const withErrorHandling = useCallback(async <T>(
    fn: () => Promise<T>,
    options: { showToast?: boolean; successMessage?: string } = {}
  ): Promise<T> => {
    const { showToast = showToastByDefault, successMessage } = options;
    
    try {
      // Clear previous error
      clearError();
      
      // Store the function for retry capability
      setLastRetryFn(() => () => {
        withErrorHandling(fn, options).catch(() => {});
      });
      
      // Set loading state
      setLoading(true);
      
      // Execute the function
      const result = await fn();
      
      // Show success message if provided
      if (successMessage && showToast) {
        try {
          toast.showSuccess(successMessage);
        } catch (e) {
          console.warn('Toast not available for success notification');
        }
      }
      
      // Reset loading state
      setLoading(false);
      
      return result;
    } catch (err) {
      // Handle error
      handleErrorWithState(err, showToast);
      // Reset loading state
      setLoading(false);
      throw err; // Re-throw to allow caller to handle if needed
    }
  }, [clearError, handleErrorWithState, showToastByDefault, toast]);
  
  return {
    error,
    loading,
    setError,
    setLoading,
    clearError,
    clearErrors,
    handleError: handleErrorWithState,
    isSuccess,
    getErrorMessage,
    throwError,
    withErrorHandling,
    retry,
  };
} 