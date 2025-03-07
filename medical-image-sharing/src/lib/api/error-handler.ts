import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import { S3ServiceException } from '@aws-sdk/client-s3';
import axios from 'axios';

// Import specific Prisma error types
import { 
  PrismaClientKnownRequestError,
  PrismaClientValidationError
} from '@prisma/client/runtime/library';

/**
 * Error codes for API responses
 */
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // External service errors
  S3_ERROR = 'S3_ERROR',
  VERIFICATION_SERVICE_ERROR = 'VERIFICATION_SERVICE_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  status: number;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * Get a standardized error response for API routes
 * @param error The error object
 * @param status HTTP status code (default: 500)
 * @param defaultMessage Default error message if none can be extracted
 * @returns NextResponse with error details
 */
export function getErrorResponse(
  error: unknown, 
  status: number = 500, 
  defaultMessage: string = 'An error occurred'
): NextResponse {
  console.error('API Error:', error);
  
  let message = defaultMessage;
  let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  const timestamp = new Date().toISOString();
  
  // Extract error details based on error type
  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
    
    // Check if it's an Axios error
    if (axios.isAxiosError(error)) {
      status = error.response?.status || 500;
      message = error.response?.data?.message || error.message;
      errorCode = error.response?.data?.error || 'API_ERROR';
    }
  }
  
  return NextResponse.json(
    {
      error: errorCode,
      message,
      timestamp
    },
    { status }
  );
}

interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

/**
 * Handles API errors and returns a standardized error object
 */
export function handleApiError(error: unknown): ApiError {
  console.error('API Error:', error);
  
  // Default error
  const defaultError: ApiError = {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500
  };
  
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    
    // Get the status code
    const statusCode = axiosError.response?.status || 500;
    
    // Try to extract error details from the response
    const errorData = axiosError.response?.data;
    const errorMessage = typeof errorData === 'object' && errorData 
      ? errorData.message || errorData.error || axiosError.message 
      : axiosError.message;
    
    // Map common status codes to error codes
    let errorCode = 'API_ERROR';
    
    switch (statusCode) {
      case 400:
        errorCode = 'BAD_REQUEST';
        break;
      case 401:
        errorCode = 'UNAUTHORIZED';
        break;
      case 403:
        errorCode = 'FORBIDDEN';
        break;
      case 404:
        errorCode = 'NOT_FOUND';
        break;
      case 409:
        errorCode = 'CONFLICT';
        break;
      case 429:
        errorCode = 'RATE_LIMITED';
        break;
      case 500:
        errorCode = 'SERVER_ERROR';
        break;
    }
    
    return {
      code: errorCode,
      message: errorMessage || 'An error occurred with the API request',
      statusCode
    };
  }
  
  if (error instanceof Error) {
    return {
      code: 'CLIENT_ERROR',
      message: error.message || 'An unexpected error occurred',
      statusCode: 500
    };
  }
  
  return defaultError;
} 