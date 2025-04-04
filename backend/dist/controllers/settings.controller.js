import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { prisma } from '../lib/prisma.js';
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
/**
 * Get user settings for the authenticated user
 * @param {Request} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns user settings or creates default settings
 * @throws {AppError} - Throws if there's an error retrieving settings
 */
export const getSettings = catchAsync(async (req, res) => {
    const settings = await prisma.userSettings.findUnique({
        where: {
            userId: req.user.id,
        },
    });
    if (!settings) {
        // Create default settings if they don't exist
        const defaultSettings = await prisma.userSettings.create({
            data: {
                userId: req.user.id,
                emailNotifications: true,
                pushNotifications: true,
                messageNotifications: true,
                shareNotifications: true,
                theme: 'light',
                language: 'en',
                timezone: 'UTC',
                highContrast: false,
                fontSize: 'normal',
                reduceMotion: false,
                profileVisibility: 'public',
                showOnlineStatus: true
            },
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
export const updateSettings = catchAsync(async (req, res) => {
    const settings = await prisma.userSettings.update({
        where: {
            userId: req.user.id,
        },
        data: req.body,
    });
    res.status(200).json({
        status: 'success',
        data: {
            settings,
        },
    });
});
// Update password
export const updatePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({
        where: {
            id: req.user.id,
        },
        select: {
            password: true,
        },
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        throw new AppError('Current password is incorrect', 401);
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
        where: {
            id: req.user.id,
        },
        data: {
            password: hashedPassword,
        },
    });
    res.status(200).json({
        status: 'success',
        message: 'Password updated successfully',
    });
});
// Toggle 2FA
export const toggleTwoFactor = catchAsync(async (req, res) => {
    const { enable, token } = req.body;
    const user = await prisma.user.findUnique({
        where: {
            id: req.user.id,
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
        await prisma.user.update({
            where: {
                id: req.user.id,
            },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: secret,
            },
        });
        res.status(200).json({
            status: 'success',
            message: '2FA enabled successfully',
            data: {
                secret,
            },
        });
    }
    else {
        // Disable 2FA
        await prisma.user.update({
            where: {
                id: req.user.id,
            },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
            },
        });
        res.status(200).json({
            status: 'success',
            message: '2FA disabled successfully',
        });
    }
});
// Generate backup codes
export const generateBackupCodes = catchAsync(async (req, res) => {
    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
    // Hash the backup codes before storing
    const hashedCodes = await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 12)));
    // Store hashed backup codes
    await prisma.user.update({
        where: {
            id: req.user.id,
        },
        data: {
            backupCodes: hashedCodes,
        },
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
export const getSystemSettings = catchAsync(async (req, res) => {
    const settings = await prisma.systemSettings.findFirst();
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
export const updateSystemSettings = catchAsync(async (req, res) => {
    const settings = await prisma.systemSettings.upsert({
        where: {
            id: '1', // Assuming we always have one system settings record
        },
        update: req.body,
        create: {
            id: '1',
            ...req.body,
        },
    });
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
export const getStorageStats = catchAsync(async (req, res) => {
    const users = await prisma.user.findMany({
        include: {
            images: {
                select: {
                    fileSize: true,
                },
            },
        },
    });
    const images = await prisma.image.findMany({
        select: {
            fileSize: true,
        },
    });
    const totalUsers = users.length;
    const totalImages = images.length;
    const totalStorageBytes = images.reduce((acc, img) => acc + (img.fileSize || 0), 0);
    const userStats = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        imageCount: user.images.length,
        totalStorage: user.images.reduce((acc, img) => acc + (img.fileSize || 0), 0),
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
const calculateStorageUsage = async (users) => {
    const usersWithImages = await prisma.user.findMany({
        where: {
            id: {
                in: users.map(u => u.id)
            }
        },
        include: {
            images: {
                select: {
                    fileSize: true
                }
            }
        }
    });
    return usersWithImages.reduce((acc, user) => {
        const userStorage = user.images.reduce((imgAcc, img) => {
            return imgAcc + (img.fileSize || 0);
        }, 0);
        return acc + userStorage;
    }, 0);
};
class SettingsController {
    async getSystemSettings(req, res, next) {
        try {
            const settings = await prisma.systemSettings.findFirst();
            if (!settings) {
                return next(new AppError('System settings not found', 404));
            }
            res.status(200).json({
                status: 'success',
                data: settings
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateSystemSettings(req, res, next) {
        try {
            const settings = await prisma.systemSettings.upsert({
                where: {
                    id: '1', // Assuming we always have one system settings record
                },
                update: req.body,
                create: {
                    id: '1',
                    ...req.body,
                },
            });
            res.status(200).json({
                status: 'success',
                data: {
                    settings,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
export const settingsController = new SettingsController();
//# sourceMappingURL=settings.controller.js.map