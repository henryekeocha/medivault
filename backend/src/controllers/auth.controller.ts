import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { prisma } from '../lib/prisma.js';
import { Role, User } from '@prisma/client';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AuthUser } from '../middleware/auth.js';

// Generate JWT token
const signToken = (id: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign(
    { 
      sub: id, // Using standard JWT claim 'sub'
      id: id,  // Keep id for backward compatibility
      iat: Math.floor(Date.now() / 1000)
    }, 
    secret, 
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    } as jwt.SignOptions
  );
};

// Create and send token
const createSendToken = (user: Partial<User>, statusCode: number, res: Response) => {
  const token = signToken(user.id!);
  
  // Generate a refresh token
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'refresh-token-secret';
  const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
  const refreshToken = jwt.sign(
    { 
      sub: user.id, 
      id: user.id,
      role: user.role,
      email: user.email,
      iat: Math.floor(Date.now() / 1000)
    }, 
    refreshTokenSecret, 
    {
      expiresIn: refreshTokenExpiry
    } as jwt.SignOptions
  );

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

export const register = catchAsync(async (req: Request, res: Response) => {
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
      role: role ? (role as Role) : Role.PATIENT,
      twoFactorEnabled: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  createSendToken(user, 201, res);
});

export const login = catchAsync(async (req: Request, res: Response) => {
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

export const enable2FA = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const secret = authenticator.generateSecret();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: secret,
      twoFactorEnabled: true
    }
  });

  const otpAuthUrl = authenticator.keyuri(
    user.email,
    process.env.TWO_FACTOR_APP_NAME || 'Medical Image Sharing',
    secret
  );

  res.status(200).json({
    status: 'success',
    data: {
      secret,
      otpAuthUrl,
    },
  });
});

export const disable2FA = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;

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

export const verify2FA = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.body;
  const userId = req.user!.id;

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

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    const decoded = jwt.verify(refreshToken, secret) as { id: string };
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
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const newRefreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });

    res.json({
      data: {
        token,
        refreshToken: newRefreshToken,
        user
      }
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid refresh token', 401);
    }
    throw new AppError('Error refreshing token', 500);
  }
};

export const validateToken = async (req: Request, res: Response) => {
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
  } catch (error) {
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

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Error fetching user', 500);
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // In the real application, we will want to invalidate the token
    // by adding it to a blacklist or removing it from a whitelist
    // You could also clear cookies if you're using cookie-based authentication
    
    res.status(200).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    throw new AppError('Error logging out', 500);
  }
}; 