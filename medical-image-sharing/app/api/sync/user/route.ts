import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function POST(req: Request) {
  try {
    console.log('User sync endpoint called');
    
    // Get the authenticated user from Clerk
    const { userId } = await auth();
    if (!userId) {
      console.log('No userId found in auth');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Auth userId:', userId);

    // Get user data from Clerk
    const clerkResponse = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`
      }
    });
    
    if (!clerkResponse.ok) {
      console.error('Failed to fetch from Clerk API:', clerkResponse.status);
      return NextResponse.json(
        { error: 'Failed to fetch user data from Clerk' },
        { status: 500 }
      );
    }
    
    const user = await clerkResponse.json();

    if (!user) {
      console.log('User not found in Clerk response');
      return NextResponse.json(
        { error: 'User not found in Clerk' },
        { status: 404 }
      );
    }
    
    console.log('Clerk user metadata:', { 
      publicMetadata: user.public_metadata, 
      unsafeMetadata: user.unsafe_metadata
    });

    // Get the email from Clerk
    const userEmail = user.email_addresses?.[0]?.email_address;
    
    if (!userEmail) {
      console.log('No email found for user');
      return NextResponse.json(
        { error: 'No email found for user' },
        { status: 400 }
      );
    }

    // Get user's role from metadata or database - check both camelCase and snake_case
    let role = user.public_metadata?.role || user.unsafe_metadata?.role || 
               user.publicMetadata?.role || user.unsafeMetadata?.role;
    
    console.log('Initial role detection:', role);
    
    // Check if user exists by authId or email
    const existingUserByAuthId = await prisma.user.findUnique({
      where: { authId: userId }
    });
    
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    console.log('Existing user by authId:', existingUserByAuthId?.id);
    console.log('Existing user by email:', existingUserByEmail?.id);
    
    // Handle existing user checks
    let existingUser = existingUserByAuthId;
    
    // If we found a user by email but not by authId, or found different users
    if (existingUserByEmail && (!existingUserByAuthId || existingUserByEmail.id !== existingUserByAuthId.id)) {
      console.log('Found existing user with same email but different authId');
      
      // Update the existing user's authId to link it with the current Clerk user
      await prisma.user.update({
        where: { id: existingUserByEmail.id },
        data: { authId: userId }
      });
      
      existingUser = existingUserByEmail;
    }
    
    // If no role in metadata, use existing user's role or default to PATIENT
    if (!role) {
      if (existingUser?.role) {
        console.log('Found role in database:', existingUser.role);
        role = existingUser.role;
      } else {
        console.log('No role found, using default PATIENT role');
        role = 'PATIENT';
      }
    }
    
    console.log('Final role used:', role);

    // Prepare user data for update or create
    const userData = {
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      email: userEmail,
      role: role as Role,
      emailVerified: new Date(),
      image: user.image_url,
      isActive: true,
      lastLoginAt: new Date(),
      lastActiveAt: new Date()
    };
    
    let dbUser;
    
    if (existingUser) {
      // Update existing user
      console.log('Updating existing user:', existingUser.id);
      dbUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: userData
      });
    } else {
      // Create new user
      console.log('Creating new user');
      dbUser = await prisma.user.create({
        data: {
          ...userData,
          authId: userId,
          username: `${user.first_name || ''}${user.last_name || ''}`.toLowerCase() || `user_${Date.now()}`,
          password: '' // Empty password since we're using Clerk
        }
      });
    }
    
    console.log('User operation successful:', dbUser.id);

    // Always update Clerk metadata to ensure consistency
    try {
      await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          public_metadata: {
            dbUserId: dbUser.id,
            role: role,
            dbSynced: true,
            syncTimestamp: new Date().toISOString()
          }
        })
      });
      console.log('Clerk metadata updated successfully');
    } catch (error) {
      console.error('Error updating Clerk metadata:', error);
      // Don't fail the request if metadata update fails
    }

    return NextResponse.json({
      success: true,
      user: dbUser
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    );
  }
} 