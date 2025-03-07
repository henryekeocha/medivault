import { Amplify } from 'aws-amplify';

/**
 * Configure AWS Amplify for authentication with Amazon Cognito
 * 
 * This configuration connects our application to Amazon Cognito for user authentication,
 * allowing us to leverage Cognito's features for secure, HIPAA-compliant authentication.
 */
export function configureAmplify() {
  // Configure Amplify with our configuration
  Amplify.configure({
    // Auth configuration 
    Auth: {
      // Cognito provider configuration
      Cognito: {
        // Cognito User Pool ID
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
        
        // Cognito App Client ID
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
        
        // Login configuration
        loginWith: {
          // OAuth configuration if domain is provided
          oauth: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ? {
            domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
            scopes: ['email', 'profile', 'openid'],
            redirectSignIn: process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN?.split(',') || [],
            redirectSignOut: process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT?.split(',') || [],
            responseType: 'code'
          } : undefined,
          
          // Enable username/email login
          username: true,
          email: true
        }
      }
    },
    
    // Storage configuration for S3
    Storage: {
      S3: {
        bucket: process.env.NEXT_PUBLIC_S3_BUCKET || '',
        region: process.env.NEXT_PUBLIC_AWS_REGION || ''
      }
    }
  });
  
  console.log('AWS Amplify v6 configured successfully');
}

// Export a function to get the current configuration
export function getAmplifyConfig() {
  return Amplify.getConfig();
} 