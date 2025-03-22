import { sign, verify } from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
/**
 * Service for handling JWT tokens
 * Manages token generation, verification, and refresh
 */
export class TokenService {
    accessTokenSecret;
    refreshTokenSecret;
    constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access_secret';
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
                console.warn('WARNING: JWT secrets not set in production environment. ' +
                    'This is a security risk. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables.');
            }
        }
    }
    /**
     * Generate an access token for a user
     * @param user The user to generate a token for
     * @returns The generated access token
     */
    generateAccessToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        const options = {
            expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m')
        };
        return sign(payload, this.accessTokenSecret, options);
    }
    /**
     * Generate a refresh token for a user
     * @param user The user to generate a token for
     * @returns The generated refresh token
     */
    async generateRefreshToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        const options = {
            expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d')
        };
        return sign(payload, this.refreshTokenSecret, options);
    }
    /**
     * Verify an access token
     * @param token The token to verify
     * @returns The decoded token payload or null if invalid
     */
    verifyAccessToken(token) {
        try {
            return verify(token, this.accessTokenSecret);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Verify a refresh token
     * @param token The token to verify
     * @returns The decoded token payload or null if invalid
     */
    async verifyRefreshToken(token) {
        try {
            const decoded = verify(token, this.refreshTokenSecret);
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Revoke all tokens for a user
     * @param userId The ID of the user to revoke tokens for
     * @returns True if successful, false otherwise
     */
    async revokeUserTokens(userId) {
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
        }
        catch (error) {
            console.error('Failed to revoke tokens:', error);
            return false;
        }
    }
    /**
     * Refresh a user's tokens
     * @param refreshToken The refresh token to use
     * @returns New access and refresh tokens, or null if the refresh token is invalid
     */
    async refreshTokens(refreshToken) {
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
            const tokenUser = {
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
        }
        catch (error) {
            console.error('Failed to refresh tokens:', error);
            return null;
        }
    }
}
// Export a singleton instance
export const tokenService = new TokenService();
//# sourceMappingURL=token-service.js.map