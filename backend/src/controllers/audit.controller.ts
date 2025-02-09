import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../middleware/errorHandler.js';
import { validatePaginationParams, validateDateRange } from '../utils/validators.js';
import { AuditLog } from '../entities/AuditLog.js';
import { Between } from 'typeorm';

const auditLogRepository = AppDataSource.getRepository(AuditLog);

/**
 * Get all audit logs with pagination
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns paginated audit logs
 * @throws {AppError} - Throws if there's an error retrieving logs
 */
export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const { page, limit } = validatePaginationParams(
    req.query.page as string,
    req.query.limit as string
  );

  const [logs, total] = await auditLogRepository.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
    relations: {
      user: true
    },
    select: {
      user: {
        id: true,
        username: true,
        email: true
      }
    },
    order: {
      timestamp: 'DESC'
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * Get a single audit log by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns the requested audit log
 * @throws {AppError} - Throws if log is not found
 */
export const getAuditLog = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
  const action = req.query.action as string;
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

  const where: any = {
    timestamp: Between(startDate, endDate)
  };

  if (action) {
    where.action = action;
  }

  if (userId) {
    where.userId = userId;
  }

  const [auditLogs, total] = await auditLogRepository.findAndCount({
    where,
    relations: {
      user: true
    },
    select: {
      user: {
        id: true,
        email: true,
        username: true
      }
    },
    skip: (page - 1) * limit,
    take: limit,
    order: {
      timestamp: 'DESC'
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      auditLogs,
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * Search audit logs with filters
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns filtered and paginated audit logs
 * @throws {AppError} - Throws if there's an error with the search parameters
 */
export const searchAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const { page, limit } = validatePaginationParams(
    req.query.page as string,
    req.query.limit as string
  );
  const { start, end } = validateDateRange(
    req.query.startDate as string,
    req.query.endDate as string
  );
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  const action = req.query.action as string;

  const where: any = {
    ...(userId && { userId }),
    ...(action && { action }),
    timestamp: Between(start, end)
  };

  const [logs, total] = await auditLogRepository.findAndCount({
    where,
    skip: (page - 1) * limit,
    take: limit,
    relations: {
      user: true
    },
    select: {
      user: {
        id: true,
        username: true,
        email: true
      }
    },
    order: {
      timestamp: 'DESC'
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
}); 