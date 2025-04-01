import { Request, Response, NextFunction } from 'express';
import { protect } from './clerk.js';
import { syncUserMiddleware } from './syncUser.js';
import { Role } from '@prisma/client';

// List of public routes that don't require authentication
const publicRoutes = [
  // Authentication endpoints
  /^\/api\/health$/,
  /^\/api\/test$/,
  /^\/api\/test-auth$/,
  /^\/api-docs/,
  /^\/api\/auth\/sync(\/.*)?$/,  // Sync endpoints (both with and without parameters)
  /^\/api\/auth\/login$/,        // Login endpoint
  /^\/api\/auth\/register$/,     // Register endpoint
  /^\/api\/auth\/verify-email$/, // Email verification
  /^\/api\/auth\/verify-code$/,  // 2FA code verification
  /^\/api\/auth\/send-code$/,    // Send 2FA code
  /^\/api\/auth\/test-user$/,    // Test user creation
  /^\/api\/auth\/webhook\/.*/,   // Webhook endpoints
  /^\/api\/auth\/reset-password$/,  // Reset password
  /^\/api\/auth\/forgot-password$/,  // Forgot password
  /^\/api\/websocket/, // Allow WebSocket connections to authenticate separately
  /^\/socket\.io\/.*$/, // Allow all socket.io connections
  /^\/api\/.*\/public\/.*/,  // Endpoints marked as public
  /^\/api\/notifications$/,  // Allow notifications endpoint without auth
  /^\/api\/notifications\/.*/,  // All notifications routes
];

/**
 * Middleware to handle authentication in a flexible way.
 * In production, it will always use the protect middleware.
 * In development, it can bypass authentication for testing if bypass token is provided.
 */
export const bypassAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First check if the route is public
    const isPublicRoute = publicRoutes.some(pattern => pattern.test(req.path));
    if (isPublicRoute) {
      console.log(`Auth: Public route detected: ${req.path}, bypassing authentication`);
      return next();
    }
    
    // Check for URL-based parameters that might need to be extracted
    // For paths like /api/auth/sync/:clerkId
    const syncPathMatch = req.path.match(/\/api\/auth\/sync\/([^\/]+)$/);
    if (syncPathMatch && syncPathMatch[1]) {
      req.clerkId = syncPathMatch[1];
      console.log(`Auth: Extracted Clerk ID from URL: ${req.clerkId}`);
    }

    // Check if the user is trying to bypass auth (only in development)
    if (process.env.NODE_ENV === 'development') {
      const bypassHeader = req.headers['x-bypass-auth'];
      const bypassToken = process.env.BYPASS_AUTH_TOKEN;
      
      // If bypassing AND proper bypass token is provided
      if (bypassHeader && bypassToken && bypassHeader === bypassToken) {
        console.log('Auth: Development bypass authentication enabled');
        
        // Set dummy user for development (using data from headers if available)
        const userId = req.headers['x-dev-user-id'] as string || 'dev-user-123';
        const email = req.headers['x-dev-email'] as string || 'dev@example.com';
        const roleHeader = req.headers['x-dev-role'] as string || 'ADMIN';
        
        // Make sure the role is valid
        const role = (Object.values(Role).includes(roleHeader as Role) 
          ? roleHeader 
          : 'ADMIN') as Role;
        
        req.user = {
          id: userId,
          email: email,
          role: role,
        };
        
        return next();
      }
    }
    
    // Handle direct API calls with Clerk ID in headers
    // This supports direct sync calls that need to identify the user
    if (req.headers['x-clerk-id']) {
      req.clerkId = req.headers['x-clerk-id'] as string;
      console.log(`Auth: Extracted Clerk ID from header: ${req.clerkId}`);
    }
    
    // Extract token and verify via Clerk for debugging purposes
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      console.log(`Auth: Bearer token present for ${req.path}`);
    } else {
      console.log(`Auth: No Bearer token for ${req.path}`);
    }
    
    // Use the standard auth protection in all other cases
    return protect(req, res, async (err?: any) => {
      if (err) {
        console.error('Auth: Protection error:', err);
        return next(err);
      }
      
      console.log(`Auth: User authenticated successfully for ${req.path}`);
      
      // If authentication is successful, sync user data
      if (req.user?.id && req.clerkId) {
        console.log(`Auth: Syncing user data for ${req.user.id} (Clerk ID: ${req.clerkId})`);
        
        // Apply user synchronization after authentication
        await syncUserMiddleware(req, res, next);
      } else {
        if (!req.user) {
          console.log(`Auth: No user data available after protection for ${req.path}`);
        } else if (!req.clerkId) {
          console.log(`Auth: No Clerk ID available after protection for ${req.path}`);
        }
        next();
      }
    });
  } catch (error) {
    console.error('Auth bypass error:', error);
    next(error);
  }
}; 