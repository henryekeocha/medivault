import { getCognitoConfig } from '@/lib/aws/cognito-config';

/**
 * Cognito JWT Verifier (Frontend Version)
 * Utility for decoding JWT tokens issued by AWS Cognito
 * Note: On the frontend, we only decode tokens, not verify them cryptographically
 * The actual verification happens on the backend
 */
export class CognitoJwtVerifier {
  private region: string;
  private userPoolId: string;
  private clientId: string;

  constructor() {
    const { region, userPoolId, clientId } = getCognitoConfig();
    this.region = region;
    this.userPoolId = userPoolId;
    this.clientId = clientId;
  }

  /**
   * Decode and extract payload from a JWT token
   * @param token JWT token
   * @returns Decoded payload
   */
  decodeToken(token: string) {
    try {
      // Simple JWT decoding without verification
      // Format: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString()
      );
      
      return payload;
    } catch (error) {
      console.error('Error decoding token:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Extract user information from a decoded token payload
   * @param payload Decoded JWT payload
   * @returns User information
   */
  extractUserFromPayload(payload: any) {
    // Extract standard claims
    const userId = payload.sub;
    const email = payload.email || '';
    const name = payload.name || '';
    
    // Extract custom attributes
    const role = payload['custom:role'] || 'PATIENT';
    const dbUserId = payload['custom:userId'] || userId;
    
    return {
      id: dbUserId,
      cognitoId: userId,
      email,
      name,
      role,
      emailVerified: payload.email_verified || false,
    };
  }
}

// Export a singleton instance
export const cognitoJwtVerifier = new CognitoJwtVerifier(); 