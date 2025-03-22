import express from 'express';
import {
  register,
  login,
  enable2FA,
  disable2FA,
  refreshToken,
  validateToken,
  getCurrentUser,
  logout
} from '../controllers/auth.controller.js';
import socialLoginRoutes from './auth/social-login.js';
import deviceRoutes from './auth/devices.js';
import mfaRoutes from './auth/mfa.js';
import userRoutes from './auth/user.js';
import sessionRoutes from './auth/session.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login); 
router.post('/refresh', refreshToken); 

// Social login routes
router.use('/social', socialLoginRoutes);

// Session routes (has both public and protected endpoints)
router.use('/session', sessionRoutes);

// The following routes are protected, but we're now handling protection
// with the bypassAuth middleware at the app level, so we don't need
// to use protect here anymore
// 
// router.use(protect); // This line is commented out now
//
// Each protected route will be checked by bypassAuth automatically
router.get('/validate', validateToken);
router.get('/me', getCurrentUser);
router.post('/2fa/enable', enable2FA);
router.post('/2fa/disable', disable2FA);
router.post('/logout', logout);

// Device tracking routes
router.use('/devices', deviceRoutes);

// MFA routes
router.use('/mfa', mfaRoutes);

// User routes
router.use('/user', userRoutes);

export default router; 