import express from 'express';
import * as analysisController from '../controllers/analysis.controller.js';
import { protect } from '../middleware/clerk.js';
import { hipaaLogger } from '../middleware/encryption.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
const router = express.Router();
// Apply protection and HIPAA logging to all routes
router.use(protect);
router.use(hipaaLogger);
// Apply rate limiting to analysis endpoints
const analysisRateLimit = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes 
    max: 50 // limit each IP to 50 requests per windowMs
});
// Analysis routes
router.post('/analyze', analysisRateLimit, analysisController.analyzeImage);
// Using analyzeImage for batch analysis as batchAnalyzeImages doesn't exist
router.post('/batch-analyze', analysisRateLimit, analysisController.analyzeImage);
// Implement a placeholder for getAnalysisHistory since it doesn't exist in the controller
router.get('/history/:imageId', ((req, res) => {
    res.status(501).json({
        status: 'error',
        message: 'Analysis history endpoint not implemented yet'
    });
}));
export default router;
//# sourceMappingURL=analysis.js.map