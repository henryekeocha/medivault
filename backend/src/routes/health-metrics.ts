import { Router } from 'express';
import { protect } from '../middleware/clerk.js';
import { 
  getHealthMetrics,
  getHealthMetric,
  createHealthMetric,
  updateHealthMetric,
  deleteHealthMetric
} from '../controllers/health-metric.controller.js';
import type { RequestHandler } from 'express';

const router = Router();

// Apply protection middleware to all routes
router.use(protect as RequestHandler);

// Health metrics routes
router.route('/')
  .get(getHealthMetrics as RequestHandler)
  .post(createHealthMetric as RequestHandler);

router.route('/:id')
  .get(getHealthMetric as RequestHandler)
  .put(updateHealthMetric as RequestHandler)
  .delete(deleteHealthMetric as RequestHandler);

// Analytics routes
router.route('/analytics')
  .get((req, res, next) => res.status(501).json({ message: 'Not implemented' }));

export default router;  