import prisma from '../lib/prisma.js';
beforeAll(async () => {
    // Connect to test database
    await prisma.$connect();
});
afterAll(async () => {
    // Disconnect and cleanup
    await prisma.$disconnect();
});
beforeEach(async () => {
    // Clean up the test database before each test
    const tables = await prisma.$queryRaw `SELECT tablename FROM pg_tables WHERE schemaname='public'`;
    for (const { tablename } of tables) {
        if (tablename !== '_prisma_migrations') {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
        }
    }
});
// Global test timeout
jest.setTimeout(30000);
//# sourceMappingURL=setup.js.map