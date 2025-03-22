import { sign, verify, JwtPayload, SignOptions } from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { Role } from '@prisma/client';

interface TokenUser {
  id: string;
  email: string;
  role: Role;
}

interface RefreshTokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface AccessTokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Service for handling JWT tokens
 * Manages token generation, verification, and refresh
 */
export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access_secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
    
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
        console.warn(
          'WARNING: JWT secrets not set in production environment. ' +
          'This is a security risk. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables.'
        );
      }
    }
  }

  /**
   * Generate an access token for a user
   * @param user The user to generate a token for
   * @returns The generated access token
   */
  generateAccessToken(user: TokenUser): string {
    const payload: AccessTokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role.toString()
    };

    const options: SignOptions = {
      expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') as any
    };

    return sign(payload, this.accessTokenSecret, options);
  }

  /**
   * Generate a refresh token for a user
   * @param user The user to generate a token for
   * @returns The generated refresh token
   */
  async generateRefreshToken(user: TokenUser): Promise<string> {
    const payload: RefreshTokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role.toString()
    };

    const options: SignOptions = {
      expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any
    };

    return sign(payload, this.refreshTokenSecret, options);
  }

  /**
   * Verify an access token
   * @param token The token to verify
   * @returns The decoded token payload or null if invalid
   */
  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      return verify(token, this.accessTokenSecret) as AccessTokenPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify a refresh token
   * @param token The token to verify
   * @returns The decoded token payload or null if invalid
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      const decoded = verify(token, this.refreshTokenSecret) as RefreshTokenPayload;
      
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke all tokens for a user
   * @param userId The ID of the user to revoke tokens for
   * @returns True if successful, false otherwise
   */
  async revokeUserTokens(userId: string): Promise<boolean> {
    try {
      // Log the token revocation
      await prisma.securityLog.create({
        data: {
          userId,
          action: 'REVOKE_TOKENS',
          ipAddress: null, // In a real implementation, we would capture the IP
          success: true
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to revoke tokens:', error);
      return false;
    }
  }

  /**
   * Refresh a user's tokens
   * @param refreshToken The refresh token to use
   * @returns New access and refresh tokens, or null if the refresh token is invalid
   */
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);
      if (!decoded) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user) {
        return null;
      }

      const tokenUser: TokenUser = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      const newAccessToken = this.generateAccessToken(tokenUser);
      const newRefreshToken = await this.generateRefreshToken(tokenUser);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const tokenService = new TokenService(); 