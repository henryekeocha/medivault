import express from 'express';
import { protect } from '../middleware/auth.js';
import { getHealthMetrics, getHealthMetric, createHealthMetric, updateHealthMetric, deleteHealthMetric } from '../controllers/health-metric.controller.js';
const router = express.Router();
// Protect all health metric routes
router.use(protect);
// Get all health metrics for the authenticated user
router.get('/', getHealthMetrics);
// Create a new health metric
router.post('/', createHealthMetric);
// Get a specific health metric
router.get('/:id', getHealthMetric);
// Update a health metric
router.put('/:id', updateHealthMetric);
// Delete a health metric
router.delete('/:id', deleteHealthMetric);
export default router;
//# sourceMappingURL=health-metrics.js.map