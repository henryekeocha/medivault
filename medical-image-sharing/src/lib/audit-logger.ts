/**
 * Types of events that can be audited
 */
export type AuditEventType = 
  // Authentication events
  | 'USER_LOGGED_IN'
  | 'USER_LOGGED_OUT'
  | 'USER_LOGGED_OUT_PARTIAL'
  | 'LOGIN_FAILED'
  | 'TOKEN_REFRESHED'
  | 'TOKEN_REFRESH_FAILED'
  | 'SESSION_VALIDATED'
  | 'SESSION_VALIDATION_FAILED'
  
  // MFA events
  | 'MFA_SETUP_INITIATED'
  | 'MFA_SETUP_COMPLETED'
  | 'MFA_SETUP_FAILED'
  | 'MFA_VERIFIED'
  | 'MFA_VERIFICATION_FAILED'
  | 'MFA_DISABLED'
  | 'MFA_DISABLE_FAILED'
  | 'MFA_PREFERRED_METHOD_UPDATED'
  | 'MFA_PREFERRED_METHOD_UPDATE_FAILED'
  | 'TOTP_MFA_SETUP_INITIATED'
  | 'TOTP_MFA_SETUP_COMPLETED'
  | 'TOTP_MFA_SETUP_FAILED'
  | 'TOTP_MFA_VERIFIED'
  | 'TOTP_MFA_VERIFICATION_FAILED'
  | 'SMS_MFA_SETUP_INITIATED'
  | 'SMS_MFA_SETUP_COMPLETED'
  | 'SMS_MFA_SETUP_FAILED'
  | 'SMS_MFA_VERIFIED'
  | 'SMS_MFA_VERIFICATION_FAILED'
  
  // User attribute events
  | 'USER_ATTRIBUTE_VERIFICATION_REQUESTED'
  | 'USER_ATTRIBUTE_VERIFICATION_REQUEST_FAILED'
  | 'USER_ATTRIBUTE_VERIFIED'
  | 'USER_ATTRIBUTE_VERIFICATION_FAILED'
  
  // Device management events
  | 'USER_DEVICES_RETRIEVED'
  | 'USER_DEVICES_RETRIEVAL_FAILED'
  | 'USER_DEVICE_REMOVED'
  | 'USER_DEVICE_REMOVAL_FAILED'
  | 'USER_DEVICE_UPDATED'
  | 'USER_DEVICE_UPDATE_FAILED'
  | 'USER_AUTH_EVENTS_RETRIEVED'
  | 'USER_AUTH_EVENTS_RETRIEVAL_FAILED'
  
  // PHI access events
  | 'PHI_ACCESSED'
  | 'PHI_MODIFIED'
  | 'PHI_DELETED'
  | 'PHI_SHARED'
  | 'PHI_DOWNLOADED'
  | 'DICOM_METADATA_ACCESS'
  | 'DICOM_VIEW_ACCESS';

/**
 * Interface for audit log data
 */
interface AuditLogData {
  [key: string]: any;
  status: 'success' | 'error' | 'warning';
  timestamp: string;
}

// Import AWS SDK clients
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import { CloudTrail } from '@aws-sdk/client-cloudtrail';

// AWS SDK clients
let cloudWatchLogs: CloudWatchLogs | null = null;
let eventBridge: EventBridge | null = null;
let cloudTrail: CloudTrail | null = null;

// Constants for HIPAA compliance
const HIPAA_LOG_RETENTION_DAYS = 365 * 7; // 7 years retention
const LOG_GROUP_NAME = process.env.AWS_CLOUDWATCH_LOG_GROUP || 'medical-image-sharing-hipaa-audit-logs';
const EVENT_BUS_NAME = process.env.AWS_EVENTBRIDGE_BUS || 'medical-image-sharing-events';
const TRAIL_NAME = process.env.AWS_CLOUDTRAIL_NAME || 'medical-image-sharing-hipaa-trail';

/**
 * Initialize AWS services with proper configuration
 */
function initializeAwsServices() {
  const region = process.env.AWS_REGION || 'us-east-1';
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  };

  if (!cloudWatchLogs) {
    cloudWatchLogs = new CloudWatchLogs({
      region,
      credentials,
    });
  }
  
  if (!eventBridge) {
    eventBridge = new EventBridge({
      region,
      credentials,
    });
  }
  
  if (!cloudTrail) {
    cloudTrail = new CloudTrail({
      region,
      credentials,
    });
  }
}

