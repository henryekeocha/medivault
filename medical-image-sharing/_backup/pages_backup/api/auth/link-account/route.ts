import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ZodError, z } from 'zod';
import { getErrorResponse } from '@/lib/api/error-handler';
import { authOptions } from '../../../../../app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

// Schema for validating the account linking request
const linkAccountSchema = z.object({
  provider: z.enum(['google', 'facebook']),
  providerAccountId: z.string().min(1, 'Provider account ID is required'),
  providerAccessToken: z.string().min(1, 'Provider access token is required'),
  providerRefreshToken: z.string().optional(),
  providerTokenType: z.string().optional(),
  providerExpiresAt: z.number().optional(),
});

/**
 * POST handler for linking social provider accounts to the authenticated user
 * @param req NextRequest object containing the provider details
 * @returns NextResponse with success or error message
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Ensure the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to link accounts' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const accountData = linkAccountSchema.parse(body);

    // Check if this provider account is already linked to another user
    const existingAccount = await prisma.account.findFirst({
      where: {
        provider: accountData.provider,
        providerAccountId: accountData.providerAccountId,
      },
    });

    if (existingAccount) {
      // If the account is already linked to this user, return success
      if (existingAccount.userId === session.user.id) {
        return NextResponse.json(
          { success: true, message: 'Account already linked to your profile' },
          { status: 200 }
        );
      }

      // If linked to another user, return error
      return NextResponse.json(
        { error: 'Conflict', message: 'This social account is already linked to another user' },
        { status: 409 }
      );
    }

    // Create the account link
    await prisma.account.create({
      data: {
        userId: session.user.id,
        type: 'oauth',
        provider: accountData.provider,
        providerAccountId: accountData.providerAccountId,
        access_token: accountData.providerAccessToken,
        refresh_token: accountData.providerRefreshToken,
        token_type: accountData.providerTokenType,
        expires_at: accountData.providerExpiresAt,
      },
    });

    // Log the account linking for security auditing
    await prisma.securityLog.create({
      data: {
        userId: session.user.id,
        action: 'ACCOUNT_LINKED',
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
        metadata: {
          provider: accountData.provider,
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json(
      { success: true, message: 'Social account successfully linked' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return getErrorResponse(error, 400, 'Invalid request format');
    }

    console.error('Account linking error:', error);
    return getErrorResponse(error, 500, 'Failed to link account');
  }
} 