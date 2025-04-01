import { Router } from 'express';
import { protect, restrictTo } from '../middleware/clerk.js';
import { auditController } from '../controllers/audit.controller.js';
import { Role } from '@prisma/client';
import type { RequestHandler } from 'express';

const router = Router();

// Apply protection middleware to all routes
router.use(protect as RequestHandler);

// Restrict all audit routes to Admin
router.use(restrictTo(Role.ADMIN) as RequestHandler);

// Audit log routes
router.route('/')
  .get(auditController.getAuditLogs as RequestHandler);

router.route('/:id')
  .get(auditController.getAuditLog as RequestHandler);

export default router; 