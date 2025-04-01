import prisma from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';
const TABLES_TO_UPDATE = [
    'image',
    'medicalRecord',
    'appointment',
    'notification',
    'auditLog',
    'share',
    'message'
];
async function updateUserIds() {
    console.log('Starting user ID update process...');
    try {
        // Start a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update users table
            const users = await tx.user.findMany();
            for (const user of users) {
                if (!user.id.includes('-')) {
                    const newId = uuidv4();
                    await tx.user.update({
                        where: { id: user.id },
                        data: { id: newId }
                    });
                    console.log(`Updated user ID: ${user.id} -> ${newId}`);
                }
            }
            // Update related tables
            for (const table of TABLES_TO_UPDATE) {
                const records = await tx[table].findMany();
                for (const record of records) {
                    const updates = {};
                    // Update userId if exists
                    if ('userId' in record && record.userId && !record.userId.includes('-')) {
                        const user = await tx.user.findFirst({
                            where: { id: record.userId }
                        });
                        if (user) {
                            updates.userId = user.id;
                        }
                    }
                    // Update patientId if exists
                    if ('patientId' in record && record.patientId && !record.patientId.includes('-')) {
                        const patient = await tx.user.findFirst({
                            where: { id: record.patientId }
                        });
                        if (patient) {
                            updates.patientId = patient.id;
                        }
                    }
                    // Update providerId if exists
                    if ('providerId' in record && record.providerId && !record.providerId.includes('-')) {
                        const provider = await tx.user.findFirst({
                            where: { id: record.providerId }
                        });
                        if (provider) {
                            updates.providerId = provider.id;
                        }
                    }
                    // Update senderId if exists
                    if ('senderId' in record && record.senderId && !record.senderId.includes('-')) {
                        const sender = await tx.user.findFirst({
                            where: { id: record.senderId }
                        });
                        if (sender) {
                            updates.senderId = sender.id;
                        }
                    }
                    // Update receiverId if exists
                    if ('receiverId' in record && record.receiverId && !record.receiverId.includes('-')) {
                        const receiver = await tx.user.findFirst({
                            where: { id: record.receiverId }
                        });
                        if (receiver) {
                            updates.receiverId = receiver.id;
                        }
                    }
                    // Apply updates if any
                    if (Object.keys(updates).length > 0) {
                        await tx[table].update({
                            where: { id: record.id },
                            data: updates
                        });
                        console.log(`Updated ${String(table)} record: ${record.id}`);
                    }
                }
            }
            return 'Success';
        });
        console.log('User ID update process completed successfully!');
        return result;
    }
    catch (error) {
        console.error('Error updating user IDs:', error);
        throw error;
    }
}
// Run the script
updateUserIds()
    .catch(console.error)
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=updateUserIds.js.map