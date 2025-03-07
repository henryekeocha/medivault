import { sign, verify, JwtPayload } from 'jsonwebtoken';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Types for token payloads
interface TokenUser {
  id: string;
  email: string;
  role: string;
}

interface RefreshTokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
  tokenVersion: number;
}

export interface AccessTokenPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Token Service for managing authentication tokens on the frontend
 */
export class TokenService {
  private readonly accessTokenSecret: string;

  constructor() {
    // In the frontend, we don't have direct access to secrets
    // But we need this for verifying tokens in memory for client-side protections
    this.accessTokenSecret = '';
  }

  /**
   * Generate an access token
   * @param user User object to create token for
   * @returns Access token
   */
  generateAccessToken(user: { id: string; email: string; role: string }): string {
    // In the frontend context, we delegate token generation to the server
    // This is a placeholder that would make an API call in a real implementation
    console.warn('Frontend access token generation is a placeholder - tokens should be generated server-side');
    return 'placeholder_access_token';
  }

  /**
   * Generate a refresh token
   * @param user User object to create token for
   * @returns Refresh token
   */
  async generateRefreshToken(user: { id: string; email: string; role: string }): Promise<string> {
    // In the frontend context, we delegate token generation to the server
    // This is a placeholder that would make an API call in a real implementation
    console.warn('Frontend refresh token generation is a placeholder - tokens should be generated server-side');
    return 'placeholder_refresh_token';
  }

  /**
   * Verify an access token and return the decoded payload
   * @param token JWT access token to verify
   * @returns Decoded token payload or null if invalid
   */
  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      // In a real frontend implementation, we'd use a library like jwt-decode
      // to decode the token without verification, and rely on the backend for
      // actual verification. For now, we'll just decode it.
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );
      return payload as AccessTokenPayload;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Refresh the access token using a valid refresh token
   * This method calls the server's refresh endpoint
   * @returns New tokens or null if refresh token is invalid
   */
  async refreshTokens(): Promise<{ accessToken: string } | null>;
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null>;
  async refreshTokens(refreshToken?: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
    try {
      // The refresh token is stored in an HttpOnly cookie by default, so we don't need to send it
      // If a specific token is provided, we'll use it in the request
      const config = refreshToken ? { headers: { 'x-refresh-token': refreshToken } } : {};
      const response = await axios.post('/api/auth/refresh', {}, config);
      return response.data;
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      return null;
    }
  }

  /**
   * Revoke all tokens for the current user
   * @returns True if successful
   */
  async revokeTokens(): Promise<boolean> {
    try {
      await axios.post('/api/auth/revoke');
      return true;
    } catch (error) {
      console.error('Failed to revoke tokens:', error);
      return false;
    }
  }

  /**
   * Revoke all tokens for a specific user (admin only)
   * @param userId ID of the user to revoke tokens for
   * @returns True if successful
   */
  async revokeUserTokens(userId: string): Promise<boolean> {
    try {
      await axios.post(`/api/auth/revoke/${userId}`);
      return true;
    } catch (error) {
      console.error(`Failed to revoke tokens for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Generate both access and refresh tokens for a user
   * @param userId User ID to generate tokens for
   * @returns Object containing access and refresh tokens
   */
  async generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      // Fetch the user from the database to get necessary information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true }
      });

      if (!user) {
        return null;
      }

      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user);

      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error generating tokens:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const tokenService = new TokenService(); 