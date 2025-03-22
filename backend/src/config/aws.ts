import { fromEnv } from '@aws-sdk/credential-providers';
import { Logger } from '@aws-sdk/types';

/**
 * AWS Configuration 
 * This helper ensures credentials are loaded properly from environment variables
 */
export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: fromEnv(),
  logger: console as unknown as Logger
};

// Log AWS configuration status on startup
console.log(`AWS SDK Configuration: 
  Region: ${awsConfig.region}
  Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Configured (starts with ' + process.env.AWS_ACCESS_KEY_ID.substring(0, 4) + '...)' : 'Not configured'}
  Secret Access Key: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Configured (hidden)' : 'Not configured'}
  SDK Load Config: ${process.env.AWS_SDK_LOAD_CONFIG || 'Not set'}`); 