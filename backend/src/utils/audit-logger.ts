/**
 * Backend Audit Logger for HIPAA Compliance
 * 
 * This implementation mirrors the frontend audit-logger but is specifically 
 * designed for the backend Express application. In production, both loggers
 * send data to the same AWS services to maintain a unified audit trail.
 */

import { logger } from './logger.js';
import { 
  CloudWatchLogsClient, 
  PutLogEventsCommand,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand 
} from '@aws-sdk/client-cloudwatch-logs';

// Define the basic event types that might be used in backend
export type AuditEventType = 
  // Authentication events
  | 'USER_LOGGED_IN'
  | 'USER_LOGGED_OUT'
  | 'LOGIN_FAILED'
  | 'TOKEN_REFRESHED'
  | 'SESSION_VALIDATED'
  | 'SESSION_VALIDATION_FAILED'
  
  // MFA events
  | 'MFA_SETUP_INITIATED'
  | 'MFA_SETUP_COMPLETED'
  | 'MFA_VERIFIED'
  | 'MFA_DISABLED'
  
  // Device management events
  | 'USER_DEVICES_RETRIEVED'
  | 'USER_DEVICES_RETRIEVAL_FAILED'
  | 'USER_DEVICE_REMOVED'
  | 'USER_DEVICE_REMOVAL_FAILED'
  | 'USER_DEVICE_UPDATED'
  | 'USER_DEVICE_UPDATE_FAILED'
  | 'USER_AUTH_EVENTS_RETRIEVED'
  | 'USER_AUTH_EVENTS_RETRIEVAL_FAILED';

interface AuditLogData {
  [key: string]: any;
  status: 'success' | 'error' | 'warning';
  timestamp: string;
}

// Initialize AWS CloudWatch Logs client for audit logs
const cloudWatchLogsClient = new CloudWatchLogsClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

// Log group for HIPAA audit logs (should match the frontend configuration)
const AUDIT_LOG_GROUP_NAME = process.env.AWS_CLOUDWATCH_LOG_GROUP || 'medical-image-sharing-hipaa-audit-logs';
const AUDIT_LOG_STREAM_NAME = `backend-${process.env.NODE_ENV || 'development'}-${new Date().toISOString().split('T')[0]}`;

// Track sequence token for audit log stream
let auditSequenceToken: string | undefined;

// Initialize audit log group and stream
async function initializeAuditLogging() {
  try {
    // Create log group if it doesn't exist (idempotent operation)
    try {
      await cloudWatchLogsClient.send(new CreateLogGroupCommand({
        logGroupName: AUDIT_LOG_GROUP_NAME
      }));
      logger.info(`Created audit log group: ${AUDIT_LOG_GROUP_NAME}`);
    } catch (error) {
      // Ignore if already exists
      if (!(error instanceof Error) || !error.message.includes('already exists')) {
        logger.warn(`Error creating audit log group: ${error}`);
      }
    }

    // Create log stream if it doesn't exist
    try {
      await cloudWatchLogsClient.send(new CreateLogStreamCommand({
        logGroupName: AUDIT_LOG_GROUP_NAME,
        logStreamName: AUDIT_LOG_STREAM_NAME
      }));
      logger.info(`Created audit log stream: ${AUDIT_LOG_STREAM_NAME}`);
    } catch (error) {
      // Ignore if already exists
      if (!(error instanceof Error) || !error.message.includes('already exists')) {
        logger.warn(`Error creating audit log stream: ${error}`);
      }
    }

    // Get the sequence token for the log stream
    const logStreams = await cloudWatchLogsClient.send(new DescribeLogStreamsCommand({
      logGroupName: AUDIT_LOG_GROUP_NAME,
      logStreamNamePrefix: AUDIT_LOG_STREAM_NAME
    }));
    
    if (logStreams.logStreams && logStreams.logStreams.length > 0) {
      auditSequenceToken = logStreams.logStreams[0].uploadSequenceToken;
    }
  } catch (error) {
    logger.error('Failed to initialize audit logging:', error);
  }
}

// Initialize in production
if (process.env.NODE_ENV === 'production') {
  initializeAuditLogging().catch(err => 
    logger.error('Failed to initialize audit logging:', err)
  );
}

/**
 * Log audit events for security and compliance
 * Sends logs to CloudWatch in production
 */
export function logAudit(eventType: AuditEventType, data: AuditLogData): void {
  // Construct the audit event
  const auditEvent = {
    type: eventType,
    source: 'backend-api',
    ...data,
    // Ensure timestamp exists
    timestamp: data.timestamp || new Date().toISOString(),
    // Add service information
    service: {
      name: 'medical-image-sharing-backend',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };

  // Always log to the system logger for local development
  logger.info(`AUDIT: ${eventType}`, { meta: { auditEvent } });
  
  // In production, send to CloudWatch
  if (process.env.NODE_ENV === 'production') {
    sendToCloudWatch(auditEvent)
      .catch(error => logger.error('Failed to send audit log to CloudWatch:', error));
  }
}

/**
 * Sends audit log messages to AWS CloudWatch
 */
async function sendToCloudWatch(auditEvent: any) {
  try {
    const logEvent = {
      timestamp: Date.now(),
      message: JSON.stringify(auditEvent)
    };
    
    const putLogEventsCommand = new PutLogEventsCommand({
      logGroupName: AUDIT_LOG_GROUP_NAME,
      logStreamName: AUDIT_LOG_STREAM_NAME,
      logEvents: [logEvent],
      sequenceToken: auditSequenceToken
    });
    
    const response = await cloudWatchLogsClient.send(putLogEventsCommand);
    auditSequenceToken = response.nextSequenceToken;
    
    return response;
  } catch (error) {
    // If the sequence token is invalid, try to get a new one and retry
    if (error instanceof Error && 
        (error.message.includes('The specified sequence token is invalid') || 
         error.message.includes('The sequence token is not valid'))) {
      
      try {
        const logStreams = await cloudWatchLogsClient.send(new DescribeLogStreamsCommand({
          logGroupName: AUDIT_LOG_GROUP_NAME,
          logStreamNamePrefix: AUDIT_LOG_STREAM_NAME
        }));
        
        if (logStreams.logStreams && logStreams.logStreams.length > 0) {
          auditSequenceToken = logStreams.logStreams[0].uploadSequenceToken;
          
          // Retry with the new sequence token
          return sendToCloudWatch(auditEvent);
        }
      } catch (retryError) {
        logger.error('Failed to get sequence token for retry:', retryError);
        throw retryError;
      }
    }
    
    throw error;
  }
} 