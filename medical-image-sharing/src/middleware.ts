import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { getToken } from 'next-auth/jwt';
import { routes } from "@/config/routes";

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

// List of paths that don't require authentication
const publicPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
];

// Add debugging information
function logRequest(req: NextRequest, note: string = '') {
  if (process.env.NODE_ENV === 'development') {
    const url = req.nextUrl.clone();
    console.log(`[Middleware] ${note ? note + ' - ' : ''}${req.method} ${url.pathname}${url.search}`);
  }
}

// Middleware to protect routes based on authentication and user role
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Log all requests in development
  logRequest(request);
  
  // Allow all auth-related API routes to pass through
  if (pathname.startsWith('/api/auth/')) {
    logRequest(request, 'Auth API Request');
    return NextResponse.next();
  }
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    logRequest(request, 'Public route - allowing');
    return NextResponse.next();
  }
  
  // For all other API requests
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    // Add CORS headers for API routes
    const origin = request.headers.get('origin');
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { headers: response.headers });
    }
    
    // If it's an API request, let it through for now - the API routes will handle auth
    if (pathname.startsWith('/api/v1/')) {
      logRequest(request, 'API v1 route - allowing');
      return response;
    }
    
    logRequest(request, 'API route - allowing');
    return response;
  }
  
  // Check if the path is public
  if (publicPaths.some(path => pathname.startsWith(path) || pathname === path)) {
    logRequest(request, 'Public path - allowing');
    return NextResponse.next();
  }

  // Get the session token from NextAuth
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Debug token information
    logRequest(request, `Token check result: ${token ? 'Valid token' : 'No token'}`);
    if (token) {
      logRequest(request, `Token data: id=${token.id}, role=${token.role}`);
    }

    // If no token is present, redirect to login
    if (!token) {
      logRequest(request, 'No token - redirecting to login');
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURIComponent(request.nextUrl.pathname));
      return NextResponse.redirect(loginUrl);
    }
    
    // Check if the user is accessing home route and has a role
    if (pathname === '/' && token.role) {
      // Determine the appropriate dashboard URL based on role
      let dashboardUrl = '/dashboard';
      const role = token.role as Role;
      
      if (role === Role.ADMIN) {
        dashboardUrl = '/admin/dashboard';
      } else if (role === Role.PROVIDER) {
        dashboardUrl = '/provider/dashboard';
      } else if (role === Role.PATIENT) {
        dashboardUrl = '/patient/dashboard';
      }
      
      logRequest(request, `Redirecting to ${dashboardUrl} based on role ${role}`);
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
    
    // Check if user is accessing a protected route that doesn't match their role
    if (pathname.startsWith('/admin/') && token.role !== Role.ADMIN) {
      logRequest(request, `Unauthorized access to admin route, redirecting to appropriate dashboard`);
      const dashboardUrl = token.role === Role.PROVIDER ? '/provider/dashboard' : '/patient/dashboard';
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
    
    if (pathname.startsWith('/provider/') && token.role !== Role.PROVIDER) {
      logRequest(request, `Unauthorized access to provider route, redirecting to appropriate dashboard`);
      const dashboardUrl = token.role === Role.ADMIN ? '/admin/dashboard' : '/patient/dashboard';
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
    
    if (pathname.startsWith('/patient/') && token.role !== Role.PATIENT) {
      logRequest(request, `Unauthorized access to patient route, redirecting to appropriate dashboard`);
      const dashboardUrl = token.role === Role.ADMIN ? '/admin/dashboard' : '/provider/dashboard';
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
    
    // Token is valid, proceed with the request
    logRequest(request, 'Valid token - proceeding with request');
    return NextResponse.next();
  } catch (error) {
    console.error('Error validating session:', error);
    // If there's an error checking the token, redirect to login
    logRequest(request, `Session validation error - ${error}`);
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', encodeURIComponent(request.nextUrl.pathname));
    return NextResponse.redirect(loginUrl);
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all authenticated routes
    '/((?!auth|_next|images|api/auth|api/health|favicon.ico).*)',
  ],
}; 