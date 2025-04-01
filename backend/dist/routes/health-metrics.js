import { Router } from 'express';
import { protect } from '../middleware/clerk.js';
import { getHealthMetrics, getHealthMetric, createHealthMetric, updateHealthMetric, deleteHealthMetric } from '../controllers/health-metric.controller.js';
const router = Router();
// Apply protection middleware to all routes
router.use(protect);
// Health metrics routes
router.route('/')
    .get(getHealthMetrics)
    .post(createHealthMetric);
router.route('/:id')
    .get(getHealthMetric)
    .put(updateHealthMetric)
    .delete(deleteHealthMetric);
// Analytics routes
router.route('/analytics')
    .get((req, res, next) => res.status(501).json({ message: 'Not implemented' }));
export default router;
//# sourceMappingURL=health-metrics.js.map