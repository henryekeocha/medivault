const { PrismaClient, Role, ProviderSpecialty } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

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

    // Create user with data
    const newUser = await prisma.user.create({
      data: {
        id: uuid,
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        specialty: userData.role === Role.PROVIDER ? userData.specialty : null,
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
    // Create Admin
    await createUser({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'TestAdmin123!',
      role: Role.ADMIN
    });

    // Create Provider
    await createUser({
      name: 'Provider User',
      email: 'provider@example.com',
      password: 'TestProvider123!',
      role: Role.PROVIDER,
      specialty: ProviderSpecialty.GENERAL
    });

    // Create Patient
    await createUser({
      name: 'Patient User',
      email: 'patient@example.com',
      password: 'TestPatient123!',
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