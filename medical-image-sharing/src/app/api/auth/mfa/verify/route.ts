import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { mfaService } from '@/lib/auth/mfa-service';
import { tokenService } from '@/lib/auth/token-service';
import { getErrorResponse } from '@/lib/api/error-handler';
import prisma from '@/lib/db';

// Schema for validating MFA verification requests
const mfaVerifySchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  mfaToken: z.string().length(6, 'MFA token must be 6 digits').regex(/^\d+$/, 'MFA token must only contain digits'),
  temporaryToken: z.string().min(1, 'Temporary token is required'),
});

// Schema for validating recovery code verification
const recoveryCodeSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  recoveryCode: z.string().min(10, 'Recovery code is too short').max(14, 'Recovery code is too long'),
  temporaryToken: z.string().min(1, 'Temporary token is required'),
});

/**
 * POST handler for verifying MFA tokens
 * @param req Request containing MFA token and user ID
 * @returns NextResponse with authentication tokens if successful
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Check if this is a recovery code verification
    const url = new URL(req.url);
    if (url.pathname.includes('/recovery')) {
      return handleRecoveryVerification(req);
    }
    
    // Parse and validate the request body
    const body = await req.json();
    const { userId, mfaToken, temporaryToken } = mfaVerifySchema.parse(body);

    // Verify the temporary token
    // This would be a token issued after password verification but before MFA
    // In a real implementation, we'd verify this token's validity
    if (!temporaryToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid temporary token' },
        { status: 401 }
      );
    }

    // Get the user's MFA settings
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    if (!userSettings?.mfaEnabled || !userSettings.mfaSecret) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'MFA is not enabled for this user' },
        { status: 400 }
      );
    }

    // Verify the MFA token
    const isValid = mfaService.verifyToken(mfaToken, userSettings.mfaSecret);
    
    if (!isValid) {
      // Log failed verification attempt
      await prisma.securityLog.create({
        data: {
          userId,
          action: 'MFA_VERIFICATION_FAILED',
          ipAddress: req.headers.get('x-forwarded-for') || null,
          userAgent: req.headers.get('user-agent') || null,
          success: false,
          failReason: 'Invalid MFA token',
          metadata: JSON.stringify({ timestamp: new Date().toISOString() })
        }
      });

      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid MFA token' },
        { status: 401 }
      );
    }

    // Generate authentication tokens
    const tokens = await tokenService.generateTokens(userId);
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to generate authentication tokens' },
        { status: 500 }
      );
    }

    // Log successful MFA verification
    await prisma.securityLog.create({
      data: {
        userId,
        action: 'MFA_VERIFICATION_SUCCESS',
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
        metadata: JSON.stringify({ timestamp: new Date().toISOString() })
      }
    });

    return NextResponse.json({
      ...tokens,
      message: 'MFA verification successful'
    }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return getErrorResponse(error, 400, 'Invalid MFA verification data');
    }

    console.error('MFA verification error:', error);
    return getErrorResponse(error, 500, 'Failed to verify MFA token');
  }
}

/**
 * Handler for recovery code verification
 * @param req Request containing recovery code and user ID
 * @returns NextResponse with authentication tokens if successful
 */
async function handleRecoveryVerification(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate the request body
    const body = await req.json();
    const { userId, recoveryCode, temporaryToken } = recoveryCodeSchema.parse(body);

    // Verify the temporary token
    if (!temporaryToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid temporary token' },
        { status: 401 }
      );
    }

    // Verify the recovery code
    const isValid = await mfaService.verifyRecoveryCode(userId, recoveryCode);
    
    if (!isValid) {
      // Log failed recovery verification
      await prisma.securityLog.create({
        data: {
          userId,
          action: 'RECOVERY_CODE_VERIFICATION_FAILED',
          ipAddress: req.headers.get('x-forwarded-for') || null,
          userAgent: req.headers.get('user-agent') || null,
          success: false,
          failReason: 'Invalid recovery code',
          metadata: JSON.stringify({ timestamp: new Date().toISOString() })
        }
      });

      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid recovery code' },
        { status: 401 }
      );
    }

    // Generate authentication tokens
    const tokens = await tokenService.generateTokens(userId);
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to generate authentication tokens' },
        { status: 500 }
      );
    }

    // Log successful recovery verification
    await prisma.securityLog.create({
      data: {
        userId,
        action: 'RECOVERY_CODE_VERIFICATION_SUCCESS',
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
        metadata: JSON.stringify({ timestamp: new Date().toISOString() })
      }
    });

    return NextResponse.json({
      ...tokens,
      message: 'Recovery code verification successful',
      recoveryUsed: true
    }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return getErrorResponse(error, 400, 'Invalid recovery verification data');
    }

    console.error('Recovery verification error:', error);
    return getErrorResponse(error, 500, 'Failed to verify recovery code');
  }
} 