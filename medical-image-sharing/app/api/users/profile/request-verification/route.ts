import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getErrorResponse } from '@/lib/api/error-handler';
import { prisma } from '@/lib/db';

// Schema for validation
const requestSchema = z.object({
  type: z.enum(['email', 'phone']),
});

/**
 * Generate a random verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST handler to request verification codes
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify user authentication using Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to request verification' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { authId: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { type } = requestSchema.parse(body);

    // Get the user with profile
    const userWithProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true }
    });

    if (!userWithProfile) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    
    // In a real implementation, we would store this code in a database
    // and create an actual verification workflow.
    // For this example, we'll use a simpler approach.

    // Log the verification request for audit purposes
    await prisma.securityLog.create({
      data: {
        userId: user.id,
        action: `${type.toUpperCase()}_VERIFICATION_REQUESTED`,
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
        metadata: JSON.stringify({
          code: verificationCode, // In a real system, don't log the actual code!
          timestamp: new Date().toISOString()
        })
      }
    });

    // In a real implementation, we would send an email or SMS here
    // For this example, we'll simulate success and return the code in the response
    // (which is only okay for development purposes)

    return NextResponse.json({ 
      success: true,
      message: `Verification code sent to your ${type}`,
      // IMPORTANT: In production, NEVER return the actual code in the response!
      // This is just for development/testing purposes
      code: verificationCode
    });
  } catch (error) {
    console.error(`Verification request error:`, error);
    return getErrorResponse(error);
  }
} 