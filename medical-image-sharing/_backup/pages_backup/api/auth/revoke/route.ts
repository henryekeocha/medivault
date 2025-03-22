import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ZodError, z } from 'zod';
import { tokenService } from '@/lib/auth/token-service';
import { getErrorResponse } from '@/lib/api/error-handler';
import { authOptions } from '../../../../../app/api/auth/[...nextauth]/route';
import prisma from '@/lib/db';

// Schema for validating token revocation requests
const revokeTokenSchema = z.object({
  reason: z.enum(['LOGOUT', 'PASSWORD_CHANGE', 'SECURITY_CONCERN', 'ADMIN_ACTION']),
  targetUserId: z.string().uuid('Invalid user ID format').optional(),
});

/**
 * POST handler for revoking tokens
 * @param req Request with revocation details
 * @returns Success response if tokens were revoked
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to revoke tokens' },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body = await req.json();
    const { reason, targetUserId } = revokeTokenSchema.parse(body);

    // Check if the user is trying to revoke tokens for another user
    if (targetUserId && targetUserId !== session.user.id) {
      // Only admins can revoke tokens for other users
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Forbidden', message: 'You do not have permission to revoke tokens for other users' },
          { status: 403 }
        );
      }
    }

    // Determine which user's tokens to revoke
    const userIdToRevoke = targetUserId || session.user.id;

    // Revoke the tokens
    const revoked = await tokenService.revokeUserTokens(userIdToRevoke);

    if (!revoked) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to revoke tokens' },
        { status: 500 }
      );
    }

    // Log the token revocation for security auditing
    await prisma.securityLog.create({
      data: {
        userId: session.user.id,
        action: 'TOKENS_REVOKED',
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
        metadata: JSON.stringify({
          reason,
          targetUserId,
          initiatedBy: session.user.id,
          timestamp: new Date().toISOString()
        })
      }
    });

    // Clear the refresh token cookie if the user is revoking their own tokens
    const response = NextResponse.json({
      success: true,
      message: 'Tokens successfully revoked',
    }, { status: 200 });

    if (!targetUserId || targetUserId === session.user.id) {
      response.cookies.set({
        name: 'refreshToken',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0, // Expire immediately
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return getErrorResponse(error, 400, 'Invalid request format');
    }

    console.error('Token revocation error:', error);
    return getErrorResponse(error, 500, 'Failed to revoke tokens');
  }
} 