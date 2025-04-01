import { Router } from 'express';
import { protect } from '../middleware/clerk.js';
import { restrictTo } from '../middleware/clerk.js';
import { settingsController } from '../controllers/settings.controller.js';
import { Role } from '@prisma/client';
import type { RequestHandler } from 'express';

const router = Router();

// Apply protection middleware to all routes
router.use(protect as RequestHandler);

// Restrict all settings routes to Admin
router.use(restrictTo(Role.ADMIN) as RequestHandler);

// System settings routes
router.route('/')
  .get(settingsController.getSystemSettings as RequestHandler)
  .put(settingsController.updateSystemSettings as RequestHandler);

export default router; 