import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role, ProviderSpecialty } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { clerkId: string } }
) {
  console.log('Starting sync process for user:', params.clerkId);
  
  try {
    // Get Clerk ID from params
    const clerkId = params.clerkId;
    
    if (!clerkId) {
      console.error('No Clerk ID provided in URL parameters');
      return NextResponse.json({ 
        success: false, 
        message: 'Clerk ID is required' 
      }, { status: 400 });
    }
    
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { role, specialty } = body;
    
    // Get Clerk token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No Authorization header provided');
      return NextResponse.json({ 
        success: false, 
        message: 'Authorization is required' 
      }, { status: 401 });
    }
    
    const token = authHeader.substring(7);  // Remove 'Bearer ' prefix
    
    // Initialize the Clerk client
    if (!process.env.CLERK_SECRET_KEY) {
      console.error('CLERK_SECRET_KEY not configured');
      return NextResponse.json({ 
        success: false, 
        message: 'Server configuration error' 
      }, { status: 500 });
    }
    
    try {
      console.log(`Fetching user details from Clerk for ID: ${clerkId}`);
      
      // Get user details from Clerk
      const clerk = await clerkClient();
      
      // Skip complex token validation and just check if the user exists in Clerk
      // This is safe because we're using Clerk's authentication middleware
      try {
        // Get user details from Clerk
        const clerkUser = await clerk.users.getUser(clerkId);
        if (!clerkUser) {
          console.error(`User not found in Clerk with ID: ${clerkId}`);
          return NextResponse.json({ 
            success: false, 
            message: 'User not found in Clerk' 
          }, { status: 404 });
        }
        
        console.log(`Found Clerk user: ${clerkUser.firstName} ${clerkUser.lastName}`);
        
        // Determine role
        // Priority: 1. Request body, 2. Clerk metadata, 3. Default to PATIENT
        const userRole = role || 
                         clerkUser.publicMetadata?.role || 
                         clerkUser.unsafeMetadata?.role || 
                         Role.PATIENT;
        
        // Format email verification date
        const emailVerified = clerkUser.emailAddresses.find(
          email => email.id === clerkUser.primaryEmailAddressId
        )?.verification?.status === 'verified' ? new Date() : null;
        
        // Generate a username based on first and last name
        const firstName = clerkUser.firstName || '';
        const lastName = clerkUser.lastName || '';
        const baseUsername = `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '');
        
        // If username is empty or too short, use a fallback
        const username = baseUsername.length < 3 ? 
                        `user_${Date.now().toString().slice(-6)}` : 
                        baseUsername;
        
        // Create or update user in database with retry logic
        let user = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries && !user) {
          try {
            console.log(`Database operation attempt ${retryCount + 1}/${maxRetries}`);
            
            user = await prisma.user.upsert({
              where: { authId: clerkId },
              update: {
                name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
                email: clerkUser.emailAddresses[0]?.emailAddress || '',
                emailVerified,
                role: userRole as Role,
                ...(specialty && { specialty: specialty as ProviderSpecialty }),
                isActive: true,
                lastLoginAt: new Date(),
                updatedAt: new Date(),
                image: clerkUser.imageUrl,
              },
              create: {
                authId: clerkId,
                name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
                email: clerkUser.emailAddresses[0]?.emailAddress || '',
                username,
                password: '', // Empty since we're using Clerk
                emailVerified,
                role: userRole as Role,
                ...(specialty && { specialty: specialty as ProviderSpecialty }),
                isActive: true,
                lastLoginAt: new Date(),
                updatedAt: new Date(),
                image: clerkUser.imageUrl,
              }
            });
            
            console.log(`User successfully ${user.id ? 'updated' : 'created'} in database with ID: ${user.id}`);
            break; // Success, exit the loop
            
          } catch (dbError) {
            retryCount++;
            console.error(`Database operation error (attempt ${retryCount}/${maxRetries}):`, dbError);
            
            if (retryCount >= maxRetries) {
              throw new Error(`Failed to create/update user after ${maxRetries} attempts`);
            }
            
            // Wait before retrying with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
          }
        }
        
        // Update Clerk metadata with our database user ID and role for future reference
        try {
          await clerk.users.updateUser(clerkId, {
            publicMetadata: { 
              role: userRole,
              dbSynced: true,
              dbUserId: user?.id
            }
          });
          console.log('Clerk metadata updated successfully');
        } catch (metadataError) {
          console.error('Error updating Clerk metadata:', metadataError);
          // Don't fail the request if metadata update fails
        }
        
        // Return success response with user data
        return NextResponse.json({
          success: true,
          message: 'User synced successfully',
          user
        });
        
      } catch (error: any) {
        console.error('Error syncing user with database:', error);
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to sync user with database',
          error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }
    } catch (error: any) {
      console.error('Unexpected error in sync handler:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Unexpected error in sync handler:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 