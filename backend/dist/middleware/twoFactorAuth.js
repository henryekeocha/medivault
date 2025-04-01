import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../lib/prisma.js';
/**
 * Middleware that handles 2FA endpoints - token is optional and will be used if provided
 * but won't block the request if not present
 */
export const optionalAuth = async (req, res, next) => {
    console.log(`2FA Middleware: Processing ${req.method} ${req.path}`);
    // Try to extract the token if it exists
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            console.log(`2FA Middleware: Attempting to verify optional token`);
            // Verify the JWT and get the user ID
            const { sub: userId } = await clerkClient.verifyToken(token);
            if (userId) {
                console.log(`2FA Middleware: Token valid, userId: ${userId}`);
                req.clerkId = userId;
                // Try to get user data from our database
                try {
                    const user = await prisma.user.findFirst({
                        where: { authId: userId }
                    });
                    if (user) {
                        console.log(`2FA Middleware: Found user in database: ${user.id}`);
                        req.user = {
                            id: user.id,
                            email: user.email,
                            role: user.role
                        };
                    }
                    else {
                        console.log(`2FA Middleware: User not found in database for authId: ${userId}`);
                    }
                }
                catch (dbError) {
                    console.error('2FA Middleware: Database error:', dbError);
                }
            }
        }
        catch (tokenError) {
            console.log(`2FA Middleware: Invalid token, continuing anyway as auth is optional`);
            // Just log and continue since auth is optional
        }
    }
    else {
        console.log(`2FA Middleware: No auth token provided, continuing anyway as auth is optional`);
    }
    // Always proceed to the next middleware/route handler
    next();
};
//# sourceMappingURL=twoFactorAuth.js.map