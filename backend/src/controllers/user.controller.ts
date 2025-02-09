import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../middleware/errorHandler.js';
import { User } from '../entities/User.js';

const userRepository = AppDataSource.getRepository(User);

// Get all users (Admin only)
export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await userRepository.find({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      twoFactorEnabled: true,
      password: false,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      users,
    },
  });
});

// Get user by ID (Admin only)
export const getUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userRepository.findOne({
    where: { id: parseInt(req.params.id) },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      twoFactorEnabled: true,
      password: false,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Update user (Admin only)
export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { role, isActive } = req.body;
  const userId = parseInt(req.params.id);

  const user = await userRepository.findOne({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.role = role;
  user.isActive = isActive;

  await userRepository.save(user);

  const updatedUser = await userRepository.findOne({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      twoFactorEnabled: true,
      password: false,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// Delete user (Admin only)
export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userRepository.findOne({
    where: { id: parseInt(req.params.id) }
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  await userRepository.remove(user);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get own profile
export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await userRepository.findOne({
    where: { id: req.user!.id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      twoFactorEnabled: true,
      password: false,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// Update own profile
export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const { username, email } = req.body;
  const userId = req.user!.id;

  const user = await userRepository.findOne({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.username = username;
  user.email = email;

  await userRepository.save(user);

  const updatedUser = await userRepository.findOne({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      twoFactorEnabled: true,
      password: false,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
}); 