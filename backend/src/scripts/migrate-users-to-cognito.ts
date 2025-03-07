#!/usr/bin/env ts-node

/**
 * Script to migrate users from NextAuth.js to AWS Cognito
 * 
 * Usage:
 * npm run migrate-users-to-cognito -- [--dry-run] [--batch-size=50] [--user-id=123]
 * 
 * Options:
 * --dry-run       Run without making actual changes to Cognito
 * --batch-size    Number of users to process in each batch (default: 50)
 * --user-id       Migrate a specific user by ID
 * --role          Migrate users with a specific role (ADMIN, PROVIDER, PATIENT)
 */

import { PrismaClient, Role } from '@prisma/client';
import { CognitoService } from '../services/aws/cognito-service.js';
import { validateCognitoConfig } from '../services/aws/cognito-config.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Initialize services
const prisma = new PrismaClient();
const cognitoService = new CognitoService();

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 50;
const userIdArg = args.find(arg => arg.startsWith('--user-id='));
const userId = userIdArg ? userIdArg.split('=')[1] : undefined;
const roleArg = args.find(arg => arg.startsWith('--role='));
const role = roleArg ? roleArg.split('=')[1] as Role : undefined;

// Setup logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, `cognito-migration-${new Date().toISOString().replace(/:/g, '-')}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

interface UserAttributes {
  name: any;
  'custom:role': any;
  'custom:userId': any;
  'custom:specialty'?: any;
  [key: string]: any;
}

/**
 * Migrate a single user to Cognito
 */
async function migrateUser(user: any) {
  try {
    log(`Processing user: ${user.id} (${user.email})`);

    // Check if user already exists in Cognito
    try {
      // This will throw an error if the user doesn't exist
      await cognitoService.adminGetUser(user.email);
      log(`User ${user.email} already exists in Cognito, skipping...`);
      return { success: true, action: 'skipped', userId: user.id, email: user.email };
    } catch (error: any) {
      // If error is not UserNotFoundException, rethrow
      if (error.name !== 'UserNotFoundException') {
        throw error;
      }
      // Otherwise, continue with creation
    }

    if (dryRun) {
      log(`[DRY RUN] Would create user ${user.email} in Cognito`);
      return { success: true, action: 'dry-run', userId: user.id, email: user.email };
    }

    // Create user in Cognito
    const tempPassword = generateTempPassword();
    const userAttributes: UserAttributes = {
      'name': user.name || '',
      'custom:role': user.role,
      'custom:userId': user.id,
    };

    // Add specialty if user is a provider
    if (user.role === Role.PROVIDER && user.specialty) {
      userAttributes['custom:specialty'] = user.specialty;
    }

    const result = await cognitoService.adminCreateUser(
      user.email,
      tempPassword,
      userAttributes
    );

    // Set user password as permanent if we have a password hash
    // Note: In a real migration, you would use a Lambda trigger for password migration
    // This is just a placeholder for demonstration
    if (user.password) {
      await cognitoService.adminSetUserPassword(
        user.email,
        tempPassword,
        true // Set as permanent
      );
    }

    // Add user to appropriate group based on role
    await cognitoService.adminAddUserToGroup(user.email, user.role.toLowerCase());

    log(`Successfully migrated user ${user.email} to Cognito`);
    return { success: true, action: 'created', userId: user.id, email: user.email };
  } catch (error: any) {
    log(`Error migrating user ${user.email}: ${error.message}`);
    return { 
      success: false, 
      action: 'error', 
      userId: user.id, 
      email: user.email, 
      error: error.message 
    };
  }
}

/**
 * Generate a temporary password
 */
function generateTempPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

/**
 * Main migration function
 */
async function migrateUsers() {
  try {
    log('Starting user migration to Cognito');
    log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);

    // Validate Cognito configuration
    if (!validateCognitoConfig()) {
      log('Error: Invalid Cognito configuration. Please check your environment variables.');
      process.exit(1);
    }

    // Build query
    const where: any = {};
    if (userId) {
      where.id = userId;
      log(`Migrating specific user with ID: ${userId}`);
    } else if (role) {
      where.role = role;
      log(`Migrating users with role: ${role}`);
    }

    // Get total count for progress reporting
    const totalUsers = await prisma.user.count({ where });
    log(`Found ${totalUsers} users to migrate`);

    // Process users in batches
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    // Results tracking
    const results = {
      success: [] as any[],
      error: [] as any[],
      skipped: [] as any[]
    };

    // Get all users or specific user
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        specialty: true,
        password: true
      }
    });

    // Process in batches
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(users.length / batchSize)}`);

      const batchResults = await Promise.all(batch.map(migrateUser));

      for (const result of batchResults) {
        processedCount++;
        
        if (result.success) {
          if (result.action === 'created') {
            successCount++;
            results.success.push(result);
          } else if (result.action === 'skipped') {
            skipCount++;
            results.skipped.push(result);
          }
        } else {
          errorCount++;
          results.error.push(result);
        }

        // Log progress
        if (processedCount % 10 === 0 || processedCount === totalUsers) {
          log(`Progress: ${processedCount}/${totalUsers} users processed`);
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Write results to file
    const resultsFile = path.join(logDir, `cognito-migration-results-${new Date().toISOString().replace(/:/g, '-')}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

    // Log summary
    log('\nMigration Summary:');
    log(`Total users processed: ${processedCount}`);
    log(`Successfully migrated: ${successCount}`);
    log(`Skipped (already exists): ${skipCount}`);
    log(`Errors: ${errorCount}`);
    log(`Results written to: ${resultsFile}`);

    if (dryRun) {
      log('\nThis was a DRY RUN. No changes were made to Cognito.');
    }

  } catch (error: any) {
    log(`Fatal error: ${error.message}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
    logStream.end();
  }
}

// Run the migration
migrateUsers().catch(console.error); 