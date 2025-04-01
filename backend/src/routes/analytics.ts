import express, { RequestHandler } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { protect } from '../middleware/clerk.js';
import { injectAnalyticsService } from '../middleware/analytics.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect as RequestHandler);

// Inject analytics service into request
router.use(injectAnalyticsService as RequestHandler);

// User metrics
router.get('/users/:userId/metrics', analyticsController.getUserMetrics as unknown as RequestHandler);

// Provider analytics
router.get('/provider/:providerId', analyticsController.getProviderStatistics as unknown as RequestHandler);

// File access history
router.get('/files/:fileId/history', analyticsController.getFileAccessHistory as unknown as RequestHandler);

// System metrics - for admin dashboard
router.get('/system', analyticsController.getSystemMetrics as unknown as RequestHandler);

export default router; 