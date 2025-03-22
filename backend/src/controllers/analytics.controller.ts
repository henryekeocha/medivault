import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';
import { AppError } from '../utils/appError.js';
import { User, Role } from '@prisma/client';

// Define a type for the authenticated user data
interface AuthUser {
  id: string;
  role: Role;
}

interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user: AuthUser;
  analyticsService: AnalyticsService;
}

export const getSystemMetrics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Only allow admins to access system metrics
    if (req.user.role !== Role.ADMIN) {
      return next(new AppError('Not authorized to access system metrics', 403));
    }

    const metrics = await req.analyticsService.getSystemMetrics();

    res.status(200).json({
      status: 'success',
      data: metrics
    });
  } catch (error) {
    next(error);
  }
};

export const getUserMetrics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId) {
      return next(new AppError('User ID is required', 400));
    }

    // Users can only access their own metrics unless they're admins
    if (userId !== req.user.id && req.user.role !== Role.ADMIN) {
      return next(new AppError('Not authorized to access these metrics', 403));
    }

    const metrics = await req.analyticsService.getUserMetrics(userId);

    res.status(200).json({
      status: 'success',
      data: metrics
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      console.error('Error in getUserMetrics controller:', error);
      next(new AppError('Failed to get user metrics', 500));
    }
  }
};

export const getFileAccessHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId } = req.params;

    // Validate fileId
    if (!fileId) {
      return next(new AppError('File ID is required', 400));
    }

    // Check if user has access to this file
    // This would typically check against a file_permissions table
    // Implementation depends on your access control system

    const history = await req.analyticsService.getFileAccessHistory(fileId);

    res.status(200).json({
      status: 'success',
      data: history
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      console.error('Error in getFileAccessHistory controller:', error);
      next(new AppError('Failed to get file access history', 500));
    }
  }
};

export const getProviderStatistics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { providerId } = req.params;

    // Validate providerId
    if (!providerId) {
      return next(new AppError('Provider ID is required', 400));
    }

    // Providers can only access their own statistics unless they're admins
    if (providerId !== req.user.id && req.user.role !== Role.ADMIN) {
      return next(new AppError('Not authorized to access these statistics', 403));
    }

    const statistics = await req.analyticsService.getProviderStatistics(providerId);

    res.status(200).json({
      status: 'success',
      data: statistics
    });
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      console.error('Error in getProviderStatistics controller:', error);
      next(new AppError('Failed to get provider statistics', 500));
    }
  }
}; 