import nodemailer from 'nodemailer';
import prisma from './prisma';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

/**
 * Sends an email using configured email provider
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    // Get default email provider from database
    const emailProvider = await prisma.emailProvider.findFirst({
      where: {
        isActive: true,
        isDefault: true
      }
    });
    
    if (!emailProvider) {
      throw new Error('No default email provider configured');
    }
    
    // Configure transport based on provider type
    let transporter;
    
    if (emailProvider.provider === 'smtp') {
      transporter = nodemailer.createTransport({
        host: emailProvider.host || process.env.EMAIL_HOST,
        port: emailProvider.port || Number(process.env.EMAIL_PORT) || 587,
        secure: (emailProvider.port || Number(process.env.EMAIL_PORT)) === 465,
        auth: {
          user: emailProvider.username || process.env.EMAIL_USERNAME,
          pass: emailProvider.password || process.env.EMAIL_PASSWORD
        }
      });
    } else if (emailProvider.provider === 'sendgrid') {
      // Implement SendGrid if needed
      throw new Error('SendGrid provider not implemented');
    } else if (emailProvider.provider === 'mailgun') {
      // Implement Mailgun if needed
      throw new Error('Mailgun provider not implemented');
    } else {
      // Fallback to environment variables for email configuration
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }
    
    // Send email
    await transporter.sendMail({
      from: emailProvider.from || process.env.EMAIL_FROM || '"Medical Image Sharing" <no-reply@example.com>',
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html
    });
    
    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
} 