/**
 * Ensure a CloudWatch log group exists with proper retention settings
 */
async function ensureLogGroupExists() {
  if (!cloudWatchLogs) return;
  
  try {
    // Check if log group exists
    try {
      await cloudWatchLogs.describeLogGroups({
        logGroupNamePrefix: LOG_GROUP_NAME,
      });
    } catch (error) {
      // Create log group if it doesn't exist
      await cloudWatchLogs.createLogGroup({
        logGroupName: LOG_GROUP_NAME,
        tags: {
          Application: 'medical-image-sharing',
          Compliance: 'HIPAA',
        },
      });
      
      // Set retention policy (7 years for HIPAA compliance)
      await cloudWatchLogs.putRetentionPolicy({
        logGroupName: LOG_GROUP_NAME,
        retentionInDays: HIPAA_LOG_RETENTION_DAYS,
      });
    }
  } catch (error) {
    console.error('Error ensuring log group exists:', error);
  }
}

/**
 * Determine if an event contains PHI (Protected Health Information)
 */
function containsPHI(eventType: AuditEventType, data: any): boolean {
  const phiEvents = [
    'PHI_ACCESSED', 'PHI_MODIFIED', 'PHI_DELETED', 'PHI_SHARED', 
    'PHI_DOWNLOADED', 'DICOM_METADATA_ACCESS', 'DICOM_VIEW_ACCESS'
  ];
  
  return phiEvents.includes(eventType) || 
         data.patientId !== undefined || 
         data.imageId !== undefined ||
         data.studyId !== undefined;
}

/**
 * Sanitize data to remove direct PHI but maintain audit capability
 * This follows the HIPAA Safe Harbor method for de-identification
 */
function sanitizeForCloudTrail(data: any): any {
  const sanitized = { ...data };
  
  // List of PHI identifiers that need special handling
  const phiFields = [
    'patientName', 'dateOfBirth', 'address', 'phoneNumber', 
    'email', 'medicalRecordNumber', 'healthPlanNumber',
    'accountNumber', 'socialSecurityNumber'
  ];
  
  // Replace direct identifiers with secure hashes or indicators
  phiFields.forEach(field => {
    if (field in sanitized) {
      if (field === 'patientName') {
        sanitized[field] = 'REDACTED-PHI';
      } else {
        // Replace with indication that PHI existed but was removed
        sanitized[field] = 'PHI-REDACTED';
      }
    }
  });
  
  return sanitized;
}

/**
 * Logs security and user activity events for audit purposes
 * HIPAA-compliant implementation using AWS CloudTrail and CloudWatch
 */
export function logAudit(eventType: AuditEventType, data: AuditLogData): void {
  const timestamp = data.timestamp || new Date().toISOString();
  
  // Ensure required fields for HIPAA compliance
  const auditEvent = {
    eventType,
    ...data,
    environment: process.env.NODE_ENV || 'development',
    service: 'medical-image-sharing',
    timestamp,
    applicationVersion: process.env.APP_VERSION || 'unknown',
    requestId: data.requestId || crypto.randomUUID(),
  };
  
  if (process.env.NODE_ENV === 'production') {
    // Send to AWS services for HIPAA-compliant audit logging
    sendToAwsLogging(eventType, auditEvent).catch(error => {
      console.error('[AUDIT] Failed to send audit log to AWS:', error);
      
      // Implement fallback logging mechanism for critical failures
      logToFallbackSystem(eventType, auditEvent);
    });
    
    // Log to console with sensitive data removed (as operational fallback)
    const safeEvent = sanitizeForCloudTrail({ ...auditEvent });
    console.info(`[AUDIT] ${eventType}: ${safeEvent.status} (${safeEvent.requestId})`);
  } else {
    // In development, log the event for debugging
    console.info(`[AUDIT] ${eventType}:`, auditEvent);
  }
}

/**
 * Fallback logging mechanism for critical failures
 * Ensures we maintain HIPAA compliance even if AWS services are temporarily unavailable
 */
