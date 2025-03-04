import express from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { protect } from '../middleware/auth.js';
import { hipaaLogger } from '../middleware/encryption.js';
const router = express.Router();
// Apply protection and HIPAA logging to all routes
router.use(protect);
router.use(hipaaLogger);
// Analytics routes
router.get('/system', analyticsController.getSystemMetrics);
router.get('/users/:userId', analyticsController.getUserMetrics);
router.get('/files/:fileId/history', analyticsController.getFileAccessHistory);
export default router;
//# sourceMappingURL=analytics.js.map