import express, { RequestHandler } from 'express';
import {
  getHealthMetrics,
  getHealthMetric,
  createHealthMetric,
  updateHealthMetric,
  deleteHealthMetric
} from '../controllers/health-metric.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect as RequestHandler);

// Patient health metrics routes
router.get('/api/v1/patient/:patientId/health-metrics', getHealthMetrics as RequestHandler);
router.get('/api/v1/patient/:patientId/health-metrics/:metricId', getHealthMetric as RequestHandler);
router.post('/api/v1/patient/health-metrics', createHealthMetric as RequestHandler);
router.put('/api/v1/patient/:patientId/health-metrics/:metricId', updateHealthMetric as RequestHandler);
router.delete('/api/v1/patient/:patientId/health-metrics/:metricId', deleteHealthMetric as RequestHandler);

export default router;  