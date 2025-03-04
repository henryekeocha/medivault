import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { restrictTo } from '../middleware/auth.js';
import { settingsController } from '../controllers/settings.controller.js';
import { Role } from '@prisma/client';
const router = Router();
// Apply protection middleware to all routes
router.use(protect);
// Restrict all settings routes to Admin
router.use(restrictTo(Role.ADMIN));
// System settings routes
router.route('/')
    .get(settingsController.getSystemSettings)
    .put(settingsController.updateSystemSettings);
export default router;
//# sourceMappingURL=system.settings.js.map