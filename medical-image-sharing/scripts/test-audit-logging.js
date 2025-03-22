#!/usr/bin/env node

/**
 * CloudWatch Audit Logger Test Script
 * 
 * This script tests the connection to AWS CloudWatch and 
 * verifies that the HIPAA audit logging is properly configured.
 * 
 * Usage: 
 *   node test-audit-logging.js
 *   node test-audit-logging.js --env=production
 */

const { CloudWatchLogs } = require('@aws-sdk/client-cloudwatch-logs');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const chalk = require('chalk');

// Process command line arguments
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env=')) || '--env=development';
const envName = envArg.split('=')[1] || 'development';

// Load environment variables from the specified env file
let envPath = path.resolve(process.cwd(), '.env');
if (envName !== 'default') {
  const specificEnvPath = path.resolve(process.cwd(), `.env.${envName}`);
  if (fs.existsSync(specificEnvPath)) {
    envPath = specificEnvPath;
    console.log(chalk.blue(`Using environment: ${envName} (${envPath})`));
  } else {
    console.log(chalk.yellow(`Environment file for ${envName} not found, using default .env file`));
  }
}

// Load environment variables
dotenv.config({ path: envPath });

// Check required environment variables
const requiredVars = [
  'AWS_REGION',
  'AWS_CLOUDWATCH_LOG_GROUP',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(chalk.red('Missing required environment variables:'));
  missingVars.forEach(varName => {
    console.error(chalk.red(`  - ${varName}`));
  });
  console.error(chalk.yellow('\nPlease set these variables in your environment file.'));
  process.exit(1);
}

