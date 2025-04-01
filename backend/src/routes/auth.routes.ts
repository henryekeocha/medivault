import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { protect } from '../middleware/clerk.js';
import { optionalAuth } from '../middleware/twoFactorAuth.js';

const router = express.Router();

// Protected route - requires user to be authenticated
router.get('/me', protect, authController.getCurrentUser);

// User synchronization with Clerk (for manual sync only - webhooks handle most cases)
router.post('/sync', authController.syncUser);
router.post('/sync/:clerkId', authController.syncUser);

// 2FA routes with optional auth (will use auth token if provided)
router.post('/send-code', optionalAuth, authController.sendVerificationCode);
router.post('/verify-code', optionalAuth, authController.verifyCode);

// Test endpoint (development only)
router.post('/test-user', authController.createTestUser);

export default router; 