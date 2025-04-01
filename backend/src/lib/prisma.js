import { PrismaClient } from '@prisma/client';

// Create a singleton instance of the Prisma client
// This prevents multiple connections when hot reloading in development

// Use global to maintain a single instance across hot reloads
// Define globalForPrisma without TypeScript assertions
let globalForPrisma = global;
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = null;
}

// Create or reuse the Prisma instance
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Set the singleton in development to prevent multiple instances during hot reloading
if (process.env.NODE_ENV === 'development') {
  globalForPrisma.prisma = prisma;
}

// Initialize connection on first import
prisma.$connect()
  .then(() => {
    console.log('Database connection established');
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
  });

export default prisma; 