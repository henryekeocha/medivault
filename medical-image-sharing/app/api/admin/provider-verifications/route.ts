import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getErrorResponse } from '@/lib/api/error-handler';
import { getPresignedDownloadUrl } from '@/lib/api/s3-api';

// Define VerificationStatus enum locally since there's an issue with importing from Prisma
enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

/**
 * GET: List provider verifications for admin review
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the user from the database to check role
    const user = await prisma.user.findUnique({
      where: { authId: userId },
      select: { id: true, role: true }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can access this endpoint' },
        { status: 403 }
      );
    }
    
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status') as VerificationStatus | null;
    const search = searchParams.get('search') || '';
    
    // Build filters
    const filters: any = {
      ...(status ? { verificationStatus: status } : {}),
      ...(search ? {
        OR: [
          { licenseNumber: { contains: search, mode: 'insensitive' } },
          { licenseState: { contains: search, mode: 'insensitive' } },
          { specialtyName: { contains: search, mode: 'insensitive' } },
          { provider: { 
            name: { contains: search, mode: 'insensitive' }
          } },
        ]
      } : {})
    };
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const total = await prisma.providerVerification.count({
      where: filters
    });
    
    // Get the paginated verifications with provider info
    const verifications = await prisma.providerVerification.findMany({
      where: filters,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    
    // Generate presigned URLs for the documents
    const verificationWithUrls = await Promise.all(
      verifications.map(async (verification) => {
        const presignedUrls: Record<string, string> = {};
        
        if (verification.identityDocumentS3Key) {
          presignedUrls.identityDocument = await getPresignedDownloadUrl(
            process.env.S3_BUCKET_NAME as string,
            verification.identityDocumentS3Key
          );
        }
        
        if (verification.licenseDocumentS3Key) {
          presignedUrls.licenseDocument = await getPresignedDownloadUrl(
            process.env.S3_BUCKET_NAME as string,
            verification.licenseDocumentS3Key
          );
        }
        
        if (verification.selfieS3Key) {
          presignedUrls.selfie = await getPresignedDownloadUrl(
            process.env.S3_BUCKET_NAME as string,
            verification.selfieS3Key
          );
        }
        
        return {
          ...verification,
          presignedUrls
        };
      })
    );
    
    // Format response for pagination
    return NextResponse.json({
      verifications: verificationWithUrls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}
