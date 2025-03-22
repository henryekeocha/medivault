import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ZodError, z } from 'zod';
import { getErrorResponse } from '@/lib/api/error-handler';
import { authOptions } from '@/lib/auth/auth-options';
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
    // Get the current user's session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return getErrorResponse('Unauthorized', 401);
    }

    // Parse and validate the request body
    const body = await req.json();
    const result = linkAccountSchema.safeParse(body);

    if (!result.success) {
      return getErrorResponse('Invalid request data', 400, result.error.message);
    }

    const {
      provider,
      providerAccountId,
      providerAccessToken,
      providerRefreshToken,
      providerTokenType,
      providerExpiresAt,
    } = result.data;

    // Check if the account is already linked
    const existingLink = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider,
        providerAccountId,
      },
    });

    if (existingLink) {
      return getErrorResponse('Account already linked', 400);
    }

    // Create the account link
    await prisma.account.create({
      data: {
        userId: session.user.id,
        type: 'oauth',
        provider,
        providerAccountId,
        access_token: providerAccessToken,
        refresh_token: providerRefreshToken,
        token_type: providerTokenType,
        expires_at: providerExpiresAt || null,
      },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Account linked successfully',
    });
  } catch (error) {
    console.error('Error linking account:', error);
    return getErrorResponse('Failed to link account', 500);
  }
} 