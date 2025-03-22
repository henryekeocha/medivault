import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/appError.js';
/**
 * Middleware to determine if the current request should bypass authentication
 * Especially useful for public routes like sign-in
 */
export const bypassAuth = (req, res, next) => {
    // Define an array of routes that should bypass authentication
    const publicRoutes = [
        '/api/auth/signin',
        '/api/auth/login',
        '/api/auth/callback',
        '/api/auth/refresh-token',
        '/api/auth/signout',
        '/api/auth/logout'
    ];
    // Check if the current path matches any public route
    const shouldBypass = publicRoutes.some(route => req.path === route ||
        req.originalUrl === route ||
        req.url === route ||
        req.originalUrl.includes(route));
    if (shouldBypass) {
        console.log(`Bypassing auth for public route: ${req.originalUrl}`);
        return next();
    }
    // If not a public route, apply the protect middleware
    return protect(req, res, next);
};
export const protect = async (req, res, next) => {
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
        // First try JWT_SECRET (for our custom tokens)
        const jwtSecret = process.env.JWT_SECRET || '';
        const nextAuthSecret = process.env.NEXTAUTH_SECRET || '';
        if (!jwtSecret && !nextAuthSecret) {
            console.error('No JWT secrets defined in environment variables');
            throw new Error('No JWT secret defined (JWT_SECRET or NEXTAUTH_SECRET)');
        }
        const secret = jwtSecret || nextAuthSecret;
        try {
            const decoded = jwt.verify(token, secret);
            // Get user ID from either 'id' or 'sub' claim for compatibility with both systems
            const userId = decoded.sub || decoded.id;
            if (!userId) {
                console.error('JWT does not contain user ID in either id or sub claim');
                return next(new AppError('Invalid token format. Please log in again.', 401));
            }
            // 3) Check if user still exists
            const foundUser = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                    role: true,
                    specialty: true,
                    emailVerified: true,
                    image: true,
                    isActive: true,
                    twoFactorEnabled: true,
                    twoFactorSecret: true,
                    lastLoginAt: true,
                    lastLoginIp: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            if (!foundUser) {
                console.log(`User with ID ${userId} from token not found in database`);
                return next(new AppError('The user belonging to this token no longer exists.', 401));
            }
            // 4) Check if user is active
            if (foundUser.isActive === false) {
                console.log(`User ${foundUser.email} account is inactive`);
                return next(new AppError('Your account has been deactivated.', 401));
            }
            // Grant access to protected route - include all required fields
            req.user = {
                ...foundUser,
                // Add missing fields from User model with default values
                password: '', // We don't need to expose the password
                twoFactorEnabled: foundUser.twoFactorEnabled || false,
                twoFactorSecret: foundUser.twoFactorSecret || null,
                lastLoginAt: foundUser.lastLoginAt || null,
                lastLoginIp: foundUser.lastLoginIp || null,
            };
            next();
        }
        catch (jwtError) {
            console.error('JWT verification failed:', jwtError);
            return next(new AppError('Invalid token. Please log in again.', 401));
        }
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return next(new AppError('Invalid token. Please log in again.', 401));
    }
};
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};
//# sourceMappingURL=auth.js.map