import { S3Client } from '@aws-sdk/client-s3';

interface AwsConfig {
  region: string;
  s3: {
    bucket: string;
    customEndpoint?: string;
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

// AWS SDK instance (for server-side use)
export const AWS = {
  region: process.env.AWS_REGION || awsConfig.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
}; 