/**
 * Script to create test users for all roles (patient, provider, admin)
 * Run with: node scripts/create-test-users.js
 */

const axios = require('axios');
const { PrismaClient, Role, ProviderSpecialty } = require('@prisma/client');

// Use directly to create users in the database
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// Configuration
const API_BASE_URL = 'http://localhost:3001'; // Change to your backend URL
const FRONTEND_URL = 'http://localhost:3000'; // Change to your frontend URL

// Test users data
const testUsers = [
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
    specialty: ProviderSpecialty.RADIOLOGY
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
    specialty: ProviderSpecialty.CARDIOLOGY
  },
  {
    name: 'Test Neurologist',
    email: 'neuro@test.com',
    username: 'testneuro',
    password: 'Password123!',
    role: Role.PROVIDER,
    specialty: ProviderSpecialty.NEUROLOGY
  }
];

/**
 * Create user directly in the database with Prisma
 */
async function createUserWithPrisma(userData) {
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