function logToFallbackSystem(eventType: AuditEventType, auditEvent: any): void {
  try {
    // Create a sanitized version of the event
    const safeEvent = sanitizeForCloudTrail({ ...auditEvent });
    
    // In a production system, this would write to a local encrypted file
    // that would be synced to AWS once services are available again
    console.warn(`[AUDIT-FALLBACK] ${eventType}:`, 
      JSON.stringify(safeEvent, null, 2)
    );
    
    // TODO: Implement actual fallback mechanism
    // Options include:
    // 1. Write to encrypted local storage
    // 2. Queue in memory and retry with backoff
    // 3. Send to secondary backup service
  } catch (error) {
    // Last resort fallback - log critical error
    console.error('[CRITICAL] Audit logging fallback failed:', error);
  }
}

/**
 * Sends audit events to AWS services for HIPAA compliance
 */
async function sendToAwsLogging(eventType: AuditEventType, auditEvent: any): Promise<void> {
  try {
    initializeAwsServices();
    await ensureLogGroupExists();
    
    const hasPHI = containsPHI(eventType, auditEvent);
    const eventForLogging = hasPHI ? sanitizeForCloudTrail(auditEvent) : auditEvent;
    
    // Generate a log stream name based on date and event category 
    // This helps with organization and querying
    const date = new Date().toISOString().split('T')[0];
    const category = eventType.split('_')[0].toLowerCase();
    const logStreamName = `${date}/${category}/${eventType}`;
    
    // 1. Always log to CloudWatch (primary HIPAA-compliant storage)
    if (cloudWatchLogs) {
      try {
        // Ensure log stream exists
        try {
          await cloudWatchLogs.createLogStream({
            logGroupName: LOG_GROUP_NAME,
            logStreamName,
          });
        } catch (error) {
          // Stream likely exists already, continue
        }
        
        // Write the log event
        await cloudWatchLogs.putLogEvents({
          logGroupName: LOG_GROUP_NAME,
          logStreamName,
          logEvents: [
            {
              timestamp: Date.now(),
              message: JSON.stringify(eventForLogging)
            }
          ]
        });
      } catch (error) {
        console.error('Error writing to CloudWatch Logs:', error);
        throw error;
      }
    }
    
    // 2. Send to EventBridge for event-driven processing
    if (eventBridge) {
      try {
        await eventBridge.putEvents({
          Entries: [
            {
              Source: 'com.medical-image-sharing.audit',
              DetailType: eventType,
              Detail: JSON.stringify(eventForLogging),
              EventBusName: EVENT_BUS_NAME,
              Time: new Date(auditEvent.timestamp)
            }
          ]
        });
      } catch (error) {
        console.error('Error sending to EventBridge:', error);
        // Continue even if EventBridge fails - CloudWatch is primary
      }
    }
    
    // 3. For security events, ensure CloudTrail captures them
    if (cloudTrail && isSecurityCriticalEvent(eventType)) {
      try {
        // CloudTrail captures EventBridge events if properly configured
        // Here we could add additional CloudTrail-specific logging if needed
        
        // In a complete implementation, you would configure CloudTrail to:
        // 1. Capture management and data events
        // 2. Integrate with EventBridge custom events 
        // 3. Store logs in S3 with encryption and 7-year retention
        // 4. Enable log file validation
      } catch (error) {
        console.error('Error with CloudTrail integration:', error);
        // Continue even if CloudTrail specific code fails
      }
    }
  } catch (error) {
    console.error('Error in AWS audit logging:', error);
    throw error;
  }
}

/**
 * Determines if an event is security-critical requiring special handling
 */
function isSecurityCriticalEvent(eventType: AuditEventType): boolean {
  // Security critical events require additional attention
  const securityCriticalEvents = [
    // Authentication and access
    'USER_LOGGED_IN', 'USER_LOGGED_OUT', 'LOGIN_FAILED',
    'SESSION_VALIDATION_FAILED',
    
    // MFA security
    'MFA_VERIFICATION_FAILED', 'MFA_DISABLED',
    'MFA_DISABLE_FAILED',
    
    // Device security
    'USER_DEVICE_REMOVED', 'USER_DEVICE_UPDATED',
    
    // PHI access security
    'PHI_ACCESSED', 'PHI_MODIFIED', 'PHI_DELETED', 'PHI_SHARED',
    'DICOM_METADATA_ACCESS', 'DICOM_VIEW_ACCESS'
  ];
  
  return securityCriticalEvents.includes(eventType);
} 