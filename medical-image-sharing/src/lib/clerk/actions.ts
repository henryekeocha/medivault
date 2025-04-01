'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function getCurrentUserRole(): Promise<Role | null> {
  try {
    console.log('Getting current user role...');
    const { userId } = await auth();
    console.log('Auth userId:', userId);
    
    if (!userId) {
      console.log('No userId found');
      return null;
    }

    // First try to get the role from Clerk metadata
    try {
      // Fetch user details from Clerk
      const clerkResponse = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`
        }
      });
      
      if (clerkResponse.ok) {
        const clerkUser = await clerkResponse.json();
        console.log('Clerk user found, checking metadata for role');
        
        // Check for role in metadata
        const roleFromMetadata = clerkUser.public_metadata?.role || clerkUser.unsafe_metadata?.role;
        if (roleFromMetadata) {
          console.log('Found role in Clerk metadata:', roleFromMetadata);
          return roleFromMetadata as Role;
        }
      }
    } catch (metadataError) {
      console.error('Error fetching Clerk metadata:', metadataError);
    }

    // If Clerk metadata doesn't have role, try the database
    // Try to get the role from the database
    const user = await prisma.user.findFirst({
      where: { authId: userId },
      select: {
        role: true,
        isActive: true
      }
    });

    console.log('Database user:', user);
    
    if (!user) {
      console.log('No user found in database');
      
      // If we couldn't get the role from metadata or database, try syncing
      console.log('Attempting to sync user');
      const syncedUser = await syncUser();
      if (syncedUser) {
        return syncedUser.role;
      }
      
      return null;
    }

    if (!user.isActive) {
      console.log('User account is not active');
      return null;
    }

    console.log('Found user role in database:', user.role);
    return user.role;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

export async function syncUser(): Promise<{ id: string, role: Role } | null> {
  try {
    console.log('Syncing user with database...');
    const { userId } = await auth();
    
    if (!userId) {
      console.log('No userId found during sync');
      return null;
    }

    // Check if user already exists in the database
    const existingUser = await prisma.user.findFirst({
      where: { authId: userId }
    });

    if (existingUser) {
      console.log('User already exists in database:', existingUser.id);
      return { id: existingUser.id, role: existingUser.role };
    }

    // User doesn't exist, create a new one
    // First fetch user details from Clerk
    const clerkResponse = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`
      }
    });

    if (!clerkResponse.ok) {
      console.error('Failed to fetch user from Clerk API:', clerkResponse.statusText);
      return null;
    }

    const clerkUser = await clerkResponse.json();
    
    // Get email information
    const primaryEmail = clerkUser.email_addresses.find(
      (email: any) => email.id === clerkUser.primary_email_address_id
    );

    if (!primaryEmail) {
      console.error('No primary email found for user:', userId);
      return null;
    }

    const email = primaryEmail.email_address;
    const isEmailVerified = primaryEmail.verification?.status === 'verified';
    
    // Determine role - don't default to PATIENT if not specified
    const roleFromMetadata = clerkUser.public_metadata?.role || clerkUser.unsafe_metadata?.role;
    if (!roleFromMetadata) {
      console.log('No role specified for user:', userId);
      return null;
    }
    const role = roleFromMetadata as Role;
    
    // Generate a username from email or first/last name
    const firstName = clerkUser.first_name || '';
    const lastName = clerkUser.last_name || '';
    const baseUsername = email.split('@')[0] || `${firstName}${lastName}`.toLowerCase() || userId;
    const timestamp = Date.now().toString().slice(-6);
    const username = `${baseUsername}_${timestamp}`;

    // Create the user in our database
    const newUser = await prisma.user.create({
      data: {
        authId: userId,
        email,
        name: `${firstName} ${lastName}`.trim() || 'User',
        username,
        password: '', // Not needed with Clerk
        emailVerified: isEmailVerified ? new Date() : null,
        role,
        isActive: true,
        lastLoginAt: new Date(),
        image: clerkUser.image_url || ''
      }
    });

    console.log('Created new user in database:', newUser.id);

    // Update Clerk metadata with database ID and role
    try {
      await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          public_metadata: {
            dbUserId: newUser.id,
            role,
            dbSynced: true,
            syncTimestamp: new Date().toISOString()
          }
        })
      });
      console.log('Updated Clerk metadata with database ID:', newUser.id);
    } catch (error) {
      console.error('Error updating Clerk metadata:', error);
      // Continue even if metadata update fails
    }

    return { id: newUser.id, role: newUser.role };
  } catch (error) {
    console.error('Error syncing user:', error);
    return null;
  }
} 