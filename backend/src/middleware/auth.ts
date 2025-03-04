import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/appError.js';
import { Role, User } from '@prisma/client';
import { ProviderSpecialty } from '@prisma/client';

interface JwtPayload {
  id?: string;
  sub?: string;
}

// Define custom type that extends User with optional properties
// to ensure type compatibility while allowing for missing fields
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  username: string | null;
  image: string | null;
  specialty: ProviderSpecialty | null;
  emailVerified: Date | null;
  backupCodes: string[];
  createdAt: Date;
  updatedAt: Date;
  password: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
};

// Update Express Request type to use our AuthUser type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1) Get token and check if it exists
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.log('No token provided in request headers');
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    // 2) Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not defined in environment variables');
      throw new Error('JWT_SECRET is not defined');
    }

    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      
      // Get user ID from either 'id' or 'sub' claim for backward compatibility
      const userId = decoded.sub || decoded.id;
      
      if (!userId) {
        console.error('JWT does not contain user ID in either id or sub claim');
        return next(new AppError('Invalid token format. Please log in again.', 401));
      }
      
      // 3) Check if user still exists
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          username: true,
          image: true,
          specialty: true,
          emailVerified: true,
          backupCodes: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!currentUser) {
        console.log(`User with ID ${userId} from token not found in database`);
        return next(new AppError('The user belonging to this token no longer exists.', 401));
      }

      // 4) Check if user is active
      if (currentUser.isActive === false) {
        console.log(`User ${currentUser.email} account is inactive`);
        return next(new AppError('Your account has been deactivated.', 401));
      }

      // Grant access to protected route - include all required fields
      req.user = {
        ...currentUser,
        // Add missing fields from User model with default values
        password: '', // We don't need to expose the password
        twoFactorEnabled: false,
        twoFactorSecret: null,
        lastLoginAt: null,
        lastLoginIp: null
      };
      
      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return next(new AppError('Invalid token. Please log in again.', 401));
  }
};

export const restrictTo = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
}; 