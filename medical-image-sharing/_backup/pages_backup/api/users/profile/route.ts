import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ZodError, z } from 'zod';
import { getErrorResponse } from '@/lib/api/error-handler';
import { authOptions } from '../../../../../app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { getPresignedDownloadUrl } from '@/lib/api/s3-api';

// Schema for validating user profile update requests
const profileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  specialties: z.array(z.string()).optional(),
  acceptingNewPatients: z.boolean().optional(),
  // Image URL will be updated separately via file upload
});

/**
 * GET handler to retrieve user profile
 * @returns NextResponse with user profile data
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to access your profile' },
        { status: 401 }
      );
    }

    // Retrieve user profile with non-sensitive information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            id: true,
            bio: true,
            location: true,
            phone: true,
            specialties: true,
            acceptingNewPatients: true,
          }
        },
        accounts: {
          select: {
            provider: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User profile not found' },
        { status: 404 }
      );
    }

    // Generate a presigned URL for the profile image if it exists
    let imageUrl = null;
    if (user.image) {
      try {
        imageUrl = await getPresignedDownloadUrl(
          process.env.S3_BUCKET_NAME || 'medical-images', 
          user.image, 
          60 * 15 // 15 minutes
        );
      } catch (error) {
        console.error('Failed to generate presigned URL for profile image:', error);
      }
    }

    // Format the response
    const responseUser = {
      ...user,
      image: imageUrl,
      connectedAccounts: user.accounts?.map((account: {provider: string}) => account.provider) || [],
      // Remove the accounts array from the response
      accounts: undefined
    };

    return NextResponse.json(responseUser, { status: 200 });
  } catch (error) {
    console.error('Profile retrieval error:', error);
    return getErrorResponse(error, 500, 'Failed to retrieve user profile');
  }
}

/**
 * PATCH handler to update user profile
 * @param req NextRequest object containing the profile updates
 * @returns NextResponse with updated profile data
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to update your profile' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const profileData = profileUpdateSchema.parse(body);

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true,
        profile: true
      }
    });

    if (!userExists) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare updates for user and profile
    const userUpdate: any = {};
    const profileUpdate: any = {};

    // Extract user and profile fields
    if (profileData.name !== undefined) {
      userUpdate.name = profileData.name;
    }

    if (profileData.bio !== undefined) {
      profileUpdate.bio = profileData.bio;
    }

    if (profileData.location !== undefined) {
      profileUpdate.location = profileData.location;
    }

    if (profileData.phone !== undefined) {
      profileUpdate.phone = profileData.phone;
    }

    if (profileData.specialties !== undefined) {
      profileUpdate.specialties = profileData.specialties;
    }

    if (profileData.acceptingNewPatients !== undefined) {
      profileUpdate.acceptingNewPatients = profileData.acceptingNewPatients;
    }

    // Start a transaction to update both user and profile
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user if there are changes
      let user = session.user;
      if (Object.keys(userUpdate).length > 0) {
        user = await tx.user.update({
          where: { id: session.user.id },
          data: userUpdate,
          select: {
            id: true, 
            name: true, 
            email: true, 
            image: true, 
            role: true,
            createdAt: true,
            updatedAt: true
          }
        });
      } else {
        // Fetch current user data if no updates
        user = await tx.user.findUnique({
          where: { id: session.user.id },
          select: {
            id: true, 
            name: true, 
            email: true, 
            image: true, 
            role: true,
            createdAt: true,
            updatedAt: true
          }
        });
      }

      // Update or create profile if there are changes
      let profile = null;
      if (Object.keys(profileUpdate).length > 0) {
        profile = await tx.profile.upsert({
          where: { 
            userId: session.user.id 
          },
          update: profileUpdate,
          create: {
            ...profileUpdate,
            userId: session.user.id
          },
          select: {
            id: true,
            bio: true,
            location: true,
            phone: true,
            specialties: true,
            acceptingNewPatients: true
          }
        });
      } else if (userExists.profile) {
        // Fetch current profile data if no updates
        profile = await tx.profile.findUnique({
          where: { userId: session.user.id },
          select: {
            id: true,
            bio: true,
            location: true,
            phone: true,
            specialties: true,
            acceptingNewPatients: true
          }
        });
      }

      // Log the profile update
      await tx.securityLog.create({
        data: {
          userId: session.user.id,
          action: 'PROFILE_UPDATED',
          ipAddress: req.headers.get('x-forwarded-for') || null,
          userAgent: req.headers.get('user-agent') || null,
          metadata: JSON.stringify({ 
            updatedFields: Object.keys({ ...userUpdate, ...profileUpdate }),
            timestamp: new Date()
          })
        }
      });

      return { ...user, profile };
    });

    // Generate a presigned URL for the profile image if it exists
    let imageUrl = null;
    if (updatedUser.image) {
      try {
        imageUrl = await getPresignedDownloadUrl(
          process.env.S3_BUCKET_NAME || 'medical-images', 
          updatedUser.image, 
          60 * 15 // 15 minutes
        );
      } catch (error) {
        console.error('Failed to generate presigned URL for profile image:', error);
      }
    }

    // Format and return the response
    return NextResponse.json({
      ...updatedUser,
      image: imageUrl
    }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return getErrorResponse(error, 400, 'Invalid profile data');
    }

    console.error('Profile update error:', error);
    return getErrorResponse(error, 500, 'Failed to update user profile');
  }
} 