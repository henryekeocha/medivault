import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';
import { AppError } from './errorHandler.js';
import { authenticator } from 'otplib';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const userRepository = AppDataSource.getRepository(User);

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1) Check if token exists
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in', 401));
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;

    // 3) Check if user still exists
    const user = await userRepository.findOne({
      where: { id: decoded.id }
    });

    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    // 4) Check if user is active
    if (!user.isActive) {
      return next(new AppError('User account is deactivated', 401));
    }

    // 5) If 2FA is enabled, verify the token
    if (user.twoFactorEnabled) {
      const twoFactorToken = req.headers['x-2fa-token'];
      
      if (!twoFactorToken) {
        return next(new AppError('2FA token is required', 401));
      }

      if (!user.twoFactorSecret) {
        return next(new AppError('2FA is not properly configured', 401));
      }

      const isValid = authenticator.check(twoFactorToken as string, user.twoFactorSecret);

      if (!isValid) {
        return next(new AppError('Invalid 2FA token', 401));
      }
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Invalid token', 401));
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user!.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
}; 