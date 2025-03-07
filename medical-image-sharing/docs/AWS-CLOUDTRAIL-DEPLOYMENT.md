# AWS CloudTrail Deployment Guide for HIPAA Compliance

This guide outlines the steps required to deploy the AWS CloudTrail infrastructure for HIPAA-compliant audit logging in the Medical Image Sharing application.

## Prerequisites

Before proceeding with the deployment, ensure you have:

1. An AWS account with appropriate permissions to create the resources
2. AWS CLI installed and configured
3. A signed Business Associate Agreement (BAA) with AWS
4. Familiarity with CloudFormation

## Step 1: Set Up AWS Account for HIPAA Compliance

1. Sign a Business Associate Agreement (BAA) with AWS:
   - Open the AWS Artifact console at https://console.aws.amazon.com/artifact/
   - Navigate to "Agreements"
   - Select "AWS Business Associate Addendum"
   - Review and accept the agreement

2. Enable AWS CloudTrail in all regions:
   - AWS CloudTrail should be enabled across all regions to ensure comprehensive logging
   - This is included in the CloudFormation template

3. Set up AWS Organizations (if using multiple accounts):
   - Consider using AWS Organizations for managing multiple environments
   - Create separate accounts for development, staging, and production

## Step 2: Prepare the CloudFormation Template

The repository includes a CloudFormation template at `aws/cloudtrail-setup.yaml` that creates the required resources for HIPAA-compliant audit logging.

Review the template to ensure it meets your specific compliance requirements. The template creates:

- S3 bucket for CloudTrail logs with 7-year retention
- CloudWatch Log Group for CloudTrail logs
- CloudTrail trail with log file validation
- IAM roles with appropriate permissions
- EventBridge event bus for application events
- CloudWatch alarms for security monitoring
- SNS topic for security alerts

## Step 3: Deploy the CloudFormation Stack

1. Navigate to the AWS CloudFormation console
2. Click "Create stack" > "With new resources (standard)"
3. Choose "Upload a template file" and upload the `cloudtrail-setup.yaml` file
4. Set stack name to `medical-image-sharing-hipaa-audit`
5. Configure parameters:
   - Environment: Choose `production` for production environment
   - RetentionPeriod: Set to `2555` for 7-year retention (HIPAA requirement)
   - ApplicationName: Set to `medical-image-sharing` or your preferred name
6. Configure stack options (add tags for tracking)
7. Review and create the stack

Wait for the stack to complete (this may take 5-10 minutes).

## Step 4: Configure SNS Email Subscriptions

After the stack is created, you need to set up email subscriptions for security alerts:

1. Navigate to the AWS SNS console
2. Select the topic created by the stack (e.g., `medical-image-sharing-security-alerts`)
3. Click "Create subscription"
4. Set Protocol to "Email"
5. Enter the email address of your security team
6. Create the subscription
7. Confirm the subscription by clicking the link in the email

## Step 5: Update Application Environment Variables

Update your application's environment variables with the outputs from the CloudFormation stack:

1. Go to the CloudFormation console and select your stack
2. Navigate to the "Outputs" tab
3. Copy the values into your application's environment configuration:

```
AWS_CLOUDWATCH_LOG_GROUP=<AppAuditLogGroupArn value>
AWS_EVENTBRIDGE_BUS=<ApplicationEventBusArn value>
AWS_CLOUDTRAIL_NAME=<CloudTrail trail name>
AWS_S3_BUCKET_AUDIT_LOGS=<CloudTrailBucketName value>
```

## Step 6: Set Up IAM User for Application

Create an IAM user with the minimum necessary permissions for the application to write audit logs:

