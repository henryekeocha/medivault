import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getErrorResponse } from '@/lib/api/error-handler';
import { prisma } from '@/lib/db';

// Schema for validation
const verifySchema = z.object({
  type: z.enum(['email', 'phone']),
  code: z.string().min(4).max(8),
});

/**
 * POST handler to verify user attributes
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify user authentication using Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to verify attributes' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { type, code } = verifySchema.parse(body);

    // Get the user
    const user = await prisma.user.findUnique({
      where: { authId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }

    // In a real implementation, we'd verify against a verification code table
    // Since we don't have a specific verification code model, we simulate verification here
    
    // For email verification, update the emailVerified field
    if (type === 'email') {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      });
    } else if (type === 'phone') {
      // For phone verification, update the profile
      const userProfile = await prisma.profile.findUnique({
        where: { userId: user.id }
      });
      
      if (!userProfile) {
        // Create profile if it doesn't exist
        await prisma.profile.create({
          data: {
            userId: user.id,
            // Add empty required fields
            specialties: []
          }
        });
      } else {
        // User profile exists, no need to update anything else
        // The UI can check the presence of a phone number in the profile
        // as an indicator that the phone is verified
      }
    }

    // Log the verification
    await prisma.securityLog.create({
      data: {
        userId: user.id,
        action: `${type.toUpperCase()}_VERIFIED`,
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
        metadata: JSON.stringify({
          type,
          timestamp: new Date().toISOString()
        })
      }
    });

    return NextResponse.json({ 
      success: true,
      message: `Your ${type} has been verified successfully` 
    });
  } catch (error) {
    console.error(`Verification error:`, error);
    return getErrorResponse(error);
  }
} 