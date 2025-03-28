import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@medical-imaging.com' },
    update: {},
    create: {
      email: 'admin@medical-imaging.com',
      username: 'admin',
      password: adminPassword,
      role: Role.ADMIN,
      name: 'System Administrator',
      isActive: true,
    },
  });

  // Create test provider
  const providerPassword = await bcrypt.hash('provider123', 10);
  const provider = await prisma.user.upsert({
    where: { email: 'provider@medical-imaging.com' },
    update: {},
    create: {
      email: 'provider@medical-imaging.com',
      username: 'provider',
      password: providerPassword,
      role: Role.PROVIDER,
      name: 'Test Provider',
      isActive: true,
    },
  });

  // Create test patient
  const patientPassword = await bcrypt.hash('patient123', 10);
  const patient = await prisma.user.upsert({
    where: { email: 'patient@medical-imaging.com' },
    update: {},
    create: {
      email: 'patient@medical-imaging.com',
      username: 'patient',
      password: patientPassword,
      role: Role.PATIENT,
      name: 'Test Patient',
      isActive: true,
    },
  });

  // Create system settings
  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      maintenanceMode: false,
      maintenanceMessage: null,
      allowNewRegistrations: true,
      maxUploadSize: 10485760, // 10MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/dicom'],
      defaultStorageQuota: 5368709120, // 5GB
      smtpConfigured: false,
    },
  });

  // Create user settings for each user
  await Promise.all([
    prisma.userSettings.upsert({
      where: { userId: admin.id },
      update: {},
      create: {
        userId: admin.id,
        emailNotifications: true,
        pushNotifications: true,
        messageNotifications: true,
        shareNotifications: true,
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
      },
    }),
    prisma.userSettings.upsert({
      where: { userId: provider.id },
      update: {},
      create: {
        userId: provider.id,
        emailNotifications: true,
        pushNotifications: true,
        messageNotifications: true,
        shareNotifications: true,
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
      },
    }),
    prisma.userSettings.upsert({
      where: { userId: patient.id },
      update: {},
      create: {
        userId: patient.id,
        emailNotifications: true,
        pushNotifications: true,
        messageNotifications: true,
        shareNotifications: true,
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
      },
    }),
  ]);

  console.log('Seed data created successfully');
  console.log('Admin user:', admin.email);
  console.log('Provider user:', provider.email);
  console.log('Patient user:', patient.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 