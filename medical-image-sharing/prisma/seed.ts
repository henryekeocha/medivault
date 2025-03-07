const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

async function main() {
  console.log('Starting database seed...');
  
  // Delete existing users first to avoid duplicates
  console.log('Cleaning up existing test users...');
  const deleted = await db.user.deleteMany({
    where: {
      email: {
        in: ['patient@test.com', 'provider@test.com', 'admin@test.com']
      }
    }
  });
  console.log('Deleted users:', deleted.count);

  try {
    // Create generic patient account
    console.log('Creating patient account...');
    const patientPassword = await bcrypt.hash('patient123', 10);
    const patient = await db.user.create({
      data: {
        name: 'Test Patient',
        email: 'patient@test.com',
        password: patientPassword,
        role: Role.Patient,
      },
    });
    console.log('Created test patient:', { email: patient.email, role: patient.role });

    // Create generic healthcare provider account
    console.log('Creating provider account...');
    const providerPassword = await bcrypt.hash('provider123', 10);
    const provider = await db.user.create({
      data: {
        name: 'Test Provider',
        email: 'provider@test.com',
        password: providerPassword,
        role: Role.Provider,
      },
    });
    console.log('Created test provider:', { email: provider.email, role: provider.role });

    // Create admin account
    console.log('Creating admin account...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await db.user.create({
      data: {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: adminPassword,
        role: Role.Admin,
      },
    });
    console.log('Created test admin:', { email: admin.email, role: admin.role });

    // Verify all users were created
    const allUsers = await db.user.findMany({
      where: {
        email: {
          in: ['patient@test.com', 'provider@test.com', 'admin@test.com']
        }
      },
      select: {
        email: true,
        role: true
      }
    });
    console.log('All created users:', allUsers);
  } catch (error) {
    console.error('Error during user creation:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  }); 