import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authOptions, UserRole } from '@/lib/auth/auth-options';
import { getErrorResponse } from '@/lib/api/error-handler';
import { verifyLicense } from '@/lib/verification/license-verification';
import { getPresignedUrl } from '@/lib/aws/s3-utils';

// Define VerificationStatus enum locally since there's an issue with importing from Prisma
enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

// Schema validation for POST request body
const ProviderVerificationSchema = z.object({
  licenseNumber: z.string().min(5, 'License number is required (min 5 characters)'),
  licenseState: z.string().length(2, 'State code must be 2 characters'),
  licenseExpiryDate: z.string().transform((str) => new Date(str)),
  specialtyName: z.string().optional(),
  identityDocumentKey: z.string().optional(),
  licenseDocumentKey: z.string(),
  selfieKey: z.string().optional(),
});

type ProviderVerificationInput = z.infer<typeof ProviderVerificationSchema>;

/**
 * GET: Retrieve the current provider's verification status
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if the user is a provider
    if (session.user.role !== UserRole.PROVIDER) {
      return NextResponse.json(
        { error: 'Only providers can access this endpoint' },
        { status: 403 }
      );
    }
    
    // Get the provider's verification from the database
    const verification = await prisma.providerVerification.findUnique({
      where: { providerId: session.user.id },
    });
    
    // If no verification exists, return success with null data
    if (!verification) {
      return NextResponse.json({ 
        verification: null,
        message: 'No verification found'
      });
    }
    
    // Generate presigned URLs for the documents
    const presignedUrls: Record<string, string> = {};
    
    if (verification.identityDocumentS3Key) {
      presignedUrls.identityDocument = await getPresignedUrl(verification.identityDocumentS3Key);
    }
    
    if (verification.licenseDocumentS3Key) {
      presignedUrls.licenseDocument = await getPresignedUrl(verification.licenseDocumentS3Key);
    }
    
    if (verification.selfieS3Key) {
      presignedUrls.selfie = await getPresignedUrl(verification.selfieS3Key);
    }
    
    return NextResponse.json({
      verification,
      presignedUrls,
      message: 'Verification found'
    });
  } catch (error) {
    return getErrorResponse(error);
  }
}

/**
 * POST: Create or update provider verification
 */
export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if the user is a provider
    if (session.user.role !== UserRole.PROVIDER) {
      return NextResponse.json(
        { error: 'Only providers can access this endpoint' },
        { status: 403 }
      );
    }
    
    // Parse and validate the request body
    const body = await req.json();
    const validatedData = ProviderVerificationSchema.parse(body);
    
    // Check if provider already has a pending verification
    const existingVerification = await prisma.providerVerification.findUnique({
      where: { providerId: session.user.id },
    });
    
    if (existingVerification && existingVerification.verificationStatus === VerificationStatus.PENDING) {
      return NextResponse.json(
        { error: 'You already have a pending verification request' },
        { status: 400 }
      );
    }
    
    // Handle license verification (in a real app, this would call an external service)
    const verificationResult = await verifyLicense({
      licenseNumber: validatedData.licenseNumber,
      licenseState: validatedData.licenseState,
      licenseExpiryDate: validatedData.licenseExpiryDate,
      specialtyName: validatedData.specialtyName,
      licenseDocumentKey: validatedData.licenseDocumentKey,
      identityDocumentKey: validatedData.identityDocumentKey,
      selfieKey: validatedData.selfieKey
    });
    
    // Create or update the verification
    const verification = await prisma.providerVerification.upsert({
      where: { providerId: session.user.id },
      update: {
        licenseNumber: validatedData.licenseNumber,
        licenseState: validatedData.licenseState,
        licenseExpiryDate: validatedData.licenseExpiryDate,
        specialtyName: validatedData.specialtyName,
        identityDocumentS3Key: validatedData.identityDocumentKey,
        licenseDocumentS3Key: validatedData.licenseDocumentKey,
        selfieS3Key: validatedData.selfieKey,
        verificationStatus: VerificationStatus.PENDING,
        // Reset any previous rejection
        rejectionReason: null,
        rejectedAt: null,
      },
      create: {
        providerId: session.user.id,
        licenseNumber: validatedData.licenseNumber,
        licenseState: validatedData.licenseState,
        licenseExpiryDate: validatedData.licenseExpiryDate,
        specialtyName: validatedData.specialtyName,
        identityDocumentS3Key: validatedData.identityDocumentKey,
        licenseDocumentS3Key: validatedData.licenseDocumentKey,
        selfieS3Key: validatedData.selfieKey,
        verificationStatus: VerificationStatus.PENDING,
      }
    });
    
    // Generate presigned URLs for the documents
    const presignedUrls: Record<string, string> = {};
    
    if (verification.identityDocumentS3Key) {
      presignedUrls.identityDocument = await getPresignedUrl(verification.identityDocumentS3Key);
    }
    
    if (verification.licenseDocumentS3Key) {
      presignedUrls.licenseDocument = await getPresignedUrl(verification.licenseDocumentS3Key);
    }
    
    if (verification.selfieS3Key) {
      presignedUrls.selfie = await getPresignedUrl(verification.selfieS3Key);
    }
    
    return NextResponse.json({
      verification,
      presignedUrls,
      message: 'Verification submitted successfully',
      preliminaryResult: verificationResult,
    });
  } catch (error) {
    return getErrorResponse(error);
  }
} 