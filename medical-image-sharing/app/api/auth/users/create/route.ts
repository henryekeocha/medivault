import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  console.log('User creation endpoint called');
  
  try {
    // Get authenticated user from Clerk
    const authResult = await auth();
    const userId = authResult?.userId;
    
    if (!userId) {
      console.error('No authenticated user found');
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized - No user authenticated' 
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await req.json();
    const { 
      authId = userId, 
      name, 
      email, 
      username, 
      role = 'USER', 
      specialty = 'GENERAL',
      emailVerified = false,
      image = ''
    } = body;
    
    // Validate required fields
    if (!authId || !email) {
      return NextResponse.json({ 
        success: false, 
        message: 'AuthId and email are required' 
      }, { status: 400 });
    }
    
    console.log(`Creating/updating user with authId: ${authId}`);
    
    // Get user from Clerk to validate and get additional information
    let clerkUser;
    try {
      const clerk = await clerkClient();
      clerkUser = await clerk.users.getUser(authId);
    } catch (clerkError) {
      console.error('Error fetching user from Clerk:', clerkError);
    }
    
    // If no username provided, generate one
    const finalUsername = username || 
      (clerkUser && `${clerkUser.firstName}${clerkUser.lastName}`.toLowerCase().replace(/\s+/g, '')) || 
      `user_${Date.now().toString().slice(-6)}`;
    
    // Create or update user in database
    try {
      const dbUser = await prisma.user.upsert({
        where: { authId },
        update: {
          name: name || (clerkUser && `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()) || 'Anonymous User',
          email: email || (clerkUser && clerkUser.emailAddresses[0]?.emailAddress) || '',
          role: role as Role,
          specialty: specialty as any,
          emailVerified: emailVerified ? new Date() : null,
          image: image || (clerkUser && clerkUser.imageUrl) || '',
          isActive: true,
          lastLoginAt: new Date(),
          lastActiveAt: new Date()
        },
        create: {
          authId,
          name: name || (clerkUser && `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()) || 'Anonymous User',
          email: email || (clerkUser && clerkUser.emailAddresses[0]?.emailAddress) || '',
          username: finalUsername,
          password: '', // Empty password when using Clerk
          role: role as Role,
          specialty: specialty as any,
          emailVerified: emailVerified ? new Date() : null,
          image: image || (clerkUser && clerkUser.imageUrl) || '',
          isActive: true,
          lastLoginAt: new Date(),
          lastActiveAt: new Date()
        }
      });
      
      console.log(`User successfully created/updated with ID: ${dbUser.id}`);
      
      // Update Clerk metadata with database user ID and sync status
      try {
        const clerk = await clerkClient();
        await clerk.users.updateUser(authId, {
          publicMetadata: { 
            ...clerkUser?.publicMetadata,
            role,
            dbSynced: true,
            dbUserId: dbUser.id,
            lastSyncAt: new Date().toISOString() 
          }
        });
        console.log('Clerk metadata updated successfully');
      } catch (metadataError) {
        console.error('Error updating Clerk metadata:', metadataError);
        // Don't fail the request if metadata update fails
      }
      
      return NextResponse.json({
        success: true,
        message: 'User created successfully',
        user: dbUser
      });
    } catch (dbError) {
      console.error('Database error creating/updating user:', dbError);
      return NextResponse.json({ 
        success: false, 
        message: 'Database error creating user',
        error: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in user creation:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 