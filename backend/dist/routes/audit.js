import { Router } from 'express';
import { protect, restrictTo } from '../middleware/clerk.js';
import { auditController } from '../controllers/audit.controller.js';
import { Role } from '@prisma/client';
const router = Router();
// Apply protection middleware to all routes
router.use(protect);
// Restrict all audit routes to Admin
router.use(restrictTo(Role.ADMIN));
// Audit log routes
router.route('/')
    .get(auditController.getAuditLogs);
router.route('/:id')
    .get(auditController.getAuditLog);
export default router;
//# sourceMappingURL=audit.js.map