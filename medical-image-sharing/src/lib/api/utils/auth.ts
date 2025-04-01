import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { SignJWT, jwtVerify } from 'jose';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';

// Secret key for JWT signing - ensure it's properly set
const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 
  (() => {
    throw new Error('No JWT secret defined in environment variables');
  })()
);

// Type for Clerk email address
interface ClerkEmailAddress {
  id: string;
  emailAddress: string;
}

/**
 * Bridge utility between Clerk and other auth systems (like NextAuth)
 * This helps maintain compatibility when using both systems
 */
export const AuthBridge = {
  /**
   * Generate a NextAuth compatible JWT token from a Clerk session
   */
  async generateTokenFromClerk() {
    // Get the Clerk auth context and await it
    const authContext = await auth();
    const userId = authContext?.userId;
    
    if (!userId) {
      throw new Error('Not authenticated');
    }

    try {
      // Get Clerk user
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      
      if (!clerkUser) {
        throw new Error('User not found');
      }

      // Get email
      const primaryEmailId = clerkUser.primaryEmailAddressId;
      const email = clerkUser.emailAddresses.find(
        (emailObj: ClerkEmailAddress) => emailObj.id === primaryEmailId
      )?.emailAddress;

      if (!email) {
        throw new Error('User has no email');
      }

      // Get user from database
      const user = await prisma.user.findFirst({
        where: { authId: userId }
      });

      if (!user) {
        throw new Error('User not found in database');
      }

      // Create JWT token compatible with NextAuth
      const token = await new SignJWT({
        id: user.id,
        email,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        role: user.role,
        sub: user.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
      })
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secretKey);

      return { token, user };
    } catch (error) {
      console.error('Error generating token from Clerk:', error);
      throw error;
    }
  },

  /**
   * Verify a JWT token
   */
  async verifyToken(token: string) {
    try {
      const verified = await jwtVerify(token, secretKey);
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (verified.payload.exp && verified.payload.exp < now) {
        throw new Error('Token expired');
      }

      return verified.payload;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  },

  /**
   * Get the current user from the database based on Clerk session
   */
  async getCurrentUser() {
    // Get the Clerk auth context and await it
    const authContext = await auth();
    const userId = authContext?.userId;
    
    if (!userId) return null;

    try {
      // Find user by authId
      const user = await prisma.user.findFirst({
        where: { authId: userId }
      });
      
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  /**
   * Sync a user's Clerk data with our database
   */
  async syncClerkUserWithDb(clerkUserId: string) {
    try {
      // Get Clerk user
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(clerkUserId);
      
      if (!clerkUser) {
        throw new Error('Clerk user not found');
      }

      // Get email
      const primaryEmailId = clerkUser.primaryEmailAddressId;
      const email = clerkUser.emailAddresses.find(
        (emailObj: ClerkEmailAddress) => emailObj.id === primaryEmailId
      )?.emailAddress;

      if (!email) {
        throw new Error('User has no email');
      }

      // Get user from database
      const existingUser = await prisma.user.findFirst({
        where: { authId: clerkUserId }
      });

      if (existingUser) {
        // Update user with Clerk data
        return await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
            emailVerified: new Date(),
            lastLoginAt: new Date(),
          }
        });
      } else {
        // Create new user with default role
        const newUser = await prisma.user.create({
          data: {
            authId: clerkUserId,
            email,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
            password: '', // Empty when using Clerk
            role: Role.PATIENT,
            isActive: true,
            emailVerified: new Date(),
            lastLoginAt: new Date()
          }
        });

        // Update Clerk metadata with the role from database
        await clerk.users.updateUser(clerkUserId, {
          publicMetadata: { role: newUser.role }
        });

        return newUser;
      }
    } catch (error) {
      console.error('Error syncing user with database:', error);
      throw error;
    }
  },

  /**
   * Set or update a user's role in both Clerk and database
   */
  async setUserRole(clerkUserId: string, role: Role) {
    try {
      // Update database first
      const user = await prisma.user.findFirst({
        where: { authId: clerkUserId }
      });

      if (!user) {
        throw new Error('User not found in database');
      }

      // Update database
      await prisma.user.update({
        where: { id: user.id },
        data: { role }
      });

      // Then update Clerk metadata
      const clerk = await clerkClient();
      await clerk.users.updateUser(clerkUserId, {
        publicMetadata: { role }
      });

      return true;
    } catch (error) {
      console.error('Error setting user role:', error);
      throw error;
    }
  },

  /**
   * Check if MFA is enabled for the user
   */
  async isMFAEnabled(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { settings: true }
      });

      // If user settings don't exist, MFA is disabled
      if (!user?.settings) return false;
      
      return user.settings.mfaEnabled || false;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  }
}; 