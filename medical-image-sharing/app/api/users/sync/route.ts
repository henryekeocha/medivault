import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function POST(req: Request) {
  try {
    // Get the authenticated user from Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user data from Clerk
    const user = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`
      }
    }).then(res => res.json());

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in Clerk' },
        { status: 404 }
      );
    }

    // Get user's role from metadata or database
    let role = user.unsafeMetadata?.role || user.publicMetadata?.role;
    
    // If no role in metadata, try to get it from the database
    if (!role) {
      const dbUser = await prisma.user.findUnique({
        where: { authId: userId }
      });
      
      if (dbUser?.role) {
        role = dbUser.role;
      } else {
        // Try to get role from localStorage (this will be handled client-side)
        const pendingRole = req.headers.get('x-pending-role');
        if (pendingRole) {
          role = pendingRole;
        } else {
          return NextResponse.json(
            { error: 'User role not found' },
            { status: 400 }
          );
        }
      }
    }

    // Create or update user in our database
    const dbUser = await prisma.user.upsert({
      where: {
        authId: userId
      },
      update: {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email_addresses[0]?.email_address,
        role: role as Role,
        emailVerified: user.email_addresses[0]?.verified_at,
        image: user.image_url,
        isActive: true,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        twoFactorEnabled: user.two_factor_enabled || false,
        twoFactorSecret: user.two_factor_secret || null
      },
      create: {
        authId: userId,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email_addresses[0]?.email_address || '',
        username: `${user.first_name}${user.last_name}`.toLowerCase(),
        password: '', // Empty password since we're using Clerk
        role: role as Role,
        emailVerified: user.email_addresses[0]?.verified_at,
        image: user.image_url,
        isActive: true,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        twoFactorEnabled: user.two_factor_enabled || false,
        twoFactorSecret: user.two_factor_secret || null
      }
    });

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
            role: role
          }
        })
      });
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