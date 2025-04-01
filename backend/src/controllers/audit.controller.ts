import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { validatePaginationParams, validateDateRange } from '../utils/validators.js';

class AuditController {
  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    const { page = 1, limit = 10, startDate, endDate, userId, action, resourceType } = req.query;
    
    const where = {
      ...(startDate && { timestamp: { gte: new Date(startDate as string) } }),
      ...(endDate && { timestamp: { lte: new Date(endDate as string) } }),
      ...(userId && { userId: userId as string }),
      ...(action && { action: action as string }),
      ...(resourceType && { resourceType: resourceType as string })
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit)
        }
      }
    });
  }

  async getAuditLog(req: Request, res: Response, next: NextFunction) {
    const log = await prisma.auditLog.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    if (!log) {
      return next(new AppError('Audit log not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: log
    });
  }
}

export const auditController = new AuditController();

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
  const userId = req.query.userId as string;
  const action = req.query.action as string;

  const where = {
    ...(userId && { userId }),
    ...(action && { action }),
    timestamp: {
      gte: start,
      lte: end
    }
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    }),
    prisma.auditLog.count({ where })
  ]);

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
 * Create a new audit log entry
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns the created audit log
 * @throws {AppError} - Throws if there's an error creating the log
 */
export const createAuditLog = catchAsync(async (req: Request, res: Response) => {
  const { userId, action, details } = req.body;

  if (!userId || !action) {
    throw new AppError('User ID and action are required', 400);
  }

  const auditLog = await prisma.auditLog.create({
    data: {
      userId,
      action,
      details: details || null,
      timestamp: new Date()
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    }
  });

  res.status(201).json({
    status: 'success',
    data: {
      auditLog
    }
  });
}); 