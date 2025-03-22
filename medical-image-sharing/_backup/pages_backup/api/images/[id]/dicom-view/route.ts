import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { ImageType } from '@/lib/api/types';
import { authOptions } from '../../../../../../app/api/auth/[...nextauth]/route';
import { logAudit } from '@/lib/audit-logger';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * GET /api/images/[id]/dicom-view
 * 
 * Generate a presigned URL or serve DICOM data for viewing
 * 
 * @param req - The request object
 * @param { params } - The route parameters containing the image ID
 * @returns A view URL or the DICOM data for direct serving
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const imageId = params.id;

    // Fetch the image with permission checks
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: {
        shares: {
          where: {
            OR: [
              { sharedWithUserId: userId },
              { sharedByUserId: userId }
            ]
          }
        }
      }
    });

    // Check if image exists
    if (!image) {
      return NextResponse.json(
        { error: 'NotFound', message: 'Image not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to access the image
    const userOwnsImage = image.userId === userId;
    const imageIsSharedWithUser = image.shares.length > 0;
    
    if (!userOwnsImage && !imageIsSharedWithUser) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'No permission to access this image' },
        { status: 403 }
      );
    }

    // Check if the image is a DICOM-compatible image type
    if (image.type !== ImageType.CT && image.type !== ImageType.MRI) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Not a supported DICOM image type' },
        { status: 400 }
      );
    }

    // Log the access attempt
    logAudit('DICOM_VIEW_ACCESS', {
      status: 'success',
      timestamp: new Date().toISOString(),
      imageId,
      userId
    });

    // Update last viewed timestamp
    await prisma.image.update({
      where: { id: imageId },
      data: {
        lastViewed: new Date(),
        viewCount: {
          increment: 1
        }
      }
    });

    // Check if we need to generate a presigned URL (S3 storage)
    if (image.s3Key) {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: image.s3Key,
        });

        // Generate a presigned URL that expires in 15 minutes
        const presignedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 15 * 60 // 15 minutes
        });

        return NextResponse.json({ 
          status: 'success',
          data: {
            url: presignedUrl,
            contentType: image.fileType || 'application/dicom',
            filename: image.filename,
          }
        });
      } catch (s3Error) {
        console.error('Error generating presigned URL:', s3Error);
        return NextResponse.json(
          { 
            error: 'S3Error', 
            message: 'Failed to generate access URL for DICOM file' 
          },
          { status: 500 }
        );
      }
    } else {
      // For local storage, we would read the file and return it
      // This is a placeholder for now
      return NextResponse.json(
        { 
          error: 'NotImplemented', 
          message: 'Local DICOM file serving not implemented' 
        },
        { status: 501 }
      );
    }
  } catch (error) {
    console.error('Error serving DICOM file:', error);
    return NextResponse.json(
      { 
        error: 'InternalServerError', 
        message: 'Failed to serve DICOM file' 
      },
      { status: 500 }
    );
  }
} 