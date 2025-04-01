import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../lib/prisma.js';
import { Role } from '@prisma/client';

// Time threshold for syncing (30 minutes)
const SYNC_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * Middleware to synchronize user data from Clerk to our database
 * Called on authenticated requests to ensure data consistency
 */
export const syncUserMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip if no authenticated user
    if (!req.user?.id || !req.clerkId) {
      return next();
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!dbUser) {
      console.error(`SyncMiddleware: User not found in database: ${req.user.id}`);
      return next();
    }

    // Skip if user was synced recently (within threshold)
    const lastSyncTime = dbUser.updatedAt.getTime();
    const now = Date.now();
    
    if (now - lastSyncTime < SYNC_THRESHOLD_MS) {
      return next();
    }

    console.log(`SyncMiddleware: Syncing user data for ${req.user.id} (Clerk ID: ${req.clerkId})`);

    try {
      // Get user from Clerk
      const clerkUser = await clerkClient.users.getUser(req.clerkId);

      // Skip if no Clerk user found
      if (!clerkUser) {
        console.error(`SyncMiddleware: Clerk user not found: ${req.clerkId}`);
        return next();
      }

      // Get email address
      const primaryEmailId = clerkUser.primaryEmailAddressId;
      const email = clerkUser.emailAddresses.find(
        emailObj => emailObj.id === primaryEmailId
      )?.emailAddress;

      if (!email) {
        console.error(`SyncMiddleware: No email found for Clerk user: ${req.clerkId}`);
        return next();
      }

      // Get MFA status
      const hasMFA = clerkUser.twoFactorEnabled || false;
      
      // Get role from metadata or use existing role
      const role = (clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role || dbUser.role) as Role;

      // Update user in database
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          email,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || dbUser.name,
          role,
          image: clerkUser.imageUrl || dbUser.image,
          emailVerified: clerkUser.emailAddresses.find(
            emailObj => emailObj.id === primaryEmailId
          )?.verification?.status === 'verified' 
            ? new Date() 
            : dbUser.emailVerified
        }
      });

      console.log(`SyncMiddleware: User ${req.user.id} synced successfully`);
    } catch (clerkError) {
      console.error('SyncMiddleware: Error fetching Clerk user:', clerkError);
      // Continue to next middleware even if sync fails
    }
  } catch (error) {
    console.error('SyncMiddleware: Unexpected error:', error);
  }

  next();
}; 