import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import crypto from 'crypto';
// Generate JWT token
const signToken = (id) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign({
        sub: id, // Using standard JWT claim 'sub'
        id: id, // Keep id for backward compatibility
        iat: Math.floor(Date.now() / 1000)
    }, secret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });
};
const signRefreshToken = (id) => {
    const secret = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
    return jwt.sign({
        sub: id,
        id: id,
        iat: Math.floor(Date.now() / 1000)
    }, secret, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });
};
// Create and send token
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user.id);
    // Generate a refresh token
    const refreshToken = signRefreshToken(user.id);
    // Remove password from output
    const { password, twoFactorSecret, ...userWithoutSensitiveData } = user;
    res.status(statusCode).json({
        status: 'success',
        data: {
            token,
            refreshToken,
            user: userWithoutSensitiveData,
        },
    });
};
export const register = catchAsync(async (req, res) => {
    const { username, email, password, role, name = username } = req.body;
    // Check if user already exists using raw SQL to avoid schema issues
    const existingUsers = await prisma.$queryRaw `
    SELECT * FROM "User" WHERE email = ${email} OR username = ${username} LIMIT 1
  `;
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        throw new AppError('Email or username already exists', 400);
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    // Create new user with raw SQL to avoid schema issues
    const userId = crypto.randomUUID();
    await prisma.$executeRaw `
    INSERT INTO "User" (
      id, email, name, username, password, role, 
      "isActive", "twoFactorEnabled",
      "createdAt", "updatedAt"
    ) 
    VALUES (
      ${userId}::uuid, ${email}, ${name}, ${username}, ${hashedPassword}, 
      ${role ? role : 'PATIENT'}::Role, 
      true, false,
      NOW(), NOW()
    )
  `;
    // Get the newly created user
    const newUser = await prisma.$queryRaw `
    SELECT 
      id, email, name, username, role, "isActive", "twoFactorEnabled",
      "createdAt", "updatedAt"
    FROM "User" 
    WHERE id = ${userId}::uuid
  `;
    // Create JWT token
    const token = signToken(userId);
    const refreshToken = signRefreshToken(userId);
    // Send response
    res.status(201).json({
        status: 'success',
        data: {
            token,
            refreshToken,
            user: newUser[0],
        },
    });
});
export const login = catchAsync(async (req, res) => {
    console.log('Login attempt received:', {
        email: req.body.email,
        hasPassword: !!req.body.password,
        timestamp: new Date().toISOString()
    });
    const { email, password, twoFactorCode } = req.body;
    // Check if email and password exist
    if (!email || !password) {
        console.log('Login failed: Missing credentials');
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
    console.log('User lookup result:', {
        found: !!currentUser,
        email: email,
        isActive: currentUser?.isActive
    });
    if (!currentUser || !(await bcrypt.compare(password, currentUser.password))) {
        console.log('Login failed: Invalid credentials');
        throw new AppError('Incorrect email or password', 401);
    }
    // Check if user is active
    if (currentUser.isActive === false) {
        console.log('Login failed: Account deactivated');
        throw new AppError('Your account has been deactivated', 401);
    }
    // Check 2FA if enabled
    if (currentUser.twoFactorEnabled) {
        console.log('2FA required for user:', email);
        if (!twoFactorCode) {
            return res.status(200).json({
                status: 'success',
                message: '2FA required',
                requiresTwoFactor: true,
            });
        }
        if (!currentUser.twoFactorSecret) {
            console.log('2FA error: Secret not found');
            throw new AppError('2FA secret not found', 500);
        }
        const isValid = authenticator.check(twoFactorCode, currentUser.twoFactorSecret);
        if (!isValid) {
            console.log('2FA validation failed');
            throw new AppError('Invalid 2FA code', 401);
        }
    }
    console.log('Login successful for user:', email);
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
        // If request reaches here, token is valid through middleware
        // Extract user data from request (added by 'protect' middleware)
        if (!req.user) {
            throw new AppError('User not authenticated', 401);
        }
        // Return validation result with user data
        const { password, twoFactorSecret, ...userWithoutSensitiveData } = req.user;
        res.status(200).json({
            status: 'success',
            data: {
                valid: true,
                user: userWithoutSensitiveData
            }
        });
    }
    catch (error) {
        console.error('Token validation error:', error);
        res.status(401).json({
            status: 'fail',
            data: {
                valid: false,
                message: error instanceof AppError ? error.message : 'Invalid token'
            }
        });
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
export const logout = async (req, res) => {
    try {
        // In the real application, we will want to invalidate the token
        // by adding it to a blacklist or removing it from a whitelist
        // You could also clear cookies if you're using cookie-based authentication
        res.status(200).json({
            status: 'success',
            data: null
        });
    }
    catch (error) {
        throw new AppError('Error logging out', 500);
    }
};
//# sourceMappingURL=auth.controller.js.map