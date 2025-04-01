import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const testUsers = [
  {
    email: 'patient@example.com',
    password: 'TestPatient123!',
    name: 'Test Patient',
    role: Role.PATIENT,
    username: 'testpatient'
  },
  {
    email: 'provider@example.com',
    password: 'TestProvider123!',
    name: 'Test Provider',
    role: Role.PROVIDER,
    username: 'testprovider'
  },
  {
    email: 'admin@example.com',
    password: 'TestAdmin123!',
    name: 'Test Admin',
    role: Role.ADMIN,
    username: 'testadmin'
  }
];

async function createTestUsers() {
  console.log('Starting test users creation process...');

  try {
    // First, delete existing test users
    for (const user of testUsers) {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email }
      });

      if (existingUser) {
        console.log(`User with email ${user.email} already exists, deleting...`);
        await prisma.user.delete({
          where: { email: user.email }
        });
        console.log(`Deleted user with email ${user.email}`);
      }
    }

    // Create new test users
    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      
      const newUser = await prisma.user.create({
        data: {
          email: user.email,
          password: hashedPassword,
          name: user.name,
          username: user.username,
          role: user.role,
          isActive: true,
          twoFactorEnabled: false
        }
      });

      console.log(`Created new user: ${newUser.email}`);
    }

    console.log('Test users creation completed successfully!');
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers(); 