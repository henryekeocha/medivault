import { Request } from 'express';
import { AppError } from './appError.js';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateImageFile = (file: Express.Multer.File): void => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/dicom'];
  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new AppError('Invalid file type. Only JPEG, PNG, and DICOM files are allowed', 400);
  }

  if (file.size > maxSize) {
    throw new AppError('File too large. Maximum size is 50MB', 400);
  }
};

export const validatePaginationParams = (
  page?: string,
  limit?: string
): { page: number; limit: number } => {
  const defaultPage = 1;
  const defaultLimit = 10;
  const maxLimit = 100;

  let parsedPage = page ? parseInt(page) : defaultPage;
  let parsedLimit = limit ? parseInt(limit) : defaultLimit;

  if (isNaN(parsedPage) || parsedPage < 1) {
    parsedPage = defaultPage;
  }

  if (isNaN(parsedLimit) || parsedLimit < 1) {
    parsedLimit = defaultLimit;
  }

  if (parsedLimit > maxLimit) {
    parsedLimit = maxLimit;
  }

  return { page: parsedPage, limit: parsedLimit };
};

export const validateDateRange = (
  startDate?: string,
  endDate?: string
): { start: Date; end: Date } => {
  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate) : new Date();

  if (isNaN(start.getTime())) {
    throw new AppError('Invalid start date', 400);
  }

  if (isNaN(end.getTime())) {
    throw new AppError('Invalid end date', 400);
  }

  if (start > end) {
    throw new AppError('Start date must be before end date', 400);
  }

  return { start, end };
};

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/['"]/g, ''); // Remove quotes to prevent SQL injection
}; 