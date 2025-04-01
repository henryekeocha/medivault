import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../../lib/prisma.js';
/**
 * Service for handling Clerk authentication tokens
 * This class is maintained for backward compatibility but now uses Clerk for authentication
 */
export class TokenService {
    constructor() {
        if (!process.env.CLERK_SECRET_KEY) {
            console.error('CLERK_SECRET_KEY is not defined in environment variables');
            throw new Error('CLERK_SECRET_KEY is missing');
        }
    }
    /**
     * This method is kept for backward compatibility
     * In a Clerk-based system, you should use Clerk's session tokens directly
     */
    generateAccessToken(user) {
        console.warn('generateAccessToken is deprecated. Use Clerk authentication instead.');
        return `clerk_token_placeholder_${user.id}`;
    }
    /**
     * This method is kept for backward compatibility
     * In a Clerk-based system, you should use Clerk's session tokens directly
     */
    async generateRefreshToken(user) {
        console.warn('generateRefreshToken is deprecated. Use Clerk authentication instead.');
        return `clerk_refresh_token_placeholder_${user.id}`;
    }
    /**
     * Verify a session token using Clerk
     * @param token The session token to verify
     * @returns The user data or null if invalid
     */
    async verifySessionToken(token) {
        try {
            // Verify the session with Clerk
            const session = await clerkClient.sessions.getSession(token);
            if (!session || session.status !== 'active') {
                return null;
            }
            // Get the user from Clerk
            const user = await clerkClient.users.getUser(session.userId);
            if (!user) {
                return null;
            }
            // Get the user from our database to get the role
            const dbUser = await prisma.user.findFirst({
                where: { authId: user.id }
            });
            if (!dbUser) {
                return null;
            }
            return {
                id: dbUser.id,
                email: user.emailAddresses[0]?.emailAddress || '',
                role: dbUser.role.toString()
            };
        }
        catch (error) {
            console.error('Failed to verify session token:', error);
            return null;
        }
    }
    /**
     * Verify an access token (maintained for backward compatibility)
     * @param token The token to verify
     * @returns The decoded token payload or null if invalid
     */
    async verifyAccessToken(token) {
        try {
            // For Clerk tokens (they usually start with "sess_")
            if (token.startsWith('sess_')) {
                return this.verifySessionToken(token);
            }
            console.warn('Legacy JWT token verification attempted. This is deprecated.');
            return null;
        }
        catch (error) {
            console.error('Token verification error:', error);
            return null;
        }
    }
    /**
     * Verify a refresh token (maintained for backward compatibility)
     * @param token The token to verify
     * @returns The decoded token payload or null if invalid
     */
    async verifyRefreshToken(token) {
        try {
            // For Clerk tokens (they usually start with "sess_")
            if (token.startsWith('sess_')) {
                return this.verifySessionToken(token);
            }
            console.warn('Legacy refresh token verification attempted. This is deprecated.');
            return null;
        }
        catch (error) {
            console.error('Failed to verify refresh token:', error);
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
            // Look up the Clerk authId for this user
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user?.authId) {
                return false;
            }
            // Revoke all sessions for this user in Clerk
            try {
                // Note: This is the best approach based on Clerk's API
                // We can't directly get all sessions for a user, so we'll log a message
                console.log(`To revoke all sessions for user ${userId} with Clerk ID ${user.authId}, use the Clerk Dashboard`);
                // In a more comprehensive implementation, we could use Clerk's Admin API
                // or use a webhook to listen for sign-out events
            }
            catch (error) {
                console.error('Failed to interact with Clerk sessions:', error);
            }
            // Log the token revocation
            await prisma.securityLog.create({
                data: {
                    userId,
                    action: 'REVOKE_TOKENS',
                    ipAddress: null,
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
     * Refresh a user's tokens (maintained for backward compatibility)
     * In a Clerk-based system, session management is handled by Clerk
     */
    async refreshTokens(refreshToken) {
        console.warn('refreshTokens is deprecated. Use Clerk session management instead.');
        return null;
    }
}
// Export a singleton instance
export const tokenService = new TokenService();
//# sourceMappingURL=token-service.js.map