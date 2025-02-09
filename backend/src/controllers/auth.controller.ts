import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppDataSource } from '../config/database.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../middleware/errorHandler.js';
import { User } from '../entities/User.js';
import { UserRole } from '../entities/User.js';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const userRepository = AppDataSource.getRepository(User);

// Generate JWT token
const signToken = (id: number): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  const options: SignOptions = {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  };
  return jwt.sign({ id }, secret, options);
};

// Create and send token
const createSendToken = (user: User, statusCode: number, res: Response) => {
  const token = signToken(user.id);

  // Remove password from output
  const userWithoutPassword = {
    ...user,
    password: undefined,
  };

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: userWithoutPassword,
    },
  });
};

export const register = catchAsync(async (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await userRepository.findOne({
    where: [
      { email },
      { username }
    ]
  });

  if (existingUser) {
    throw new AppError('Email or username already exists', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const newUser = new User();
  newUser.username = username;
  newUser.email = email;
  newUser.password = hashedPassword;
  newUser.role = role || UserRole.Patient;

  const user = await userRepository.save(newUser);

  createSendToken(user, 201, res);
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password, twoFactorCode } = req.body;

  // Check if email and password exist
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  // Check if user exists && password is correct
  const user = await userRepository.findOne({
    where: { email }
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated', 401);
  }

  // Check 2FA if enabled
  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      return res.status(200).json({
        status: 'success',
        message: '2FA required',
        requiresTwoFactor: true,
      });
    }

    if (!user.twoFactorSecret) {
      throw new AppError('2FA secret not found', 500);
    }

    const isValid = authenticator.check(twoFactorCode, user.twoFactorSecret);

    if (!isValid) {
      throw new AppError('Invalid 2FA code', 401);
    }
  }

  createSendToken(user, 200, res);
});

export const enable2FA = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const secret = authenticator.generateSecret();

  const user = await userRepository.findOneOrFail({
    where: { id: userId }
  });

  user.twoFactorSecret = secret;
  user.twoFactorEnabled = true;

  await userRepository.save(user);

  const otpAuthUrl = authenticator.generate(secret);

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

  const user = await userRepository.findOneOrFail({
    where: { id: userId }
  });

  user.twoFactorSecret = null;
  user.twoFactorEnabled = false;

  await userRepository.save(user);

  res.status(200).json({
    status: 'success',
    message: '2FA has been disabled',
  });
});

export const verify2FA = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.body;
  const user = await userRepository.findOne({
    where: { id: req.user!.id }
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

  // Generate JWT
  const jwtToken = signToken(user.id);

  res.status(200).json({
    status: 'success',
    data: {
      token: jwtToken
    }
  });
}); 