import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { prisma } from '../lib/prisma.js';
import { Role } from '@prisma/client';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
// Generate JWT token
const signToken = (id) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign({ id }, secret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });
};
// Create and send token
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user.id);
    // Remove password from output
    const { password, twoFactorSecret, ...userWithoutSensitiveData } = user;
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user: userWithoutSensitiveData,
        },
    });
};
export const register = catchAsync(async (req, res) => {
    const { username, email, password, role, name = username } = req.body;
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email },
                { username }
            ]
        }
    });
    if (existingUser) {
        throw new AppError('Email or username already exists', 400);
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    // Create user with proper type checking
    const user = await prisma.user.create({
        data: {
            username,
            email,
            name,
            password: hashedPassword,
            role: role ? role : Role.PATIENT,
            twoFactorEnabled: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });
    createSendToken(user, 201, res);
});
export const login = catchAsync(async (req, res) => {
    const { email, password, twoFactorCode } = req.body;
    // Check if email and password exist
    if (!email || !password) {
        throw new AppError('Please provide email and password', 400);
    }
    // Check if user exists && password is correct
    const currentUser = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            password: true,
            name: true,
            role: true,
            isActive: true,
            twoFactorEnabled: true,
            twoFactorSecret: true
        }
    });
    if (!currentUser || !(await bcrypt.compare(password, currentUser.password))) {
        throw new AppError('Incorrect email or password', 401);
    }
    // Check if user is active
    if (currentUser.isActive === false) {
        throw new AppError('Your account has been deactivated', 401);
    }
    // Check 2FA if enabled
    if (currentUser.twoFactorEnabled) {
        if (!twoFactorCode) {
            return res.status(200).json({
                status: 'success',
                message: '2FA required',
                requiresTwoFactor: true,
            });
        }
        if (!currentUser.twoFactorSecret) {
            throw new AppError('2FA secret not found', 500);
        }
        const isValid = authenticator.check(twoFactorCode, currentUser.twoFactorSecret);
        if (!isValid) {
            throw new AppError('Invalid 2FA code', 401);
        }
    }
    createSendToken(currentUser, 200, res);
});
export const enable2FA = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const secret = authenticator.generateSecret();
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            twoFactorSecret: secret,
            twoFactorEnabled: true
        }
    });
    const otpAuthUrl = authenticator.keyuri(user.email, process.env.TWO_FACTOR_APP_NAME || 'Medical Image Sharing', secret);
    res.status(200).json({
        status: 'success',
        data: {
            secret,
            otpAuthUrl,
        },
    });
});
export const disable2FA = catchAsync(async (req, res) => {
    const userId = req.user.id;
    await prisma.user.update({
        where: { id: userId },
        data: {
            twoFactorSecret: null,
            twoFactorEnabled: false
        }
    });
    res.status(200).json({
        status: 'success',
        message: '2FA has been disabled',
    });
});
export const verify2FA = catchAsync(async (req, res) => {
    const { token } = req.body;
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user) {
        throw new AppError('User not found', 404);
    }
    if (!user.twoFactorSecret) {
        throw new AppError('2FA is not enabled for this user', 400);
    }
    const isValid = authenticator.check(token, user.twoFactorSecret);
    if (!isValid) {
        throw new AppError('Invalid 2FA token', 401);
    }
    const jwtToken = signToken(user.id);
    res.status(200).json({
        status: 'success',
        data: {
            token: jwtToken
        }
    });
});
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new AppError('Refresh token is required', 400);
        }
        const secret = process.env.JWT_REFRESH_SECRET;
        if (!secret) {
            throw new Error('JWT_REFRESH_SECRET is not defined');
        }
        const decoded = jwt.verify(refreshToken, secret);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true
            }
        });
        if (!user) {
            throw new AppError('Invalid refresh token', 401);
        }
        if (!user.isActive) {
            throw new AppError('User account is deactivated', 401);
        }
        // Generate new tokens
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const newRefreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
        res.json({
            data: {
                token,
                refreshToken: newRefreshToken,
                user
            }
        });
    }
    catch (error) {
        if (error instanceof AppError)
            throw error;
        if (error instanceof jwt.JsonWebTokenError) {
            throw new AppError('Invalid refresh token', 401);
        }
        throw new AppError('Error refreshing token', 500);
    }
};
export const validateToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            throw new AppError('No token provided', 401);
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined');
        }
        jwt.verify(token, secret);
        res.json({
            data: {
                isValid: true
            }
        });
    }
    catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new AppError('Invalid token', 401);
        }
        throw new AppError('Error validating token', 500);
    }
};
export const getCurrentUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                emailVerified: true,
                image: true,
                username: true,
                specialty: true,
                twoFactorEnabled: true
            }
        });
        if (!user) {
            throw new AppError('User not found', 404);
        }
        res.json({
            data: user
        });
    }
    catch (error) {
        if (error instanceof AppError)
            throw error;
        throw new AppError('Error fetching user', 500);
    }
};
//# sourceMappingURL=auth.controller.js.map