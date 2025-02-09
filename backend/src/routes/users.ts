import express from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
  getProfile,
} from '../controllers/user.controller.js';

const router = express.Router();

// Protected routes
router.use(protect);

// User profile routes
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);

// Admin only routes
router.use(restrictTo('Admin'));
router.get('/', getAllUsers);
router.get('/:id', getUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router; 