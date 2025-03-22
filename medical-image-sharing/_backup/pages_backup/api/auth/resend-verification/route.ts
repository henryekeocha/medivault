import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Basic validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // User not found
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Generate verification token
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 3600000); // Token valid for 24 hours

    // Save verification token in database (upsert in case one already exists)
    await prisma.verificationToken.upsert({
      where: { userId: user.id },
      update: {
        token,
        expires
      },
      create: {
        userId: user.id,
        token,
        expires
      }
    });

    // Get the current hostname and protocol for the verify URL
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Create verification URL
    const verifyUrl = `${baseUrl}/auth/verify-email?email=${encodeURIComponent(email)}&code=${token.substring(0, 8)}`;

    // Send verification email
    await sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      text: `Please verify your email address by clicking on the following link: ${verifyUrl}`,
      html: `
        <p>Hello ${user.name},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyUrl}">Verify Email Address</a></p>
        <p>Alternatively, you can use this code in the verification form: <strong>${token.substring(0, 8)}</strong></p>
        <p>This link or code will expire in 24 hours.</p>
        <p>Regards,<br>Medical Image Sharing Team</p>
      `
    });

    // Create security log entry
    await prisma.securityLog.create({
      data: {
        userId: user.id,
        action: 'VERIFICATION_EMAIL_RESENT',
        ipAddress: request.headers.get('x-forwarded-for') || request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: JSON.stringify({
          method: 'api',
          timestamp: new Date().toISOString()
        })
      }
    });

    return NextResponse.json(
      { message: 'Verification email sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred while sending verification email' },
      { status: 500 }
    );
  }
} 