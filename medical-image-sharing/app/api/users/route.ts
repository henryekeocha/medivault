import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, role, authId, name, specialty } = body;

    if (!authId) {
      return NextResponse.json(
        { error: 'authId is required' },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== Role.PATIENT && role !== Role.PROVIDER) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        authId,
        role: role as Role,
        name,
        isActive: true,
        emailVerified: new Date(), // Since Clerk handles email verification
        password: '', // Empty string since we're using Clerk
        specialty: role === Role.PROVIDER ? specialty : null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        authId: true,
        specialty: true,
      }
    });

    // Update Clerk metadata with the role
    const clerk = await clerkClient();
    await clerk.users.updateUser(authId, {
      publicMetadata: { role: user.role }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 