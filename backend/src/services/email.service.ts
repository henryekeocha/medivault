import nodemailer from 'nodemailer';
import type { User, Appointment } from '@prisma/client';

type AppointmentWithUsers = Appointment & {
  patient: User;
  doctor: User;
};

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

export class EmailService {
  private generateEmailContent(type: string, content: string): string {
    const title = this.getNotificationTitle(type);
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${title}</h2>
        <p>${content}</p>
        <hr />
        <p style="color: #666; font-size: 12px;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    `;
  }

  private getNotificationTitle(type: string): string {
    switch (type) {
      case 'NEW_MESSAGE':
        return 'New Message Received';
      case 'APPOINTMENT_CREATED':
        return 'New Appointment Scheduled';
      case 'APPOINTMENT_COMPLETED':
        return 'Appointment Completed';
      case 'APPOINTMENT_CANCELLED':
        return 'Appointment Cancelled';
      case 'APPOINTMENT_NO_SHOW':
        return 'Missed Appointment';
      default:
        return 'Notification';
    }
  }

  async sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    await transporter.sendMail({
      from: `"Medical Image Sharing" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });
  }

  async sendWelcomeEmail(user: User) {
    await this.sendEmail({
      to: user.email,
      subject: 'Welcome to Medical Image Sharing',
      html: `
        <h1>Welcome to Medical Image Sharing!</h1>
        <p>Dear ${user.name},</p>
        <p>Thank you for joining Medical Image Sharing. We're excited to have you on board!</p>
        <p>You can now start sharing and managing your medical images securely.</p>
        <p>Best regards,<br>The Medical Image Sharing Team</p>
      `,
    });
  }

  async sendImageShareNotification(
    recipientEmail: string,
    senderName: string,
    shareLink: string,
    expiresIn: number
  ) {
    const expiresInHours = Math.round(expiresIn / 3600);
    await this.sendEmail({
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
  }

  async sendPasswordResetEmail(user: User, resetToken: string, resetUrl: string) {
    await this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>Dear ${user.name},</p>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <p>Best regards,<br>The Medical Image Sharing Team</p>
      `,
    });
  }

  async send2FAEnabledEmail(user: User) {
    await this.sendEmail({
      to: user.email,
      subject: 'Two-Factor Authentication Enabled',
      html: `
        <h1>Two-Factor Authentication Enabled</h1>
        <p>Dear ${user.name},</p>
        <p>Two-factor authentication has been enabled for your account.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
        <p>Best regards,<br>The Medical Image Sharing Team</p>
      `,
    });
  }

  async sendNewMessageNotification(recipientEmail: string, senderName: string) {
    await this.sendEmail({
      to: recipientEmail,
      subject: 'New Message Received',
      html: this.generateEmailContent('NEW_MESSAGE', `You have received a new message from ${senderName}`)
    });
  }

  // Appointment-related emails
  async sendAppointmentConfirmation(appointment: AppointmentWithUsers) {
    const { patient, doctor } = appointment;
    await this.sendEmail({
      to: patient.email,
      subject: 'Appointment Confirmation',
      html: `
        <h1>Appointment Confirmation</h1>
        <p>Dear ${patient.name},</p>
        <p>Your appointment has been scheduled for ${new Date(appointment.startTime).toLocaleString()}.</p>
        <p>Provider: Dr. ${doctor.name}</p>
        <p>Duration: 30 minutes</p>
        ${appointment.notes ? `<p>Notes: ${appointment.notes}</p>` : ''}
        <p>Please arrive 15 minutes before your scheduled time.</p>
        <p>Best regards,<br>The Medical Image Sharing Team</p>
      `
    });
  }

  async sendAppointmentCompletedEmail(appointment: AppointmentWithUsers) {
    const { patient, doctor } = appointment;
    await this.sendEmail({
      to: patient.email,
      subject: 'Appointment Completed',
      html: `
        <h1>Appointment Completed</h1>
        <p>Dear ${patient.name},</p>
        <p>Your appointment with Dr. ${doctor.name} on ${new Date(appointment.startTime).toLocaleString()} has been marked as completed.</p>
        <p>Thank you for using our services.</p>
        <p>Best regards,<br>The Medical Image Sharing Team</p>
      `
    });
  }

  async sendAppointmentCancelledEmail(appointment: AppointmentWithUsers) {
    const { patient, doctor } = appointment;
    await this.sendEmail({
      to: patient.email,
      subject: 'Appointment Cancelled',
      html: `
        <h1>Appointment Cancelled</h1>
        <p>Dear ${patient.name},</p>
        <p>Your appointment with Dr. ${doctor.name} scheduled for ${new Date(appointment.startTime).toLocaleString()} has been cancelled.</p>
        <p>If you did not request this cancellation, please contact us immediately.</p>
        <p>Best regards,<br>The Medical Image Sharing Team</p>
      `
    });
  }

  async sendAppointmentNoShowEmail(appointment: AppointmentWithUsers) {
    const { patient, doctor } = appointment;
    await this.sendEmail({
      to: patient.email,
      subject: 'Missed Appointment',
      html: `
        <h1>Missed Appointment</h1>
        <p>Dear ${patient.name},</p>
        <p>You missed your scheduled appointment with Dr. ${doctor.name} on ${new Date(appointment.startTime).toLocaleString()}.</p>
        <p>Please contact us to reschedule your appointment.</p>
        <p>Best regards,<br>The Medical Image Sharing Team</p>
      `
    });
  }
} 