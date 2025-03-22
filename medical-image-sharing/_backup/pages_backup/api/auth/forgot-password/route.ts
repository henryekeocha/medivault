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

    // For security reasons, don't reveal if a user exists or not
    // Always return success, even if user not found
    if (!user) {
      return NextResponse.json(
        { message: 'Password reset instructions sent to your email' },
        { status: 200 }
      );
    }

    // Generate reset token (random string)
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // Token valid for 1 hour

    // Save reset token in database
    await prisma.passwordReset.upsert({
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

    // Get the current hostname and protocol for the reset URL
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Create reset URL
    const resetUrl = `${baseUrl}/auth/reset-password?email=${encodeURIComponent(email)}&token=${token}`;

    // Send email with reset link
    await sendEmail({
      to: email,
      subject: 'Reset Your Password',
      text: `To reset your password, please click on the following link: ${resetUrl}`,
      html: `
        <p>Hello,</p>
        <p>Someone requested a password reset for your Medical Image Sharing account.</p>
        <p>If this was you, please click the link below to reset your password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>Alternatively, you can use this code in the reset password form: <strong>${token.substring(0, 8)}</strong></p>
        <p>This link or code will expire in 1 hour.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p>Regards,<br>Medical Image Sharing Team</p>
      `
    });

    // Create security log entry
    await prisma.securityLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        ipAddress: request.headers.get('x-forwarded-for') || request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: JSON.stringify({
          method: 'api',
          timestamp: new Date().toISOString()
        })
      }
    });

    return NextResponse.json(
      { message: 'Password reset instructions sent to your email' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'An error occurred during password reset request' },
      { status: 500 }
    );
  }
} 