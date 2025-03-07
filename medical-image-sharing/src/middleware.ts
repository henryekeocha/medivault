import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { jwtVerify, JWTPayload as JoseJWTPayload } from 'jose';

// Define token payload interface
interface JWTPayload extends JoseJWTPayload {
  sub: string;
  role: Role;
  email: string;
  iat: number;
  exp: number;
}

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth',  // All auth routes
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/social-callback',
  '/privacy-policy',
  '/terms-of-service',
  '/api/auth',  // Auth API endpoints
  '/_next',     // Next.js internals
  '/favicon.ico',
  '/static',    // Static files
];

// Define default routes for roles
const DEFAULT_ROUTES: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  PROVIDER: '/provider/dashboard',
  PATIENT: '/patient/dashboard',
};

// Middleware to protect routes based on authentication and user role
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Allow API routes to be handled by API middleware
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    // Add CORS headers for API routes
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_FRONTEND_URL || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { headers: response.headers });
    }
    
    return response;
  }
  
  // Try to get token from cookies or authorization header
  const token = getTokenFromRequest(request);
  
  // Redirect to login if no token is found
  if (!token) {
    console.log(`[Middleware] No token found, redirecting to login from: ${pathname}`);
    const url = new URL('/login', request.url);
    url.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  try {
    // Verify token
    const payload = await verifyToken(token);
    
    if (!payload) {
      throw new Error('Invalid token payload');
    }
    
    // Role-based access control
    if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
      console.log(`[Middleware] Access denied to ${pathname} for role ${payload.role}`);
      return NextResponse.redirect(new URL(DEFAULT_ROUTES[payload.role] || '/dashboard', request.url));
    }
    
    if (pathname.startsWith('/provider') && payload.role !== 'PROVIDER' && payload.role !== 'ADMIN') {
      console.log(`[Middleware] Access denied to ${pathname} for role ${payload.role}`);
      return NextResponse.redirect(new URL(DEFAULT_ROUTES[payload.role] || '/dashboard', request.url));
    }
    
    if (pathname.startsWith('/patient') && payload.role !== 'PATIENT' && payload.role !== 'ADMIN') {
      console.log(`[Middleware] Access denied to ${pathname} for role ${payload.role}`);
      return NextResponse.redirect(new URL(DEFAULT_ROUTES[payload.role] || '/dashboard', request.url));
    }
    
    // Add user info to headers for backend routes
    const response = NextResponse.next();
    response.headers.set('X-User-Id', payload.sub);
    response.headers.set('X-User-Role', payload.role.toString());
    response.headers.set('X-User-Email', payload.email);
    
    return response;
  } catch (error) {
    console.error('[Middleware] Token verification failed:', error);
    
    // Token is invalid, redirect to login
    const url = new URL('/login', request.url);
    url.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(url);
  }
}

// Helper function to verify token
const verifyToken = async (token: string): Promise<JWTPayload | null> => {
  if (!token) return null;

  try {
    // Get JWT secret from environment variable
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not defined!');
      return null;
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    
    // Validate payload structure
    if (!payload.sub || !payload.exp) {
      console.error('Token payload missing required claims:', payload);
      return null;
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if ((payload.exp as number) < now) {
      console.error('Token has expired:', {
        expiration: new Date((payload.exp as number) * 1000).toISOString(),
        now: new Date(now * 1000).toISOString()
      });
      return null;
    }
    
    return payload as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

// Helper function to get token from request
const getTokenFromRequest = (request: NextRequest): string | null => {
  // Try to get token from cookies first (more secure)
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) {
    return cookieToken;
  }
  
  // Fall back to Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 