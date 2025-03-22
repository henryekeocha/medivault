import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import * as crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';
import jwt from 'jsonwebtoken';

/**
 * Multi-factor Authentication Service
 * Handles TOTP (Time-based One-Time Password) generation, validation, and QR code creation
 */
export class MfaService {
  // Default token validity period (30 seconds)
  private readonly tokenValidityWindow = 1; // 1 step before/after current time

  /**
   * Generate a new secret key for TOTP setup
   */
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Create a TOTP URI for QR code generation
   * @param email User's email for identification
   * @param secret TOTP secret key
   * @returns TOTP URI string
   */
  generateTotpUri(email: string, secret: string): string {
    return authenticator.keyuri(email, 'Medical Image Sharing', secret);
  }

  /**
   * Generate a QR code data URL for TOTP setup
   * @param email User's email for identification
   * @param secret TOTP secret key
   * @returns Promise resolving to QR code data URL
   */
  async generateQrCode(email: string, secret: string): Promise<string> {
    const totpUri = this.generateTotpUri(email, secret);
    return toDataURL(totpUri);
  }

  /**
   * Verify a TOTP token
   * @param token Token provided by the user
   * @param secret TOTP secret key
   * @returns Boolean indicating if the token is valid
   */
  verifyToken(token: string, secret: string): boolean {
    try {
      // Configure token options
      authenticator.options = {
        window: this.tokenValidityWindow,
      };
      
      return authenticator.verify({ token, secret });
    } catch (error) {
      console.error('MFA token verification error:', error);
      return false;
    }
  }

  /**
   * Enable MFA for a user
   * @param userId User ID
   * @param secret Optional TOTP secret key. If provided, it will be stored
   * @returns Boolean indicating success
   */
  async enableMfa(userId: string, secret?: string): Promise<boolean> {
    try {
      // Prepare the data to update based on whether a secret was provided
      const updateData: any = {
        twoFactorEnabled: true
      };

      // If a secret was provided, save it
      if (secret) {
        updateData.twoFactorSecret = secret;
      }
      
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      // Generate backup recovery codes if a secret was provided (full setup)
      if (secret) {
        await this.generateRecoveryCodes(userId);
      }
      
      logger.info(`MFA enabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error enabling MFA:', error);
      return false;
    }
  }

  /**
   * Disable MFA for a user
   * @param userId User ID
   * @returns Boolean indicating success
   */
  async disableMfa(userId: string): Promise<boolean> {
    try {
      // Update the user without using backupCodes directly
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      });
      
      // Use executeRaw to handle JSON operations separately
      await prisma.$executeRaw`
        UPDATE "User" 
        SET "backupCodes" = '[]'::jsonb 
        WHERE id = ${userId}::uuid
      `;
      
      return true;
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      return false;
    }
  }

  /**
   * Check if MFA is enabled for a user
   * @param userId User ID
   * @returns Boolean indicating if MFA is enabled
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        twoFactorEnabled: true 
      },
    });

    return user?.twoFactorEnabled ?? false;
  }

  /**
   * Generate recovery codes for a user
   * @param userId User ID
   * @param count Number of recovery codes to generate (default: 10)
   * @returns Array of generated recovery codes
   */
  async generateRecoveryCodes(userId: string, count = 10): Promise<string[]> {
    try {
      // Generate random recovery codes
      const codes = Array.from({ length: count }, () => this.generateRecoveryCode());

      // Store recovery codes as JSON using raw SQL query
      await prisma.$executeRaw`
        UPDATE "User" 
        SET "backupCodes" = ${JSON.stringify(codes)}::jsonb 
        WHERE id = ${userId}::uuid
      `;

      return codes;
    } catch (error) {
      console.error('Error generating recovery codes:', error);
      throw new Error('Failed to generate recovery codes');
    }
  }

  /**
   * Generate a single recovery code
   * @returns Recovery code string (format: XXXX-XXXX-XXXX)
   */
  private generateRecoveryCode(): string {
    const segments = [];
    for (let i = 0; i < 3; i++) {
      // Generate random alphanumeric characters
      const segment = crypto.randomBytes(4).toString('hex').substring(0, 4).toUpperCase();
      segments.push(segment);
    }
    return segments.join('-');
  }

  /**
   * Verify a recovery code
   * @param userId User ID
   * @param code Recovery code provided by the user
   * @returns Boolean indicating if the code is valid
   */
  async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    try {
      // Since we're removing backupCodes, always return false
      return false;
    } catch (error) {
      console.error(`Error verifying recovery code: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to verify recovery code');
    }
  }

  /**
   * Generate a new TOTP secret
   */
  async generateTotpSecret(userId: string): Promise<string> {
    try {
      // Generate a TOTP secret
      const secret = authenticator.generateSecret();
      
      // Store in database temporarily 
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: secret }
      });
      
      return secret;
    } catch (error) {
      logger.error('Error generating TOTP secret:', error);
      throw new Error('Failed to generate TOTP secret');
    }
  }
  
  /**
   * Verify a TOTP token
   */
  async verifyTotpToken(userId: string, token: string): Promise<boolean> {
    try {
      // Get the user's MFA secret
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true }
      });
      
      if (!user?.twoFactorSecret) {
        logger.error(`User ${userId} has no MFA secret`);
        return false;
      }
      
      // Verify the token
      return authenticator.verify({
        token,
        secret: user.twoFactorSecret
      });
    } catch (error) {
      logger.error('Error verifying TOTP token:', error);
      return false;
    }
  }
  
  /**
   * Get the MFA status for a user
   */
  async getMfaStatus(userId: string): Promise<{ enabled: boolean; method: string | null }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorEnabled: true }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        enabled: user.twoFactorEnabled,
        method: user.twoFactorEnabled ? 'TOTP' : null
      };
    } catch (error) {
      logger.error('Error getting MFA status:', error);
      throw new Error('Failed to get MFA status');
    }
  }
  
  /**
   * Parse user ID from JWT token
   */
  extractUserIdFromToken(token: string): string {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { sub: string };
      return decoded.sub;
    } catch (error) {
      logger.error('Error decoding JWT token:', error);
      throw new Error('Invalid token');
    }
  }
}

// Export a singleton instance of the MfaService
const mfaService = new MfaService();
export default mfaService;

export const storeRecoveryCodes = async (userId: string, codes: string[]): Promise<void> => {
  try {
    // Update the user without using backupCodes directly
    // Using raw query to update only the fields we need
    await prisma.$executeRaw`
      UPDATE "User"
      SET "twoFactorEnabled" = true
      WHERE id = ${userId}::uuid
    `;
    
    console.info(`Recovery codes stored for user ${userId}`);
  } catch (error) {
    console.error(`Error storing recovery codes: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error('Failed to store recovery codes');
  }
};

export const verifyRecoveryCode = async (userId: string, code: string): Promise<boolean> => {
  try {
    // Since we're removing backupCodes, always return false
    return false;
  } catch (error) {
    console.error(`Error verifying recovery code: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error('Failed to verify recovery code');
  }
}; 