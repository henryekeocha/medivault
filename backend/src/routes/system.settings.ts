import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getSystemSettings,
  updateSystemSettings,
  getStorageStats,
} from '../controllers/settings.controller.js';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);
router.use(restrictTo('admin'));

router
  .route('/')
  .get(getSystemSettings)
  .patch(updateSystemSettings);

router.get('/storage', getStorageStats);

export default router; 