/**
 * Create Test Users Script
 *
 * This script creates test users for each role (PATIENT, PROVIDER, ADMIN)
 * with predefined credentials for testing purposes.
 *
 * Usage:
 * npx tsx scripts/create-test-users.ts
 */
import { PrismaClient, Role, ProviderSpecialty } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
const prisma = new PrismaClient();
async function createUsers() {
    console.log('Creating test users...');
    const testUsers = [
        {
            email: 'patient@example.com',
            password: 'TestPatient123!',
            name: 'Test Patient',
            role: Role.PATIENT,
        },
        {
            email: 'provider@example.com',
            password: 'TestProvider123!',
            name: 'Test Provider',
            role: Role.PROVIDER,
            specialty: ProviderSpecialty.RADIOLOGY,
        },
        {
            email: 'admin@example.com',
            password: 'TestAdmin123!',
            name: 'Test Admin',
            role: Role.ADMIN,
        }
    ];
    const saltRounds = 10;
    for (const user of testUsers) {
        try {
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: user.email },
            });
            if (existingUser) {
                console.log(`User ${user.email} already exists. Skipping creation.`);
                continue;
            }
            // Hash the password
            const hashedPassword = await bcrypt.hash(user.password, saltRounds);
            // Create the user
            const newUser = await prisma.user.create({
                data: {
                    id: randomUUID(),
                    email: user.email,
                    password: hashedPassword,
                    name: user.name,
                    role: user.role,
                    specialty: user.role === Role.PROVIDER ? user.specialty : null,
                    isActive: true,
                    emailVerified: new Date(),
                },
            });
            console.log(`Created ${user.role} user: ${user.email} with password ${user.password}`);
            // For patients, create a patient profile
            if (user.role === Role.PATIENT) {
                // No separate patient profile needed, already covered by User model
                console.log(`Patient user ${user.email} created successfully.`);
            }
            // For providers, create a provider verification record with verified status
            if (user.role === Role.PROVIDER) {
                await prisma.providerVerification.create({
                    data: {
                        id: randomUUID(),
                        providerId: newUser.id,
                        licenseNumber: 'TEST-LICENSE-12345',
                        licenseState: 'NY',
                        licenseExpiryDate: new Date('2030-01-01'),
                        verificationStatus: 'APPROVED',
                        specialtyName: user.specialty || ProviderSpecialty.RADIOLOGY,
                        updatedAt: new Date(),
                        verifiedAt: new Date(),
                    },
                });
                console.log(`Created provider verification for ${user.email}`);
            }
        }
        catch (error) {
            console.error(`Error creating user ${user.email}:`, error);
        }
    }
    console.log('Test users creation completed.');
}
createUsers()
    .catch((e) => {
    console.error('Error creating test users:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=create-test-users.js.map