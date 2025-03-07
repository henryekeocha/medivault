import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Extract the JWT token from the Authorization header
 * @param req Next.js request object
 * @returns The JWT token or null if not found
 */
export function extractTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Get a cookie value from the cookie store
 * @param name The name of the cookie to retrieve
 * @returns The cookie value or null if not found
 */
export async function getCookieValue(name: string): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(name);
    return cookie?.value || null;
  } catch (error) {
    console.error('Error accessing cookies:', error);
    return null;
  }
}

/**
 * Get access token from cookies
 * @returns The access token or null if not found
 */
export async function getAccessToken(): Promise<string | null> {
  return await getCookieValue('cognitoAccessToken');
}

/**
 * Get refresh token from cookies
 * @returns The refresh token or null if not found
 */
export async function getRefreshToken(): Promise<string | null> {
  return await getCookieValue('cognitoRefreshToken');
}

/**
 * Get ID token from cookies
 * @returns The ID token or null if not found
 */
export async function getIdToken(): Promise<string | null> {
  return await getCookieValue('cognitoIdToken');
}

/**
 * Handle authentication errors in a standardized way
 * @param error The error that occurred
 * @returns A standardized error response
 */
export function handleAuthError(error: any) {
  console.error('Authentication error:', error);
  
  if (error.message.includes('expired')) {
    return Response.json(
      { error: 'Authentication token expired' },
      { status: 401 }
    );
  }
  
  return Response.json(
    { error: 'Authentication failed' },
    { status: 401 }
  );
}

/**
 * Create a standardized error response
 * @param message Error message
 * @param status HTTP status code
 * @returns Response object
 */
export function createErrorResponse(message: string, status: number = 400) {
  return Response.json({ error: message }, { status });
} 