import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';
import { prisma } from '../lib/prisma.js';

// Extend the Express Request type to include analyticsService
declare global {
  namespace Express {
    interface Request {
      analyticsService?: AnalyticsService;
    }
  }
}

export const injectAnalyticsService = (req: Request, res: Response, next: NextFunction) => {
  // Create a new instance of AnalyticsService for each request
  req.analyticsService = new AnalyticsService(prisma);
  next();
}; 