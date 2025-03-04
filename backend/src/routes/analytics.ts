import express, { RequestHandler } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { protect } from '../middleware/auth.js';
import { hipaaLogger } from '../middleware/encryption.js';

const router = express.Router();

// Apply protection and HIPAA logging to all routes
router.use(protect as RequestHandler);
router.use(hipaaLogger as RequestHandler);

// Analytics routes
router.get('/system', analyticsController.getSystemMetrics as unknown as RequestHandler);
router.get('/users/:userId', analyticsController.getUserMetrics as unknown as RequestHandler);
router.get('/files/:fileId/history', analyticsController.getFileAccessHistory as unknown as RequestHandler);

export default router; 