import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getErrorResponse } from '@/lib/api/error-handler';
import prisma from '@/lib/db';
import { 
  getPresignedUploadUrl as getUploadUrl, 
  generateUniqueFilename 
} from '@/lib/api/s3-api';

/**
 * GET handler to generate a presigned URL for profile image upload
 * @returns NextResponse with presigned URL data
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify user authentication using Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to upload a profile image' },
        { status: 401 }
      );
    }

    // Get the user from the database
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

    // Generate a unique filename for the profile image
    const filename = generateUniqueFilename('profile.jpg');
    const key = `users/${user.id}/profile/${filename}`;
    
    // Get presigned URL from the backend
    const presignedUrlData = await getUploadUrl(
      process.env.NEXT_PUBLIC_USER_CONTENT_BUCKET || 'user-content',
      key,
      'image/jpeg'
    );

    return NextResponse.json({
      uploadUrl: presignedUrlData.url,
      key,
      fileKey: key,
      expiresIn: presignedUrlData.expiresIn || 300,
      message: 'Presigned URL generated successfully'
    });
  } catch (error) {
    console.error('Error generating presigned URL for profile image:', error);
    return getErrorResponse(error);
  }
}

/**
 * POST handler to process an uploaded profile image
 * @returns NextResponse with the updated user profile
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify user authentication using Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to upload a profile image' },
        { status: 401 }
      );
    }

    // Get the user from the database
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

    // Parse the request body
    const body = await req.json();
    const { fileKey } = body;
    
    if (!fileKey) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'File key is required' },
        { status: 400 }
      );
    }

    // Update the user's profile image in the database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        image: fileKey,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    // Log the profile image update for security auditing
    await prisma.securityLog.create({
      data: {
        userId: user.id,
        action: 'PROFILE_IMAGE_UPDATED',
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
        metadata: JSON.stringify({
          fileKey: fileKey,
          timestamp: new Date().toISOString()
        })
      }
    });

    return NextResponse.json({
      user: updatedUser,
      message: 'Profile image updated successfully',
    });
  } catch (error) {
    console.error('Profile image update error:', error);
    return getErrorResponse(error);
  }
} 