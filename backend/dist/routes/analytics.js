import express from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { protect } from '../middleware/clerk.js';
import { injectAnalyticsService } from '../middleware/analytics.js';
const router = express.Router();
// Apply authentication middleware to all routes
router.use(protect);
// Inject analytics service into request
router.use(injectAnalyticsService);
// User metrics
router.get('/users/:userId/metrics', analyticsController.getUserMetrics);
// Provider analytics
router.get('/provider/:providerId', analyticsController.getProviderStatistics);
// File access history
router.get('/files/:fileId/history', analyticsController.getFileAccessHistory);
export default router;
//# sourceMappingURL=analytics.js.map