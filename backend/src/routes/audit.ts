import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getAuditLogs,
  getAuditLog,
  searchAuditLogs,
} from '../controllers/audit.controller.js';

const router = express.Router();

// Protected routes - Admin only
router.use(protect);
router.use(restrictTo('Admin'));

router.get('/', getAuditLogs);
router.get('/search', searchAuditLogs);
router.get('/:id', getAuditLog);

export default router; 