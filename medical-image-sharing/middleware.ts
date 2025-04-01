import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import { ROUTE_ACCESS, DEFAULT_ROUTES } from '@/config/routes';
import { Role } from '@prisma/client';

// Add these paths to your list of public routes
export const publicPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/sync-user', // Add a path for user sync page
  '/unauthorized', // Add unauthorized page as public
  '/api/auth/(.*)',
  '/api/webhooks/(.*)',
  '/',
  '/privacy-policy',
  '/terms-of-service',
  '/sso-callback', // Important: Add Clerk's callback URLs
  '/profile/mfa(.*)', // Allow Clerk access to MFA routes with catch-all
];

// Build a regex for all public paths
const isPublicPath = (path: string): boolean => {
  return publicPaths.some((pp) => {
    if (pp.endsWith('(.*)')) {
      // For wildcard paths like '/api/auth/(.*)'
      const basePath = pp.replace('(.*)', '');
      return path.startsWith(basePath);
    }
    return path === pp;
  });
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { userId, sessionId, getToken } = getAuth(request);
  
  // Check if it's a public path
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // If user is not authenticated and not on a public path, redirect to login
  if (!sessionId) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(url);
  }
  
  // Prevent redirect loops - check if we're stuck in a redirect cycle
  const cycleCount = parseInt(request.nextUrl.searchParams.get('cycle') || '0');
  if (cycleCount > 2) {
    // If we detect a redirect loop, direct to sync page
    console.log('Detected redirect loop, sending to sync page');
    return NextResponse.redirect(new URL('/auth/sync-user', request.url));
  }

  // Don't restrict admin paths for now until we have proper role management
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }
  
  // For provider and patient routes, ensure the path prefix matches their role
  if (pathname.startsWith('/provider') || pathname.startsWith('/patient')) {
    try {
      // Get the user's role from session claims metadata
      const auth = getAuth(request);
      const metadata = auth.sessionClaims?.metadata as { role?: string } || {};
      const userRole = metadata.role as Role || null;
      
      if (!userRole) {
        // If no role found, redirect to sync page
        return NextResponse.redirect(new URL('/auth/sync-user', request.url));
      }
      
      if (pathname.startsWith('/provider') && userRole !== Role.PROVIDER) {
        // Trying to access provider routes as non-provider
        const url = new URL(DEFAULT_ROUTES[userRole], request.url);
        url.searchParams.set('cycle', (cycleCount + 1).toString());
        return NextResponse.redirect(url);
      }
      
      if (pathname.startsWith('/patient') && userRole !== Role.PATIENT) {
        // Trying to access patient routes as non-patient
        const url = new URL(DEFAULT_ROUTES[userRole], request.url);
        url.searchParams.set('cycle', (cycleCount + 1).toString());
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error('Error getting user role:', error);
      return NextResponse.redirect(new URL('/auth/sync-user', request.url));
    }
  }

  // All checks pass, allow the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|public/|favicon.ico).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 