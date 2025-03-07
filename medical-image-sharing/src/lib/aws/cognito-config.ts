/**
 * AWS Cognito configuration
 * This file provides configuration for AWS Cognito authentication
 */

interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
  identityPoolId: string | null;
  domain: string;
  redirectSignIn: string;
  redirectSignOut: string;
}

/**
 * Get the AWS Cognito configuration from environment variables
 * @returns Cognito configuration object
 */
export function getCognitoConfig(): CognitoConfig {
  return {
    region: process.env.NEXT_PUBLIC_AWS_REGION || '',
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
    identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID || null,
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
    redirectSignIn: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGNIN || 
      (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''),
    redirectSignOut: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGNOUT || 
      (typeof window !== 'undefined' ? window.location.origin : ''),
  };
}

/**
 * Get the Cognito hosted UI sign-in URL
 * @param state Optional state parameter for OAuth flow
 * @returns Hosted UI sign-in URL
 */
export function getCognitoSignInUrl(state?: string): string {
  const config = getCognitoConfig();
  const baseUrl = `https://${config.domain}/login`;
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: config.redirectSignIn,
  });
  
  if (state) {
    params.append('state', state);
  }
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Get the Cognito hosted UI sign-out URL
 * @returns Hosted UI sign-out URL
 */
export function getCognitoSignOutUrl(): string {
  const config = getCognitoConfig();
  const baseUrl = `https://${config.domain}/logout`;
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: config.redirectSignOut,
  });
  
  return `${baseUrl}?${params.toString()}`;
} 