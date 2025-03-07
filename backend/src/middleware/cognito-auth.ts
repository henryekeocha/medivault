import { NextRequest, NextResponse } from 'next/server';
import { cognitoJwtVerifier } from '@/lib/auth/cognito-jwt-verifier';
import { prisma } from '@/lib/prisma';

/**
 * Middleware to authenticate requests using Cognito tokens
 * @param req Next.js request
 * @returns Response or null if authentication is successful
 */
export async function authenticateCognitoRequest(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing token' },
        { status: 401 }
      );
    }

    // Verify the token
    const payload = await cognitoJwtVerifier.verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Extract user information
    const userInfo = cognitoJwtVerifier.extractUserFromPayload(payload);

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userInfo.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not found' },
        { status: 401 }
      );
    }

    // Attach user to request for downstream handlers
    // Note: In Next.js, we can't modify the request object directly
    // Instead, we'll use a custom header that will be read by the API route
    const headers = new Headers(req.headers);
    headers.set('x-user-id', user.id);
    headers.set('x-user-role', user.role);
    headers.set('x-user-email', user.email);

    // Create a new request with the modified headers
    const newRequest = new NextRequest(req.url, {
      headers,
      method: req.method,
      body: req.body,
      cache: req.cache,
      credentials: req.credentials,
      integrity: req.integrity,
      keepalive: req.keepalive,
      mode: req.mode,
      redirect: req.redirect,
      referrer: req.referrer,
      referrerPolicy: req.referrerPolicy,
    });

    return null; // Authentication successful
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * Get authenticated user from request
 * @param req Next.js request
 * @returns User information or null if not authenticated
 */
export function getAuthenticatedUser(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');
  const userEmail = req.headers.get('x-user-email');

  if (!userId || !userRole || !userEmail) {
    return null;
  }

  return {
    id: userId,
    role: userRole,
    email: userEmail,
  };
}

/**
 * Check if user has required role
 * @param req Next.js request
 * @param allowedRoles Roles that are allowed to access the resource
 * @returns Response or null if user has required role
 */
export function checkUserRole(req: NextRequest, allowedRoles: string[]) {
  const user = getAuthenticatedUser(req);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return null; // User has required role
}

/**
 * Middleware to require authentication for API routes
 * @param req Next.js request
 * @returns Response or null if authentication is successful
 */
export async function requireAuth(req: NextRequest) {
  return authenticateCognitoRequest(req);
}

/**
 * Middleware to require specific role for API routes
 * @param req Next.js request
 * @param allowedRoles Roles that are allowed to access the resource
 * @returns Response or null if user has required role
 */
export async function requireRole(req: NextRequest, allowedRoles: string[]) {
  const authResult = await authenticateCognitoRequest(req);
  if (authResult) {
    return authResult;
  }

  return checkUserRole(req, allowedRoles);
} 