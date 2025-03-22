import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ZodError, z } from 'zod';
import { mfaService } from '@/lib/auth/mfa-service';
import { getErrorResponse } from '@/lib/api/error-handler';
import { authOptions } from '../../../../../../app/api/auth/[...nextauth]/route';
import prisma from '@/lib/db';

// Schema for validating the MFA verification request
const mfaSetupVerifySchema = z.object({
  token: z.string().length(6, 'Token must be 6 digits').regex(/^\d+$/, 'Token must only contain digits'),
});

/**
 * GET handler to initiate MFA setup
 * This generates a new TOTP secret and QR code
 * @returns NextResponse with TOTP setup data
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to set up MFA' },
        { status: 401 }
      );
    }

    // Check if MFA is already enabled
    const isMfaEnabled = await mfaService.isMfaEnabled(session.user.id);
    if (isMfaEnabled) {
      return NextResponse.json(
        { error: 'Conflict', message: 'MFA is already enabled for this account' },
        { status: 409 }
      );
    }

    // Generate a new TOTP secret
    const secret = mfaService.generateSecret();

    // Generate a QR code for easy setup in authenticator apps
    const qrCodeUrl = await mfaService.generateQrCode(session.user.email, secret);

    // Store the secret temporarily for verification
    // Note: In a real implementation, we'd want to store this with some expiration
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        mfaSecret: secret,
        mfaEnabled: false, // Not yet verified
      },
      create: {
        userId: session.user.id,
        mfaSecret: secret,
        mfaEnabled: false,
        tokenVersion: 0,
      },
    });

    // Log the MFA setup initiation for security auditing
    await prisma.securityLog.create({
      data: {
        userId: session.user.id,
        action: 'MFA_SETUP_INITIATED',
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
        metadata: JSON.stringify({ timestamp: new Date().toISOString() })
      }
    });

    return NextResponse.json({
      secret,
      qrCode: qrCodeUrl,
      message: 'MFA setup initiated. Scan the QR code with your authenticator app.',
    }, { status: 200 });
  } catch (error) {
    console.error('MFA setup error:', error);
    return getErrorResponse(error, 500, 'Failed to initiate MFA setup');
  }
}

/**
 * POST handler to verify and complete MFA setup
 * @param req NextRequest object containing the verification token
 * @returns NextResponse with success or error message
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to verify MFA setup' },
        { status: 401 }
      );
    }

    // Parse and validate the verification token
    const body = await req.json();
    const { token } = mfaSetupVerifySchema.parse(body);

    // Get the user's TOTP secret
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id }
    });

    if (!userSettings?.mfaSecret) {
      return NextResponse.json(
        { error: 'Not Found', message: 'MFA setup not initiated. Please start the setup process first.' },
        { status: 404 }
      );
    }

    if (userSettings.mfaEnabled) {
      return NextResponse.json(
        { error: 'Conflict', message: 'MFA is already enabled for this account' },
        { status: 409 }
      );
    }

    // Verify the token against the stored secret
    const isValid = mfaService.verifyToken(token, userSettings.mfaSecret);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid verification code. Please try again.' },
        { status: 400 }
      );
    }

    // Enable MFA for the user
    const success = await mfaService.enableMfa(session.user.id, userSettings.mfaSecret);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to enable MFA. Please try again.' },
        { status: 500 }
      );
    }

    // Generate recovery codes for the user
    const recoveryCodes = await mfaService.generateRecoveryCodes(session.user.id);

    // Log the successful MFA setup
    await prisma.securityLog.create({
      data: {
        userId: session.user.id,
        action: 'MFA_SETUP_COMPLETED',
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
        metadata: JSON.stringify({ timestamp: new Date().toISOString() })
      }
    });

    return NextResponse.json({
      success: true,
      message: 'MFA successfully enabled',
      recoveryCodes,
      // Important: Instruct the user to save these recovery codes
      recoveryCodesWarning: 'Save these recovery codes in a secure location. They will only be shown once.'
    }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return getErrorResponse(error, 400, 'Invalid verification code format');
    }

    console.error('MFA verification error:', error);
    return getErrorResponse(error, 500, 'Failed to verify MFA setup');
  }
} 