import { Router } from 'express';
import { protect } from '../middleware/clerk.js';
import { restrictTo } from '../middleware/clerk.js';
import { userController } from '../controllers/user.controller.js';
import { Role } from '@prisma/client';
import type { RequestHandler } from 'express';

const router = Router();

// Apply protection middleware to all routes
router.use(protect as RequestHandler);

// Profile routes - available to all authenticated users
router.route('/profile')
  .get(userController.getProfile as RequestHandler)
  .put(userController.updateProfile as RequestHandler);

// Restrict user management routes to Provider and Admin
router.use(restrictTo(Role.PROVIDER, Role.ADMIN) as RequestHandler);

// User management routes
router.route('/')
  .get(userController.getAllUsers as RequestHandler)
  .post(userController.createUser as RequestHandler);

router.route('/:id')
  .get(userController.getUser as RequestHandler)
  .put(userController.updateUser as RequestHandler)
  .delete(userController.deleteUser as RequestHandler);

export default router; 