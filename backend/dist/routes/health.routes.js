import express from 'express';
import { prisma } from '../lib/prisma.js';
const router = express.Router();
/**
 * @route GET /health
 * @desc Check the health of the API
 * @access Public
 */
router.get('/', async (req, res) => {
    try {
        // Test database connection
        await prisma.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: 'success',
            message: 'Backend is healthy',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Backend health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
export default router;
//# sourceMappingURL=health.routes.js.map