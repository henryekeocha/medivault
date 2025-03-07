/**
 * Script to create test users for all roles (patient, provider, admin)
 * Run with: npx ts-node scripts/create-test-users.ts
 */

import { PrismaClient, Role, ProviderSpecialty } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Use directly to create users in the database
const prisma = new PrismaClient();

// Test users data
interface TestUser {
  name: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  specialty?: ProviderSpecialty;
}

const testUsers: TestUser[] = [
  {
    name: 'Test Patient',
    email: 'patient@test.com',
    username: 'testpatient',
    password: 'Password123!',
    role: Role.PATIENT
  },
  {
    name: 'Test Provider',
    email: 'provider@test.com',
    username: 'testprovider',
    password: 'Password123!',
    role: Role.PROVIDER,
    specialty: ProviderSpecialty.RADIOLOGIST
  },
  {
    name: 'Test Admin',
    email: 'admin@test.com',
    username: 'testadmin',
    password: 'Password123!',
    role: Role.ADMIN
  },
  {
    name: 'Test Cardiologist',
    email: 'cardio@test.com',
    username: 'testcardio',
    password: 'Password123!',
    role: Role.PROVIDER,
    specialty: ProviderSpecialty.CARDIOLOGIST
  },
  {
    name: 'Test Neurologist',
    email: 'neuro@test.com',
    username: 'testneuro',
    password: 'Password123!',
    role: Role.PROVIDER,
    specialty: ProviderSpecialty.NEUROLOGIST
  }
];

/**
 * Create user directly in the database with Prisma
 */
async function createUserWithPrisma(userData: TestUser) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { username: userData.username }
        ]
      }
    });

    if (existingUser) {
      console.log(`User ${userData.email} already exists. Skipping...`);
      return null;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        username: userData.username,
        password: hashedPassword,
        role: userData.role,
        specialty: userData.specialty,
        isActive: true
      }
    });

    console.log(`Created user: ${user.name} (${user.role})`);
    return user;
  } catch (error) {
    console.error(`Error creating user ${userData.email}:`, error);
    return null;
  }
}

/**
 * Main function to create all test users
 */
async function createAllTestUsers() {
  try {
    console.log('Starting to create test users...');
    
    // Create users sequentially
    for (const userData of testUsers) {
      await createUserWithPrisma(userData);
    }
    
    console.log('Finished creating test users.');
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    // Disconnect from Prisma
    await prisma.$disconnect();
  }
}

// Run the script
createAllTestUsers(); 