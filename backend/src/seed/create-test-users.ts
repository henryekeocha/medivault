import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { fileURLToPath } from 'url';

// Main function to seed test users
export const seedTestUsers = async () => {
  try {
    console.log('Starting to create test users...');
    
    // Test if users already exist
    const existingPatient = await prisma.$queryRaw`SELECT * FROM "User" WHERE email = 'patient@test.com' LIMIT 1`;
    const existingProvider = await prisma.$queryRaw`SELECT * FROM "User" WHERE email = 'provider@test.com' LIMIT 1`;
    
    // Create patient user if not exists
    if (!Array.isArray(existingPatient) || existingPatient.length === 0) {
      // Hash password
      const patientPassword = await bcrypt.hash('Password123!', 12);
      
      // Create user with direct SQL to avoid schema mismatch issues
      await prisma.$executeRaw`
        INSERT INTO "User" (
          id, email, name, password, role, 
          "isActive", "twoFactorEnabled", 
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), 'patient@test.com', 'Test Patient', ${patientPassword}, 'PATIENT'::Role, 
          true, false, 
          NOW(), NOW()
        )
      `;
      
      console.log('Created test patient user');
    } else {
      console.log('Test patient user already exists');
    }
    
    // Create provider user if not exists
    if (!Array.isArray(existingProvider) || existingProvider.length === 0) {
      // Hash password
      const providerPassword = await bcrypt.hash('Password123!', 12);
      
      // Create user with direct SQL to avoid schema mismatch issues
      await prisma.$executeRaw`
        INSERT INTO "User" (
          id, email, name, password, role, 
          "isActive", "twoFactorEnabled", 
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), 'provider@test.com', 'Test Provider', ${providerPassword}, 'PROVIDER'::Role, 
          true, false, 
          NOW(), NOW()
        )
      `;
      
      console.log('Created test provider user');
    } else {
      console.log('Test provider user already exists');
    }
    
    console.log('Finished creating test users');
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
};

// For ESM compatibility
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

// Run the seed function if this script is executed directly
if (isMainModule) {
  seedTestUsers()
    .then(() => {
      console.log('Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
} 