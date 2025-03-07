/**
 * AWS Cognito configuration
 */
export const cognitoConfig = {
  // AWS Region
  region: process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
  
  // Cognito User Pool ID
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  
  // Cognito App Client ID
  clientId: process.env.COGNITO_CLIENT_ID || '',
  
  // Cognito Identity Pool ID (for unauthenticated access)
  identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID || '',
  
  // OAuth settings
  oauth: {
    domain: process.env.COGNITO_DOMAIN || '',
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    redirectSignOut: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    responseType: 'code',
  },
  
  // Advanced settings
  authenticationFlowType: 'USER_SRP_AUTH',
  
  // Security features
  mfaConfiguration: 'OPTIONAL',
  mfaTypes: ['TOTP'],
  passwordProtectionSettings: {
    passwordPolicyMinLength: 8,
    passwordPolicyCharacters: ['REQUIRES_LOWERCASE', 'REQUIRES_UPPERCASE', 'REQUIRES_NUMBERS', 'REQUIRES_SYMBOLS'],
  },
  
  // User attributes
  requiredAttributes: ['email'],
  
  // Session settings
  sessionDuration: 3600000, // 1 hour in milliseconds
};

/**
 * Get Cognito configuration
 * @returns Cognito configuration
 */
export function getCognitoConfig() {
  return cognitoConfig;
}

/**
 * Validate Cognito configuration
 * @returns True if configuration is valid
 */
export function validateCognitoConfig() {
  const { userPoolId, clientId } = cognitoConfig;
  
  if (!userPoolId || !clientId) {
    console.warn('Cognito User Pool ID or Client ID not set in environment variables');
    return false;
  }
  
  return true;
} 