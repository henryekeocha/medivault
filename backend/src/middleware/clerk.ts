import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma.js';
import crypto from 'crypto';

// Ensure Clerk SDK is initialized with the secret key
if (!process.env.CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY is not defined in environment variables');
  throw new Error('CLERK_SECRET_KEY is missing');
}

// Extend the Express Request type to include our user type
declare module 'express' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: Role;
    };
    clerkId?: string;
  }
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Special case for auth sync routes - bypass authentication for these
  if (req.path.includes('/auth/sync') || 
      req.path === '/auth/send-code' || 
      req.path === '/auth/verify-code') {
    console.log(`Auth: Auth endpoint detected, bypassing auth protection for ${req.path}`);
    
    // If there's a Clerk ID in the URL, add it to the req.clerkId
    const clerkIdMatch = req.path.match(/\/sync\/([^\/]+)$/);
    if (clerkIdMatch && clerkIdMatch[1]) {
      req.clerkId = clerkIdMatch[1];
      console.log(`Auth: Extracted Clerk ID from URL: ${req.clerkId}`);
    }
    
    // For 2FA endpoints, we still need the token but won't error if missing
    if (req.path === '/auth/send-code' || req.path === '/auth/verify-code') {
      console.log(`Auth: 2FA endpoint detected: ${req.path}`);
      
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          console.log(`Auth: Attempting to verify token for 2FA endpoint`);
          const { sub: userId } = await clerkClient.verifyToken(token);
          req.clerkId = userId;
          console.log(`Auth: Extracted Clerk ID from token: ${userId}`);
          
          // Try to get user info for the request
          try {
            const dbUser = await prisma.user.findFirst({
              where: { authId: userId }
            });
            
            if (dbUser) {
              req.user = {
                id: dbUser.id,
                email: dbUser.email,
                role: dbUser.role
              };
              console.log(`Auth: Attached user info for 2FA endpoint: ${dbUser.id}`);
            }
          } catch (dbError) {
            console.error('Auth: Error getting user from database for 2FA endpoint:', dbError);
          }
        } catch (tokenError) {
          console.log('Auth: Invalid token for 2FA endpoint, continuing anyway');
        }
      } else {
        console.log('Auth: No auth token provided for 2FA endpoint, continuing anyway');
      }
    }
    
    return next();
  }

  try {
    // Get the session token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log(`Auth: Verifying token for request to ${req.path}`);
    
    try {
      console.log(`Auth: Attempting to verify token (${token.substring(0, 10)}...)`);
      
      // Verify the JWT and get the user ID from Clerk directly
      const { sub: userId } = await clerkClient.verifyToken(token);
      
      if (!userId) {
        console.log('Auth: No user ID found in token');
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      try {
        // Get the user from Clerk
        const user = await clerkClient.users.getUser(userId);
        if (!user) {
          console.log(`Auth: User not found in Clerk for ID ${userId}`);
          return res.status(401).json({ message: 'User not found' });
        }

        // Check if user is active in Clerk
        if (user.banned || !user.emailAddresses.some(email => email.verification?.status === 'verified')) {
          console.log(`Auth: User ${userId} account is inactive or unverified in Clerk`);
          return res.status(401).json({ message: 'Your account is inactive or unverified' });
        }

        // Check if 2FA is required but not verified
        const requires2FA = user.publicMetadata?.twoFactorRequired === true;
        const has2FAVerified = user.publicMetadata?.twoFactorVerified === true;
        const last2FAVerification = user.publicMetadata?.lastVerification as string | undefined;

        // If 2FA is required but not verified, or verification is too old
        if (requires2FA && 
            // Either never verified or verification is too old (24 hours)
            (!has2FAVerified || 
             (last2FAVerification && 
              (new Date().getTime() - new Date(last2FAVerification).getTime() > 24 * 60 * 60 * 1000)
             )
            ) && 
            // Allow access to auth endpoints
            !req.path.includes('/auth/') &&
            // And not accessing the health endpoint
            !req.path.includes('/health')) {
          console.log(`Auth: User ${userId} has not completed 2FA verification or verification has expired`);
          
          // Mark 2FA as unverified
          try {
            // Update Clerk metadata to reset 2FA verification status
            await clerkClient.users.updateUser(userId, {
              publicMetadata: { 
                ...user.publicMetadata,
                twoFactorVerified: false 
              }
            });
          } catch (updateError) {
            console.error(`Auth: Failed to update 2FA status:`, updateError);
            // Continue even if the update fails
          }
          
          return res.status(403).json({ 
            message: 'Two-factor authentication required',
            requires2FA: true
          });
        }

        // Get the user's role from our database
        const dbUser = await prisma.user.findFirst({
          where: {
            authId: userId
          }
        });

        console.log(`Auth: Database search for user with authId ${userId}: ${dbUser ? 'Found' : 'Not found'}`);

        // If we're already accessing the sync endpoint, don't require the user to exist
        if (req.path.includes('/auth/sync')) {
          // Just attach the Clerk user ID for the sync endpoint
          req.clerkId = userId;
          return next();
        }

        let userFromDb = dbUser;

        // If user doesn't exist in our database but is authenticated with Clerk, create the user
        if (!userFromDb) {
          console.log(`Auth: User with Clerk ID ${userId} not found in database. Creating new user...`);
          
          try {
            // Get primary email
            const primaryEmailId = user.primaryEmailAddressId;
            const primaryEmail = user.emailAddresses.find(
              emailObj => emailObj.id === primaryEmailId
            );
            
            if (!primaryEmail?.emailAddress) {
              console.error(`Auth: No primary email found for Clerk user: ${userId}`);
              return res.status(400).json({ 
                message: 'User has no primary email address',
                code: 'MISSING_EMAIL'
              });
            }
            
            // Determine role from Clerk metadata or default to PATIENT
            const role = (user.publicMetadata?.role || user.unsafeMetadata?.role || 'PATIENT') as Role;
            
            // Format email verification date
            const emailVerified = user.emailAddresses.some(email => email.verification?.status === 'verified') 
              ? new Date() 
              : null;
            
            // Generate a username based on first and last name with timestamp for uniqueness
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            const email = primaryEmail.emailAddress.toLowerCase();
            
            console.log(`Auth: Creating user with email: ${email}, firstName: ${firstName}, lastName: ${lastName}, role: ${role}`);
            
            // Check if a user with this email already exists (might have missing authId)
            const existingUserByEmail = await prisma.user.findFirst({
              where: { email }
            });
            
            if (existingUserByEmail) {
              console.log(`Auth: Found existing user with email ${email} but different authId. Updating authId...`);
              
              // Update the existing user with the Clerk authId
              userFromDb = await prisma.user.update({
                where: { id: existingUserByEmail.id },
                data: { 
                  authId: userId,
                  lastLoginAt: new Date(),
                  // Update other fields if needed
                  name: `${firstName || ''} ${lastName || ''}`.trim() || existingUserByEmail.name,
                  emailVerified: emailVerified || existingUserByEmail.emailVerified,
                  image: user.imageUrl || existingUserByEmail.image
                }
              });
              
              console.log(`Auth: Updated existing user with ID: ${userFromDb.id} to have authId: ${userId}`);
            } else {
              // Create a completely new user
              let retryCount = 0;
              const maxRetries = 3;
              
              while (retryCount < maxRetries) {
                try {
                  // Generate a completely unique username
                  const timestamp = Date.now().toString().slice(-6);
                  const randomUUID = Array.from(crypto.randomUUID().replace(/-/g, '')).slice(0, 8).join('');
                  
                  // Create username with guaranteed uniqueness
                  const baseUsername = `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
                  const username = baseUsername.length < 3 
                    ? `user_${timestamp}_${randomUUID}${retryCount > 0 ? `_r${retryCount}` : ''}`
                    : `${baseUsername}_${timestamp}_${randomUUID}${retryCount > 0 ? `_r${retryCount}` : ''}`;
                  
                  console.log(`Auth: Attempting to create user with username: ${username}, email: ${email}`);
                  
                  // Create user in database
                  userFromDb = await prisma.user.create({
                    data: {
                      authId: userId,
                      name: `${firstName || ''} ${lastName || ''}`.trim() || 'User',
                      email,
                      username,
                      password: '', // Empty since we're using Clerk
                      emailVerified,
                      role,
                      isActive: true,
                      lastLoginAt: new Date(),
                      image: user.imageUrl,
                    }
                  });
                  
                  console.log(`Auth: Successfully created user in database with ID: ${userFromDb.id}`);
                  break; // Success, exit the loop
                } catch (createError: any) {
                  retryCount++;
                  console.error(`Auth: Error creating user in database (attempt ${retryCount}/${maxRetries}):`, createError);
                  
                  // Check if this is a unique constraint violation
                  if (createError.code === 'P2002') {
                    console.log(`Auth: Unique constraint violation. Retrying with different username.`);
                  } else {
                    console.error('Auth: Unexpected error creating user:', createError);
                  }
                  
                  if (retryCount >= maxRetries) {
                    console.error('Auth: Maximum retry attempts reached. Failed to create user.');
                    return res.status(500).json({ 
                      message: 'Failed to create user in database after multiple attempts',
                      code: 'DB_CREATION_ERROR'
                    });
                  }
                  
                  // Wait longer between retries with exponential backoff
                  const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000); // max 10 seconds
                  console.log(`Auth: Waiting ${backoffTime}ms before retry ${retryCount + 1}...`);
                  await new Promise(resolve => setTimeout(resolve, backoffTime));
                }
              }
            }
            
            // Update Clerk metadata with the role and database ID
            await clerkClient.users.updateUser(userId, {
              publicMetadata: { 
                ...user.publicMetadata,
                role,
                dbSynced: true,
                dbUserId: userFromDb?.id,
                twoFactorRequired: true,
                twoFactorVerified: has2FAVerified || false,
                syncTimestamp: new Date().toISOString()
              }
            });
            
            if (userFromDb) {
              console.log(`Auth: Updated Clerk metadata with role: ${role} and dbUserId: ${userFromDb.id}`);
            } else {
              console.error(`Auth: Failed to create user in database, but updated Clerk metadata`);
            }
          } catch (error) {
            console.error('Auth: Failed to create or update user:', error);
            return res.status(500).json({ 
              message: 'Failed to create or update user',
              code: 'USER_CREATION_ERROR'
            });
          }
        } else {
          console.log(`Auth: Found user in database with ID: ${userFromDb.id}`);
        }

        // At this point userFromDb should be defined, but check anyway
        if (!userFromDb) {
          return res.status(500).json({ 
            message: 'Failed to create or retrieve user from database',
            code: 'DB_ERROR'
          });
        }

        // Check if user is active in our database
        if (!userFromDb.isActive) {
          console.log(`Auth: User ${userFromDb.id} account is inactive`);
          return res.status(401).json({ message: 'Your account has been deactivated' });
        }

        // Attach the user to the request
        req.user = {
          id: userFromDb.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          role: userFromDb.role
        };

        console.log(`Auth: Successfully authenticated user ${userFromDb.id} with role ${userFromDb.role}`);
        next();
      } catch (clerkError: any) {
        // Handle specific Clerk API errors
        console.error('Auth: Clerk API error during user verification:', clerkError);
        
        const errorMessage = clerkError.message || '';
        if (errorMessage.includes('Not Found')) {
          console.error(`Auth: User not found in Clerk`);
          return res.status(401).json({ 
            message: 'User not found. Please log in again.' 
          });
        } else if (errorMessage.includes('expired')) {
          return res.status(401).json({ 
            message: 'Your session has expired. Please log in again.' 
          });
        } else {
          return res.status(401).json({ 
            message: 'Authentication failed. Please log in again.' 
          });
        }
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ message: 'Authentication failed' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

export const restrictTo = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      console.log(`Auth: User ${req.user.id} with role ${req.user.role} tried to access a resource restricted to ${roles.join(', ')}`);
      return res.status(403).json({ 
        message: 'You do not have permission to perform this action' 
      });
    }

    next();
  };
};