import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

/**
 * AWS configuration
 */
export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  },
  s3: {
    bucket: process.env.AWS_S3_BUCKET || '',
    endpoint: process.env.AWS_S3_ENDPOINT || undefined
  }
};

/**
 * S3 client instance
 */
export const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.credentials.accessKeyId,
    secretAccessKey: awsConfig.credentials.secretAccessKey
  },
  endpoint: awsConfig.s3.endpoint
});

/**
 * Validates that all required AWS configuration is present
 * @throws Error if any required configuration is missing
 */
export function validateAwsConfig() {
  if (!awsConfig.credentials.accessKeyId) {
    throw new Error('AWS_ACCESS_KEY_ID is required');
  }
  
  if (!awsConfig.credentials.secretAccessKey) {
    throw new Error('AWS_SECRET_ACCESS_KEY is required');
  }
  
  if (!awsConfig.s3.bucket) {
    throw new Error('AWS_S3_BUCKET is required');
  }
} 