// Initialize CloudWatch client
const cloudWatchLogs = new CloudWatchLogs({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Constants from .env file
const LOG_GROUP_NAME = process.env.AWS_CLOUDWATCH_LOG_GROUP;
const LOG_STREAM_NAME = `audit-test/${new Date().toISOString().split('T')[0]}`;

async function testCloudWatchConnection() {
  console.log(chalk.cyan('Testing AWS CloudWatch connection...'));
  
  try {
    const result = await cloudWatchLogs.describeLogGroups({
      logGroupNamePrefix: LOG_GROUP_NAME
    });
    
    const logGroups = result.logGroups || [];
    const existingGroup = logGroups.find(group => group.logGroupName === LOG_GROUP_NAME);
    
    if (existingGroup) {
      console.log(chalk.green(`✓ Log group '${LOG_GROUP_NAME}' exists`));
      console.log(chalk.gray(`  - Created: ${new Date(existingGroup.creationTime).toLocaleString()}`));
      console.log(chalk.gray(`  - Retention: ${existingGroup.retentionInDays || 'Indefinite'} days`));
      console.log(chalk.gray(`  - Stored bytes: ${existingGroup.storedBytes || 0}`));
      
      return true;
    } else {
      console.log(chalk.yellow(`⚠ Log group '${LOG_GROUP_NAME}' not found`));
      
      // Ask if we should create the log group
      console.log(chalk.blue('Would you like to create it? (y/n)'));
      const response = await new Promise(resolve => {
        process.stdin.once('data', data => {
          resolve(data.toString().trim().toLowerCase());
        });
      });
      
      if (response === 'y' || response === 'yes') {
        await createLogGroup();
        return true;
      } else {
        console.log(chalk.yellow('Log group creation skipped.'));
        return false;
      }
    }
  } catch (error) {
    console.error(chalk.red('Error connecting to CloudWatch:'), error);
    return false;
  }
}

async function createLogGroup() {
  try {
    console.log(chalk.blue(`Creating log group '${LOG_GROUP_NAME}'...`));
    
    await cloudWatchLogs.createLogGroup({
      logGroupName: LOG_GROUP_NAME,
      tags: {
        Application: 'medical-image-sharing',
        Environment: process.env.NODE_ENV || 'development',
        Compliance: 'HIPAA'
      }
    });
    
    // Set retention policy (7 years for HIPAA compliance)
    await cloudWatchLogs.putRetentionPolicy({
      logGroupName: LOG_GROUP_NAME,
      retentionInDays: 365 * 7 // 7 years
    });
    
    console.log(chalk.green('✓ Log group created successfully with 7-year retention policy'));
    return true;
  } catch (error) {
    console.error(chalk.red('Error creating log group:'), error);
    return false;
  }
}

async function testAuditLogging() {
  try {
    console.log(chalk.blue(`Creating test log stream '${LOG_STREAM_NAME}'...`));
    
    // Create log stream
    try {
      await cloudWatchLogs.createLogStream({
        logGroupName: LOG_GROUP_NAME,
        logStreamName: LOG_STREAM_NAME
      });
      console.log(chalk.green('✓ Log stream created successfully'));
    } catch (error) {
      if (error.name === 'ResourceAlreadyExistsException') {
        console.log(chalk.yellow('⚠ Log stream already exists, continuing...'));
      } else {
        throw error;
      }
    }
    
    // Write test log event
    console.log(chalk.blue('Writing test audit log event...'));
    
    const testEvent = {
      eventType: 'AUDIT_TEST',
      timestamp: new Date().toISOString(),
      user: 'test-user',
      action: 'TEST_AUDIT_LOGGING',
      status: 'success',
      details: {
        testId: Math.random().toString(36).substring(2),
        environment: process.env.NODE_ENV || 'development'
      }
    };
    
    await cloudWatchLogs.putLogEvents({
      logGroupName: LOG_GROUP_NAME,
      logStreamName: LOG_STREAM_NAME,
      logEvents: [
        {
          timestamp: Date.now(),
          message: JSON.stringify(testEvent)
        }
      ]
    });
    
    console.log(chalk.green('✓ Test audit log sent successfully'));
    console.log(chalk.gray('  Event details:'));
    console.log(chalk.gray(`  - Event type: ${testEvent.eventType}`));
    console.log(chalk.gray(`  - Timestamp: ${testEvent.timestamp}`));
    console.log(chalk.gray(`  - Test ID: ${testEvent.details.testId}`));
    
    return true;
  } catch (error) {
    console.error(chalk.red('Error testing audit logging:'), error);
    return false;
  }
}

async function main() {
  console.log(chalk.cyan('┌─────────────────────────────────────┐'));
  console.log(chalk.cyan('│     HIPAA Audit Logging Test Tool   │'));
  console.log(chalk.cyan('└─────────────────────────────────────┘'));
  console.log();
  
  console.log(chalk.blue('Testing AWS CloudWatch configuration with the following settings:'));
  console.log(chalk.gray(`  AWS Region: ${process.env.AWS_REGION}`));
  console.log(chalk.gray(`  Log Group: ${LOG_GROUP_NAME}`));
  console.log(chalk.gray(`  Test Log Stream: ${LOG_STREAM_NAME}`));
  console.log();
  
  const connectionSuccessful = await testCloudWatchConnection();
  if (!connectionSuccessful) {
    console.error(chalk.red('CloudWatch connection test failed. Exiting.'));
    process.exit(1);
  }
  
  console.log();
  const loggingSuccessful = await testAuditLogging();
  if (!loggingSuccessful) {
    console.error(chalk.red('Audit logging test failed. Exiting.'));
    process.exit(1);
  }
  
  console.log();
  console.log(chalk.green('✅ All tests passed! HIPAA audit logging is properly configured.'));
  console.log();
  console.log(chalk.blue('You can view your logs in the AWS CloudWatch console:'));
  console.log(chalk.gray(`  https://${process.env.AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${process.env.AWS_REGION}#logsV2:log-groups/log-group/${encodeURIComponent(LOG_GROUP_NAME)}`));
}

// Run the script if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Error running CloudWatch Audit Logger test:'), error);
    process.exit(1);
  });
}

module.exports = { testCloudWatchConnection, testAuditLogging }; 