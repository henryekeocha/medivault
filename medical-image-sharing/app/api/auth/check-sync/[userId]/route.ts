import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const authResult = await auth();
    const authenticatedUserId = authResult?.userId;
    
    if (!authenticatedUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Only allow users to check their own sync status
    const targetUserId = params.userId;
    if (targetUserId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Forbidden - can only check your own sync status' },
        { status: 403 }
      );
    }
    
    console.log(`Checking if user ${targetUserId} exists in database`);
    
    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { authId: targetUserId },
      select: { id: true }
    });
    
    if (!user) {
      console.log(`User ${targetUserId} not found in database`);
      
      // Mark this in localStorage to help with detection on client side
      return NextResponse.json({
        exists: false,
        message: 'User not found in database'
      });
    }
    
    console.log(`User ${targetUserId} found in database with ID ${user.id}`);
    
    // User exists, now check if the Clerk metadata matches
    try {
      // Update user's Clerk metadata to reflect sync status
      const clerk = await clerkClient();
      await clerk.users.updateUser(targetUserId, {
        publicMetadata: { 
          dbSynced: true,
          dbUserId: user.id,
          lastSyncCheck: new Date().toISOString()
        }
      });
    } catch (clerkError) {
      console.error('Error updating Clerk metadata:', clerkError);
      // Continue anyway since the user exists in the database
    }
    
    return NextResponse.json({
      exists: true,
      userId: user.id
    });
  } catch (error) {
    console.error('Error checking user sync status:', error);
    return NextResponse.json({
      error: 'Failed to check user sync status',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 