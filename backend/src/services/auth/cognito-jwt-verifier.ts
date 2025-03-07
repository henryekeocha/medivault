import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getCognitoConfig } from '../aws/cognito-config.js';

/**
 * Cognito JWT Verifier
 * Utility for verifying JWT tokens issued by AWS Cognito
 */
export class CognitoJwtVerifier {
  private jwksUri: string;
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private region: string;
  private userPoolId: string;
  private clientId: string;

  constructor() {
    const { region, userPoolId, clientId } = getCognitoConfig();
    this.region = region;
    this.userPoolId = userPoolId;
    this.clientId = clientId;
    this.jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  }

  /**
   * Get the JWKS (JSON Web Key Set) for token verification
   * @returns JWKS for token verification
   */
  private getJwks() {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(this.jwksUri));
    }
    return this.jwks;
  }

  /**
   * Verify an access token
   * @param token JWT access token
   * @returns Verified JWT payload
   */
  async verifyAccessToken(token: string) {
    try {
      const jwks = this.getJwks();
      
      const { payload } = await jwtVerify(token, jwks, {
        issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`,
        audience: this.clientId,
      });
      
      return payload;
    } catch (error) {
      console.error('Error verifying Cognito access token:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Verify an ID token
   * @param token JWT ID token
   * @returns Verified JWT payload
   */
  async verifyIdToken(token: string) {
    try {
      const jwks = this.getJwks();
      
      const { payload } = await jwtVerify(token, jwks, {
        issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`,
        audience: this.clientId,
      });
      
      return payload;
    } catch (error) {
      console.error('Error verifying Cognito ID token:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Extract user information from a verified token payload
   * @param payload Verified JWT payload
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