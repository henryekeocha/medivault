import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/db';
import { DicomMetadata, ImageType } from '@/lib/api/types';
import { logAudit } from '@/lib/audit-logger'; 

/**
 * GET /api/images/[id]/dicom-metadata
 * 
 * Retrieve DICOM metadata for a specific image
 * 
 * @param req - The request object
 * @param { params } - The route parameters containing the image ID
 * @returns The DICOM metadata or an error response
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user from Clerk
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { authId: clerkUserId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'NotFound', message: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user.id;
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

    // Check if the image is a DICOM image
    if (image.type !== ImageType.CT && image.type !== ImageType.MRI) {
      return NextResponse.json(
        { error: 'BadRequest', message: 'Not a supported DICOM image type' },
        { status: 400 }
      );
    }

    // Get DICOM metadata from the image metadata or S3
    // For now, we're using a mock implementation
    // In a real implementation, you would parse the DICOM file
    // and extract the metadata
    let dicomMetadata: DicomMetadata;
    
    if (image.metadata && typeof image.metadata === 'object') {
      // If metadata is already stored with the image, use it
      dicomMetadata = (image.metadata as any).dicom as DicomMetadata || {};
    } else {
      // Mock DICOM metadata for demonstration
      // In production, this would actually parse the DICOM file
      dicomMetadata = {
        patientId: image.patientId || 'Unknown',
        patientName: 'ANONYMOUS', // For privacy
        modality: image.modality || 'Unknown',
        studyDate: image.studyDate?.toISOString() || new Date().toISOString(),
        bodyPartExamined: image.bodyPart || 'Unknown',
        rows: '512', // Convert to string as per DicomMetadata type
        columns: '512', // Convert to string as per DicomMetadata type
        // Other metadata fields would be populated from actual DICOM parsing
      };
    }

    // Log the audit event
    logAudit('DICOM_METADATA_ACCESS', {
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

    // Return the DICOM metadata
    return NextResponse.json({ 
      status: 'success',
      data: dicomMetadata
    });
  } catch (error) {
    console.error('Error retrieving DICOM metadata:', error);
    return NextResponse.json(
      { 
        error: 'InternalServerError', 
        message: 'Failed to retrieve DICOM metadata' 
      },
      { status: 500 }
    );
  }
} 