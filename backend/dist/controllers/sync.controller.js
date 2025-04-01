import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../lib/prisma.js';
import { Role } from '@prisma/client';
import { catchAsync } from '../utils/catchAsync.js';
/**
 * Full synchronization of user data from Clerk to our database
 * Can be triggered explicitly from frontend or other services
 */
export const syncUser = catchAsync(async (req, res) => {
    // Ensure authentication
    if (!req.user?.id || !req.clerkId) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
        });
    }
    console.log(`Sync: Processing explicit sync for user ${req.user.id} (Clerk ID: ${req.clerkId})`);
    try {
        // Get user from Clerk
        const clerkUser = await clerkClient.users.getUser(req.clerkId);
        // Verify Clerk user exists
        if (!clerkUser) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found in Clerk'
            });
        }
        // Get primary email
        const primaryEmailId = clerkUser.primaryEmailAddressId;
        const primaryEmail = clerkUser.emailAddresses.find(emailObj => emailObj.id === primaryEmailId);
        if (!primaryEmail?.emailAddress) {
            return res.status(400).json({
                status: 'error',
                message: 'User has no primary email address'
            });
        }
        // Get MFA status from Clerk - this is for reference only now
        const twoFactorEnabled = clerkUser.twoFactorEnabled || false;
        // Get role from metadata or default to PATIENT
        const role = (clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role || Role.PATIENT);
        // Construct name from first and last name
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
        // Get verification status
        const emailVerified = primaryEmail.verification?.status === 'verified'
            ? new Date()
            : null;
        // Get user from database
        const dbUser = await prisma.user.findUnique({
            where: { id: req.user.id }
        });
        if (!dbUser) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found in database'
            });
        }
        // Update user in database
        const updatedUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
                email: primaryEmail.emailAddress,
                name: name || dbUser.name,
                role,
                image: clerkUser.imageUrl || dbUser.image,
                emailVerified: emailVerified || dbUser.emailVerified,
                lastLoginAt: new Date(),
                updatedAt: new Date() // Force update timestamp
            }
        });
        // Update Clerk metadata if needed
        if (!clerkUser.publicMetadata?.dbUserId || clerkUser.publicMetadata?.role !== role) {
            try {
                await clerkClient.users.updateUser(req.clerkId, {
                    publicMetadata: {
                        ...clerkUser.publicMetadata,
                        role,
                        dbUserId: updatedUser.id,
                        dbSynced: true,
                        lastSyncAt: new Date().toISOString()
                    }
                });
                console.log(`Sync: Updated Clerk metadata for user ${req.user.id}`);
            }
            catch (metadataError) {
                console.error('Sync: Error updating Clerk metadata:', metadataError);
                // Continue execution even if metadata update fails
            }
        }
        return res.status(200).json({
            status: 'success',
            message: 'User data synchronized successfully',
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
                image: updatedUser.image
            }
        });
    }
    catch (error) {
        console.error('Sync: Error synchronizing user:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to synchronize user data',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
        });
    }
});
//# sourceMappingURL=sync.controller.js.map