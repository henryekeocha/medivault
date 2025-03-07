import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authOptions, UserRole } from '@/lib/auth/auth-options';
import { getErrorResponse } from '@/lib/api/error-handler';
import { ProviderSpecialty as PrismaProviderSpecialty, NotificationType as PrismaNotificationType } from '@prisma/client';

// Define enums locally since there's an issue with importing from Prisma
enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

// Schema validation for PATCH request body
const VerificationReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * PATCH: Review a provider verification request
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if the user is an admin
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Only administrators can review verification requests' },
        { status: 403 }
      );
    }
    
    // Parse and validate the request body
    const body = await req.json();
    const validatedData = VerificationReviewSchema.parse(body);
    
    // Check if the verification exists
    const verification = await prisma.providerVerification.findUnique({
      where: { id: params.id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
    
    if (!verification) {
      return NextResponse.json(
        { error: 'Verification not found' },
        { status: 404 }
      );
    }
    
    // Check if the verification is pending
    if (verification.verificationStatus !== VerificationStatus.PENDING) {
      return NextResponse.json(
        { error: 'This verification has already been reviewed' },
        { status: 400 }
      );
    }
    
    // Update the verification status
    const updatedVerification = await prisma.providerVerification.update({
      where: { id: params.id },
      data: {
        verificationStatus: validatedData.status as VerificationStatus,
        verifiedAt: new Date(),
        verifiedBy: session.user.id,
        rejectionReason: validatedData.status === 'REJECTED' ? validatedData.rejectionReason : null,
        rejectedAt: validatedData.status === 'REJECTED' ? new Date() : null,
        notes: validatedData.notes,
      }
    });
    
    // If approved, update the provider's specialty if available
    if (validatedData.status === 'APPROVED' && verification.specialtyName) {
      // Convert the specialty string to enum value if possible, otherwise use null
      // This ensures type safety with the Prisma schema
      const specialtyValue = Object.values(PrismaProviderSpecialty).includes(
        verification.specialtyName as any
      ) 
        ? (verification.specialtyName as PrismaProviderSpecialty)
        : null;

      await prisma.user.update({
        where: { id: verification.providerId },
        data: {
          specialty: specialtyValue
        }
      });
    }
    
    // Create a notification for the provider
    const notificationType = validatedData.status === 'APPROVED' 
      ? 'VERIFICATION_APPROVED'
      : 'VERIFICATION_REJECTED';
      
    await prisma.notification.create({
      data: {
        userId: verification.providerId,
        type: notificationType === 'VERIFICATION_APPROVED' 
          ? PrismaNotificationType.SYSTEM_UPDATE
          : PrismaNotificationType.SECURITY_ALERT,
        content: validatedData.status === 'APPROVED' 
          ? 'Your provider verification has been approved.'
          : `Your provider verification has been rejected. Reason: ${validatedData.rejectionReason || 'No reason provided'}`,
        read: false,
        metadata: {
          verificationId: verification.id,
          verificationType: notificationType
        }
      }
    });
    
    // Create an audit log entry
    await prisma.auditLog.create({
      data: {
        action: `VERIFICATION_${validatedData.status}`,
        userId: session.user.id,
        details: {
          resourceType: 'ProviderVerification',
          resourceId: verification.id,
          status: validatedData.status,
          providerId: verification.providerId,
          providerName: verification.provider.name,
          rejectionReason: validatedData.rejectionReason,
          notes: validatedData.notes,
        }
      }
    });
    
    return NextResponse.json({
      verification: updatedVerification,
      message: `Verification ${validatedData.status.toLowerCase()}`
    });
  } catch (error) {
    return getErrorResponse(error);
  }
} 