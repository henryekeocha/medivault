import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@/types/auth';
import { randomBytes } from 'crypto';

export class AuthService {
  /**
   * Create a new user
   */
  async createUser(data: {
    email: string;
    password: string;
    name: string;
    role: typeof UserRole[keyof typeof UserRole];
    username?: string;
  }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    return prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    return prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    return resetToken;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return null;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return user;
  }

  /**
   * Enable 2FA for a user
   */
  async enable2FA(userId: string, secret: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      },
    });
  }

  /**
   * Disable 2FA for a user
   */
  async disable2FA(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  }

  /**
   * Lock a user account
   */
  async lockAccount(userId: string, duration: number = 30) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        isLocked: true,
        accountLockExpiresAt: new Date(Date.now() + duration * 60 * 1000),
      },
    });
  }

  /**
   * Unlock a user account
   */
  async unlockAccount(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        isLocked: false,
        accountLockExpiresAt: null,
        failedLoginAttempts: 0,
      },
    });
  }

  /**
   * Deactivate a user account
   */
  async deactivateAccount(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Reactivate a user account
   */
  async reactivateAccount(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
      },
    });
  }
} 