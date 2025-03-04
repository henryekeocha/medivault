import express, { RequestHandler } from 'express';
import { protect } from '../middleware/auth.js';
import {
  getHealthMetrics,
  getHealthMetric,
  createHealthMetric,
  updateHealthMetric,
  deleteHealthMetric
} from '../controllers/health-metric.controller.js';

const router = express.Router();

// Protect all health metric routes
router.use(protect as RequestHandler);

// Get all health metrics for the authenticated user
router.get('/', getHealthMetrics as RequestHandler);

// Create a new health metric
router.post('/', createHealthMetric as RequestHandler);

// Get a specific health metric
router.get('/:id', getHealthMetric as RequestHandler);

// Update a health metric
router.put('/:id', updateHealthMetric as RequestHandler);

// Delete a health metric
router.delete('/:id', deleteHealthMetric as RequestHandler);

export default router;  