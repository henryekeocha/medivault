import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    // Basic validation
    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and verification token are required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        verificationToken: true
      }
    });

    // User not found or no verification token
    if (!user || !user.verificationToken) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      );
    }

    // Check if token matches and is not expired
    const isTokenValid = 
      (user.verificationToken.token === token || user.verificationToken.token.startsWith(token)) && 
      user.verificationToken.expires > new Date();

    if (!isTokenValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date()
      }
    });

    // Delete the verification token
    await prisma.verificationToken.delete({
      where: { userId: user.id }
    });

    // Create security log entry
    await prisma.securityLog.create({
      data: {
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        ipAddress: request.headers.get('x-forwarded-for') || request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: JSON.stringify({
          method: 'api',
          timestamp: new Date().toISOString()
        })
      }
    });

    return NextResponse.json(
      { message: 'Email verified successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during email verification' },
      { status: 500 }
    );
  }
} 