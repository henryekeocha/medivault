import express from 'express';
import { register, login, enable2FA, disable2FA, refreshToken, validateToken, getCurrentUser } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
const router = express.Router();
// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
// Protected routes
router.use(protect); // All routes after this middleware require authentication
router.get('/validate', validateToken);
router.get('/me', getCurrentUser);
router.post('/2fa/enable', enable2FA);
router.post('/2fa/disable', disable2FA);
export default router;
//# sourceMappingURL=auth.js.map