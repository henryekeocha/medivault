import express from 'express';
import * as syncController from '../controllers/sync.controller.js';
import { protect } from '../middleware/clerk.js';

const router = express.Router();

// Sync route - protected by authentication
router.post('/user', protect, syncController.syncUser);

export default router; 