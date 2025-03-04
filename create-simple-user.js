const { PrismaClient, Role, ProviderSpecialty } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

// Map for provider specialties (client enum to database enum)
const specialtyMap = {
  RADIOLOGIST: 'RADIOLOGY',
  CARDIOLOGIST: 'CARDIOLOGY',
  NEUROLOGIST: 'NEUROLOGY',
  GENERAL_PRACTITIONER: 'GENERAL',
  ORTHOPEDIST: 'ORTHOPEDICS',
  OTHER: 'OTHER'
};

// Utility function to create a user
async function createUser(userData) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: userData.email
      }
    });

    if (existingUser) {
      console.log(`User with email ${userData.email} already exists, skipping...`);
      return null;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const uuid = randomUUID();

    console.log(`Attempting to create user: ${userData.email}, role: ${userData.role}, specialty: ${userData.specialty}`);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        id: uuid,
        name: userData.name,
        email: userData.email,
        username: userData.username,
        password: hashedPassword,
        role: userData.role,
        specialty: userData.specialty,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`Created user with email ${userData.email}`);
    return newUser;
  } catch (error) {
    console.error(`Error creating user with email ${userData.email}:`, error.message);
    if (error.meta) {
      console.error('Error details:', error.meta);
    }
    return null;
  }
}

// Main function to create all test users
async function createAllTestUsers() {
  console.log('Starting to create test users...');
  
  try {
    // First, let's see what enum values are available
    console.log("ProviderSpecialty enum values:", ProviderSpecialty);
    
    // Create Admin
    await createUser({
      name: 'Admin User',
      email: 'admin10@test.com',
      username: 'adminuser10',
      password: 'Password123!',
      role: Role.ADMIN
    });

    // Create Providers with different specialties using enum values
    await createUser({
      name: 'Provider User',
      email: 'provider10@test.com',
      username: 'provideruser10',
      password: 'Password123!',
      role: Role.PROVIDER,
      specialty: ProviderSpecialty.RADIOLOGIST
    });

    await createUser({
      name: 'Cardiology Provider',
      email: 'cardio10@test.com',
      username: 'cardioprovider10',
      password: 'Password123!',
      role: Role.PROVIDER,
      specialty: ProviderSpecialty.CARDIOLOGIST
    });

    await createUser({
      name: 'Neurology Provider',
      email: 'neuro10@test.com',
      username: 'neuroprovider10',
      password: 'Password123!',
      role: Role.PROVIDER,
      specialty: ProviderSpecialty.NEUROLOGIST
    });

    // Create Patients
    await createUser({
      name: 'Patient User',
      email: 'patient10@test.com',
      username: 'patientuser10',
      password: 'Password123!',
      role: Role.PATIENT
    });

    console.log('Test users creation completed');
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Finished creating test users.');
  }
}

// Run the main function
createAllTestUsers();
