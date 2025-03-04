import express from 'express';
import type { RequestHandler } from 'express';
import * as analysisController from '../controllers/analysis.controller.js';
import { protect } from '../middleware/auth.js';
import { hipaaLogger } from '../middleware/encryption.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply protection and HIPAA logging to all routes
router.use(protect as RequestHandler);
router.use(hipaaLogger as RequestHandler);

// Apply rate limiting to analysis endpoints
const analysisRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes 
  max: 50 // limit each IP to 50 requests per windowMs
});

// Analysis routes
router.post(
  '/analyze',
  analysisRateLimit,
  analysisController.analyzeImage as unknown as RequestHandler
);

// Using analyzeImage for batch analysis as batchAnalyzeImages doesn't exist
router.post(
  '/batch-analyze',
  analysisRateLimit,
  analysisController.analyzeImage as unknown as RequestHandler
);

// Implement a placeholder for getAnalysisHistory since it doesn't exist in the controller
router.get(
  '/history/:imageId',
  ((req, res) => {
    res.status(501).json({
      status: 'error',
      message: 'Analysis history endpoint not implemented yet'
    });
  }) as RequestHandler
);

export default router; 