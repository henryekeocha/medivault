import { S3Client } from '@aws-sdk/client-s3';
import { Amplify } from 'aws-amplify';

interface AwsConfig {
  region: string;
  s3: {
    bucket: string;
    customEndpoint?: string;
  };
  cognito: {
    userPoolId: string;
    userPoolWebClientId: string;
    identityPoolId: string;
  };
}

/**
 * AWS configuration object used across the application
 */
export const awsConfig: AwsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  s3: {
    bucket: process.env.AWS_S3_BUCKET || 'medical-images-dev',
    customEndpoint: process.env.AWS_S3_CUSTOM_ENDPOINT,
  },
  cognito: {
    userPoolId: process.env.AWS_COGNITO_USER_POOL_ID || '',
    userPoolWebClientId: process.env.AWS_COGNITO_CLIENT_ID || '',
    identityPoolId: process.env.AWS_COGNITO_IDENTITY_POOL_ID || '',
  },
};

/**
 * Creates and exports a configured S3 client
 */
export const s3Client = new S3Client({
  region: awsConfig.region,
  endpoint: awsConfig.s3.customEndpoint,
  // The credentials will be picked up from environment variables in production
  // or in development from AWS CLI configuration
});

/**
 * Configures AWS Amplify for use on the client side
 * Note: This is using the AWS Amplify v5+ configuration format
 */
export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: awsConfig.cognito.userPoolId,
        userPoolClientId: awsConfig.cognito.userPoolWebClientId,
        identityPoolId: awsConfig.cognito.identityPoolId,
        loginWith: {
          oauth: {
            domain: 'your-cognito-domain.auth.region.amazoncognito.com',
            scopes: ['email', 'openid', 'profile'],
            redirectSignIn: ['https://your-app-domain.com/callback'],
            redirectSignOut: ['https://your-app.com/logout'],
            responseType: 'code',
          },
        },
      },
    },
    // @ts-ignore - Amplify typing issue with Storage config
    Storage: {
      S3: {
        bucket: awsConfig.s3.bucket,
        region: awsConfig.region,
      }
    }
  });
}

// AWS SDK instance (for server-side use)
export const AWS = {
  region: process.env.AWS_REGION || awsConfig.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
}; 