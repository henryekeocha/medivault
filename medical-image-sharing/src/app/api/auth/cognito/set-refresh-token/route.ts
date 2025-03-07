import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createErrorResponse } from '../auth-helper';

/**
 * POST handler to set the refresh token in an HttpOnly cookie
 * @param req Next.js request object
 * @returns Response indicating success or error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return createErrorResponse('Refresh token is required', 400);
    }

    // Set the refresh token in an HttpOnly cookie
    // that can't be accessed by JavaScript for security
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'refreshToken',
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error setting refresh token cookie:', error);
    return createErrorResponse('Failed to store refresh token', 500);
  }
} 