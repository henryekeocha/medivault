import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

/**
 * @route GET /health
 * @desc Check the health of the API
 * @access Public
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbConnectivity = {
      status: 'connected',
      responseTime: Date.now() - dbStartTime
    };

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    
    // Overall system health
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbConnectivity
      },
      memoryUsage: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      },
      responseTime: Date.now() - startTime
    };
    
    return res.status(200).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: Date.now(),
      environment: process.env.NODE_ENV,
      error: process.env.NODE_ENV === 'development' ? String(error) : 'Service unhealthy',
      responseTime: Date.now() - startTime
    });
  }
});

export default router; 