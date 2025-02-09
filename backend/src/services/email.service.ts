import nodemailer from 'nodemailer';
import { User } from '../entities/User.js';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send welcome email
export const sendWelcomeEmail = async (user: User) => {
  await transporter.sendMail({
    from: `"Medical Image Sharing" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Welcome to Medical Image Sharing',
    html: `
      <h1>Welcome to Medical Image Sharing!</h1>
      <p>Dear ${user.username},</p>
      <p>Thank you for joining Medical Image Sharing. We're excited to have you on board!</p>
      <p>You can now start sharing and managing your medical images securely.</p>
      <p>Best regards,<br>The Medical Image Sharing Team</p>
    `,
  });
};

// Send image share notification
export const sendImageShareNotification = async (
  recipientEmail: string,
  senderName: string,
  shareLink: string,
  expiresIn: number
) => {
  const expiresInHours = Math.round(expiresIn / 3600);

  await transporter.sendMail({
    from: `"Medical Image Sharing" <${process.env.EMAIL_FROM}>`,
    to: recipientEmail,
    subject: 'Medical Image Shared with You',
    html: `
      <h1>New Medical Image Shared</h1>
      <p>${senderName} has shared a medical image with you.</p>
      <p>You can view the image using this link: <a href="${shareLink}">${shareLink}</a></p>
      <p>This link will expire in ${expiresInHours} hours.</p>
      <p>Best regards,<br>The Medical Image Sharing Team</p>
    `,
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (
  user: User,
  resetToken: string,
  resetUrl: string
) => {
  await transporter.sendMail({
    from: `"Medical Image Sharing" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset Request</h1>
      <p>Dear ${user.username},</p>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
      <p>Best regards,<br>The Medical Image Sharing Team</p>
    `,
  });
};

// Send 2FA enabled notification
export const send2FAEnabledEmail = async (user: User) => {
  await transporter.sendMail({
    from: `"Medical Image Sharing" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Two-Factor Authentication Enabled',
    html: `
      <h1>Two-Factor Authentication Enabled</h1>
      <p>Dear ${user.username},</p>
      <p>Two-factor authentication has been enabled for your account.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
      <p>Best regards,<br>The Medical Image Sharing Team</p>
    `,
  });
};

// Send new message notification
export const sendNewMessageNotification = async (
  recipientEmail: string,
  senderName: string
) => {
  await transporter.sendMail({
    from: `"Medical Image Sharing" <${process.env.EMAIL_FROM}>`,
    to: recipientEmail,
    subject: 'New Message Received',
    html: `
      <h1>New Message</h1>
      <p>You have received a new message from ${senderName}.</p>
      <p>Log in to your account to view and respond to the message.</p>
      <p>Best regards,<br>The Medical Image Sharing Team</p>
    `,
  });
}; 