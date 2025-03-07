import { NextRequest, NextResponse } from 'next/server';
import { tokenService } from '@/lib/auth/token-service';
import { getErrorResponse } from '@/lib/api/error-handler';
import prisma from '@/lib/db';

/**
 * POST handler for refreshing access tokens
 * @param req Request with refresh token in cookie
 * @returns New access token if refresh token is valid
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Get the refresh token from the cookie
    const refreshToken = req.cookies.get('refreshToken')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Refresh the tokens
    const tokens = await tokenService.refreshTokens(refreshToken);
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Decode the access token to get user ID
    const accessToken = tokens.accessToken;
    const decodedToken = tokenService.verifyAccessToken(accessToken);
    const userId = decodedToken?.id;

    // Create the response with the new access token
    const response = NextResponse.json({
      accessToken: tokens.accessToken,
    }, { status: 200 });

    // If a new refresh token was generated, update the cookie
    if (tokens.refreshToken) {
      response.cookies.set({
        name: 'refreshToken',
        value: tokens.refreshToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      // Log the token refresh for security auditing
      if (userId) {
        await prisma.securityLog.create({
          data: {
            userId: userId,
            action: 'TOKEN_REFRESHED',
            ipAddress: req.headers.get('x-forwarded-for') || null,
            userAgent: req.headers.get('user-agent') || null,
            metadata: JSON.stringify({ timestamp: new Date().toISOString() })
          }
        });
      }
    }

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return getErrorResponse(error, 500, 'Failed to refresh token');
  }
} 