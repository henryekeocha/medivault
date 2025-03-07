# HIPAA-Compliant Audit Logging with AWS CloudTrail

This document outlines the implementation of a HIPAA-compliant audit logging system for the Medical Image Sharing application using AWS CloudTrail and related AWS services.

## Overview

Our audit logging system is designed to track all security and user activity events in compliance with HIPAA regulations, which require:

- Comprehensive audit controls to record and examine activity
- 7-year retention of audit logs
- Protection of Protected Health Information (PHI)
- Secure, immutable storage of audit data
- Clear accountability for all access to PHI

## Architecture

Our implementation uses a multi-layered approach leveraging several AWS services:

1. **AWS CloudWatch Logs**
   - Primary storage for all audit events
   - Configured with 7-year retention policy (HIPAA requirement)
   - Encrypted at rest and in transit
   - Organized log streams by event type, date, and category

2. **AWS EventBridge**
   - Event routing and processing
   - Integration point for CloudTrail
   - Enables real-time alerting for security events

3. **AWS CloudTrail**
   - Captures security-critical events
   - Provides immutable history of security events
   - Configured to store logs in S3 with encryption
   - Integrates with CloudWatch Logs and EventBridge

## Event Types

Our audit logging system tracks various event types, including:

### Authentication Events
- User login/logout
- Failed login attempts
- Token refresh
- Session validation

### MFA Events
- MFA setup and verification
- Changes to MFA settings
- Failed MFA verifications

### PHI Access Events
- Accessing patient data
- Viewing DICOM images
- Metadata access
- Downloading or sharing PHI

### Device Management
- Device tracking
- Authentication from new devices
- Device removal or modification

## HIPAA Compliance Features

### 1. PHI Protection
- All PHI is de-identified in CloudTrail logs using Safe Harbor method
- Only authorized personnel can access complete logs
- PHI fields are redacted and replaced with indicators

### 2. 7-Year Retention
- CloudWatch Logs configured with 7-year retention policy
- S3 bucket lifecycle policies maintain HIPAA-required retention

### 3. Immutability
- CloudTrail logs are immutable
- Log file validation is enabled
- Integrity checking prevents tampering

### 4. Accessibility
- Logs are searchable and queryable
- Structured logging format enables detailed reports
- Critical security events trigger alerts

### 5. Fallback Mechanisms
- Local encrypted backup for service interruptions
- Retry mechanisms with backoff
- Guaranteed logging even during AWS service disruptions

## AWS Account Configuration

To set up the AWS account for HIPAA-compliant logging:

1. **IAM Roles and Permissions**
   - Create dedicated IAM roles for logging with least privilege
   - Restrict access to logs to authorized personnel only
   - Enable MFA for all users accessing audit logs

2. **CloudTrail Setup**
   - Create a trail that logs all management and data events
   - Configure S3 bucket with server-side encryption
   - Enable log file validation
   - Set up SNS topic for critical security events

3. **CloudWatch Logs**
   - Create log group with 7-year retention
   - Configure encryption
   - Set up metric filters for security events

4. **EventBridge**
   - Create custom event bus for application events
   - Set up rules to route events to CloudTrail
   - Configure targets for critical security alerts

## Required Environment Variables

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_CLOUDWATCH_LOG_GROUP=medical-image-sharing-hipaa-audit-logs
AWS_EVENTBRIDGE_BUS=medical-image-sharing-events
AWS_CLOUDTRAIL_NAME=medical-image-sharing-hipaa-trail
AWS_S3_BUCKET_AUDIT_LOGS=medical-image-sharing-audit-logs
```

## Monitoring and Alerting

The system includes monitoring for critical security events:

1. Failed login attempts exceeding threshold
2. Access to PHI from unusual locations
3. MFA disabling events
4. Changes to security settings

Alerts are sent via SNS to security personnel for immediate investigation.

## Compliance Reporting

The audit logging system facilitates HIPAA compliance reporting:

1. **Access Reports**
   - Who accessed what PHI and when
   - Failed access attempts

2. **Security Reports**
   - Unusual activity patterns
   - Security configuration changes

3. **Compliance Evidence**
   - Evidence for regulatory audits
   - Demonstration of access controls

## Usage in Code

Our application uses a centralized `audit-logger.ts` module that provides:

```typescript
// Example usage
import { logAudit } from '@/lib/audit-logger';

// Log a PHI access event
logAudit('PHI_ACCESSED', {
  status: 'success',
  timestamp: new Date().toISOString(),
  userId: '123',
  patientId: '456',
  dataType: 'DICOM',
  accessReason: 'TREATMENT'
});
```

## Incident Response

In case of security incidents:

1. Immediately review relevant audit logs
2. Identify affected users and PHI
3. Follow the incident response procedure
4. Generate audit log reports for investigation

## Business Associate Agreements (BAA)

Ensure AWS BAA is in place before storing PHI in:
- CloudWatch Logs
- S3
- CloudTrail

## Regular Review

Security team should review:
- Audit logs weekly for unusual patterns
- Access to audit logs monthly
- Logging configuration quarterly
- Full compliance audit annually 