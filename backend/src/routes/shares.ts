import express from 'express';
import { protect } from '../middleware/clerk.js';
import {
  getShares,
  createShare,
  revokeShare,
} from '../controllers/share.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all shares for the current user
router.get('/', getShares);

// Create a new share
router.post('/', createShare);

// Revoke a share
router.delete('/:id', revokeShare);

export default router; 