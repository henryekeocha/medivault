import { Request, Response } from 'express';
import { AppDataSource } from '../config/database.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../middleware/errorHandler.js';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { SystemSettings } from '../entities/SystemSettings.js';
import { User } from '../entities/User.js';
import { Image } from '../entities/Image.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Get user settings for the authenticated user
 * @param {Request} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns user settings or creates default settings
 * @throws {AppError} - Throws if there's an error retrieving settings
 */
export const getSettings = catchAsync(async (req: Request, res: Response) => {
  const settingsRepository = AppDataSource.getRepository(SystemSettings);
  const settings = await settingsRepository.findOne({
    where: {
      userId: req.user!.id,
    },
  });

  if (!settings) {
    // Create default settings if they don't exist
    const defaultSettings = await settingsRepository.save({
      userId: req.user!.id,
      emailNotifications: true,
      theme: 'light',
      language: 'en',
    });

    return res.status(200).json({
      status: 'success',
      data: {
        settings: defaultSettings,
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      settings,
    },
  });
});

/**
 * Update user settings for the authenticated user
 * @param {Request} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns updated user settings
 * @throws {AppError} - Throws if there's an error updating settings
 */
export const updateSettings = catchAsync(async (req: Request, res: Response) => {
  const { emailNotifications, theme, language } = req.body;

  const settingsRepository = AppDataSource.getRepository(SystemSettings);
  const settings = await settingsRepository.save({
    userId: req.user!.id,
    emailNotifications,
    theme,
    language,
  });

  res.status(200).json({
    status: 'success',
    data: {
      settings,
    },
  });
});

// Update password
export const updatePassword = catchAsync(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: {
      id: req.user!.id,
    },
    select: {
      password: true,
    },
  });

  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    throw new AppError('Current password is incorrect', 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await userRepository.update(req.user!.id, {
    password: hashedPassword,
  });

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully',
  });
});

// Toggle 2FA
export const toggleTwoFactor = catchAsync(async (req: Request, res: Response) => {
  const { enable, token } = req.body;

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: {
      id: req.user!.id,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (enable) {
    // Generate new secret if enabling 2FA
    const secret = authenticator.generateSecret();
    
    // Verify the token before enabling
    const isValid = authenticator.verify({
      token,
      secret,
    });

    if (!isValid) {
      throw new AppError('Invalid 2FA token', 401);
    }

    await userRepository.update(req.user!.id, {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
    });

    res.status(200).json({
      status: 'success',
      message: '2FA enabled successfully',
      data: {
        secret,
      },
    });
  } else {
    // Disable 2FA
    await userRepository.update(req.user!.id, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });

    res.status(200).json({
      status: 'success',
      message: '2FA disabled successfully',
    });
  }
});

// Generate backup codes
export const generateBackupCodes = catchAsync(async (req: Request, res: Response) => {
  // Generate 10 backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex')
  );

  // Hash the backup codes before storing
  const hashedCodes = await Promise.all(
    backupCodes.map((code) => bcrypt.hash(code, 12))
  );

  // Store hashed backup codes
  const userRepository = AppDataSource.getRepository(User);
  await userRepository.update(req.user!.id, {
    backupCodes: hashedCodes,
  });

  res.status(200).json({
    status: 'success',
    data: {
      backupCodes, // Send plain backup codes to user
    },
    message: 'Store these backup codes safely. They cannot be shown again.',
  });
});

/**
 * Get system-wide settings
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns system settings
 * @throws {AppError} - Throws if settings are not found
 */
export const getSystemSettings = catchAsync(async (req: Request, res: Response) => {
  const settingsRepository = AppDataSource.getRepository(SystemSettings);
  const settings = await settingsRepository.findOne({ where: { id: 1 } });

  if (!settings) {
    throw new AppError('System settings not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      settings,
    },
  });
});

/**
 * Update system-wide settings
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns updated system settings
 * @throws {AppError} - Throws if there's an error updating settings
 */
export const updateSystemSettings = catchAsync(async (req: Request, res: Response) => {
  const {
    maxStoragePerUser,
    maxFileSize,
    allowedFileTypes,
    retentionPeriod,
    autoDeleteExpired,
  } = req.body;

  const settingsRepository = AppDataSource.getRepository(SystemSettings);
  let settings = await settingsRepository.findOne({ where: { id: 1 } });

  if (!settings) {
    settings = settingsRepository.create({
      id: 1,
      maxUploadSize: maxFileSize,
      allowedFileTypes,
      maxShareDuration: retentionPeriod,
    });
  } else {
    if (maxFileSize) settings.maxUploadSize = maxFileSize;
    if (allowedFileTypes) settings.allowedFileTypes = allowedFileTypes;
    if (retentionPeriod) settings.maxShareDuration = retentionPeriod;
  }

  await settingsRepository.save(settings);

  res.status(200).json({
    status: 'success',
    data: {
      settings,
    },
  });
});

/**
 * Get storage statistics for the system
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns storage statistics including total usage and per-user stats
 * @throws {AppError} - Throws if there's an error retrieving storage statistics
 */
export const getStorageStats = catchAsync(async (req: Request, res: Response) => {
  const userRepository = AppDataSource.getRepository(User);
  const imageRepository = AppDataSource.getRepository(Image);

  // Get total users and total images
  const [totalUsers, totalImages] = await Promise.all([
    userRepository.count(),
    imageRepository.count(),
  ]);

  // Calculate total storage used from S3
  const command = new ListObjectsV2Command({
    Bucket: process.env.AWS_BUCKET_NAME,
  });

  let totalStorageBytes = 0;
  let isTruncated = true;
  let continuationToken: string | undefined;

  while (isTruncated) {
    if (continuationToken) {
      command.input.ContinuationToken = continuationToken;
    }

    const response = await s3Client.send(command);
    
    if (response.Contents) {
      totalStorageBytes += response.Contents.reduce((acc, obj) => acc + (obj.Size || 0), 0);
    }

    isTruncated = response.IsTruncated || false;
    continuationToken = response.NextContinuationToken;
  }

  // Get storage usage per user
  const users = await userRepository.find({
    relations: ['images'],
    select: ['id', 'username', 'email'],
  });

  const userStats = users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    imageCount: user.images.length,
    totalStorage: user.images.reduce((acc, img) => acc + (img.size || 0), 0),
  }));

  res.status(200).json({
    status: 'success',
    data: {
      totalUsers,
      totalImages,
      totalStorageBytes,
      totalStorageGB: (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2),
      userStats,
    },
  });
});

// Add type annotations for the parameters in the functions
const calculateStorageUsage = async (users: User[]): Promise<number> => {
  const totalStorage = users.reduce((acc: number, user: User) => {
    const userStorage = user.images.reduce((acc: number, img: Image) => {
      return acc + (img.size || 0);
    }, 0);
    return acc + userStorage;
  }, 0);

  return totalStorage;
}; 