1. Navigate to the IAM console
2. Create a new IAM user named `medical-image-sharing-audit`
3. Create a policy with the following permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "logs:CreateLogStream",
           "logs:PutLogEvents",
           "logs:DescribeLogGroups",
           "logs:DescribeLogStreams"
         ],
         "Resource": "<AppAuditLogGroupArn value>*"
       },
       {
         "Effect": "Allow",
         "Action": [
           "events:PutEvents"
         ],
         "Resource": "<ApplicationEventBusArn value>"
       }
     ]
   }
   ```
4. Attach the policy to the IAM user
5. Generate access keys for the user
6. Add the access keys to your application's environment variables:
   ```
   AWS_ACCESS_KEY_ID=<generated access key>
   AWS_SECRET_ACCESS_KEY=<generated secret key>
   ```

## Step 7: Test the Audit Logging System

1. Run the test script included in the repository:
   ```
   cd medical-image-sharing
   npm install dotenv
   npx ts-node scripts/test-audit-logger.ts
   ```

2. Verify the logs appear in CloudWatch Logs:
   - Navigate to the CloudWatch console
   - Select "Log groups"
   - Select the log group created by CloudFormation
   - Verify log streams and events are present

3. Verify events are sent to EventBridge:
   - Navigate to the EventBridge console
   - Select "Buses" > "<your event bus name>"
   - Check under "Metrics" to see events count

## Step 8: Set Up Scheduled Compliance Reports

Create a scheduled Lambda function to generate compliance reports:

1. Navigate to the Lambda console
2. Create a new function
3. Use a Python runtime and the following code template:
   ```python
   import boto3
   import datetime
   import json
   import os
   
   def lambda_handler(event, context):
       logs = boto3.client('logs')
       
       # Set the time range for the report (last 7 days)
       end_time = datetime.datetime.now()
       start_time = end_time - datetime.timedelta(days=7)
       
       # Convert to milliseconds since epoch
       end_time_ms = int(end_time.timestamp() * 1000)
       start_time_ms = int(start_time.timestamp() * 1000)
       
       # Get log group name from environment variable
       log_group = os.environ['LOG_GROUP_NAME']
       
       # Query CloudWatch Logs for PHI access events
       query = '''
       fields @timestamp, eventType, status, userId, patientId, imageId
       | filter eventType like /PHI/ or eventType like /DICOM/
       | sort @timestamp desc
       | limit 1000
       '''
       
       response = logs.start_query(
           logGroupName=log_group,
           startTime=start_time_ms,
           endTime=end_time_ms,
           queryString=query
       )
       
       # Store the query ID for future reference
       query_id = response['queryId']
       
       # Return a link to the compliance report
       return {
           'statusCode': 200,
           'body': json.dumps(f'Compliance report started with query ID: {query_id}')
       }
   ```

4. Set environment variables:
   - LOG_GROUP_NAME: <AppAuditLogGroupArn value>

5. Create an EventBridge rule to trigger the Lambda weekly:
   - Navigate to EventBridge > Rules
   - Create a new rule with a schedule expression: `cron(0 0 ? * MON *)`
   - Set the target to your Lambda function

## Step 9: Regular Compliance Review

Schedule regular reviews of your audit logging system:

1. Weekly:
   - Review security alerts and failed login attempts
   - Check CloudWatch alarms for any triggered conditions
   - Review PHI access patterns for anomalies

2. Monthly:
   - Review IAM permissions and access to audit logs
   - Verify CloudTrail is correctly logging all events
   - Check S3 bucket policies and access controls

3. Quarterly:
   - Update policies and procedures as needed
   - Review CloudFormation template for any required updates
   - Test incident response procedures

4. Annually:
   - Conduct a full compliance audit
   - Review retention policies
   - Update the BAA with AWS if needed

## Step 10: Document HIPAA Compliance

Maintain documentation of your HIPAA compliance measures:

1. Create and maintain a HIPAA compliance document
2. Document your audit logging architecture
3. Include procedures for access to PHI
4. Document incident response procedures
5. Store a copy of your BAA with AWS

## Troubleshooting

If you encounter issues with the audit logging system:

1. Check IAM permissions:
   - Ensure the IAM user has appropriate permissions
   - Check for resource-based policy conflicts

2. Verify CloudWatch Log Group:
   - Ensure the log group exists
   - Check log stream creation permissions

3. Check EventBridge Configuration:
   - Verify the event bus exists
   - Check PutEvents permissions

4. S3 Bucket Access:
   - Check bucket policies
   - Verify no public access is allowed

## Additional Security Measures

Consider implementing these additional security measures:

1. Enable AWS Config for continuous compliance monitoring
2. Use AWS GuardDuty for threat detection
3. Implement AWS Security Hub for security checks
4. Set up AWS WAF for web application protection
5. Use AWS Shield for DDoS protection 