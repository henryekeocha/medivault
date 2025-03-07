import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import * as crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';

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
   * @param secret TOTP secret key
   * @returns Boolean indicating success
   */
  async enableMfa(userId: string, secret: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: secret,
        },
      });

      // Create backup recovery codes
      const recoveryCodes = await this.generateRecoveryCodes(userId);
      
      return true;
    } catch (error) {
      console.error('Failed to enable MFA:', error);
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
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          // Clear the backup codes
          backupCodes: [],
        },
      });
      
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

      // Store recovery codes in the User model's backupCodes field
      await prisma.user.update({
        where: { id: userId },
        data: {
          backupCodes: codes,
        }
      });

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
      // Get the user with their backup codes
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { backupCodes: true }
      });

      if (!user || !user.backupCodes.includes(code)) {
        return false;
      }

      // Remove the used code from the backupCodes array
      const updatedBackupCodes = user.backupCodes.filter(c => c !== code);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          backupCodes: updatedBackupCodes,
        }
      });

      return true;
    } catch (error) {
      console.error('Error verifying recovery code:', error);
      return false;
    }
  }
}

// Export a singleton instance of the MFA service
export const mfaService = new MfaService(); 