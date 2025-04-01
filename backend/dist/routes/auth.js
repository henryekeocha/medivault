import express from 'express';
import { getCurrentUser, logout } from '../controllers/auth.controller.js';
import { protect } from '../middleware/clerk.js';
const router = express.Router();
// Public routes are now handled by Clerk
// We only need to handle backend-specific auth operations
// Protected routes
router.use(protect);
// Get current user info
router.get('/me', getCurrentUser);
// Logout (handles backend session cleanup)
router.post('/logout', logout);
export default router;
//# sourceMappingURL=auth.js.map