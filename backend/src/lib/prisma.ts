import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a Prisma client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Extend the Prisma client with custom methods
const prismaWithExtensions = prisma.$extends({
  name: 'customFieldsExtension',
  query: {
    user: {
      async update({ args, query }) {
        // Handle verification code and expiresAt fields if present
        if (args.data && 'verificationCode' in args.data) {
          // Execute raw SQL to ensure the verification code field is updated
          if (args.where && args.where.id) {
            await prisma.$executeRaw`
              UPDATE "User" 
              SET "verificationCode" = ${args.data.verificationCode}
              WHERE "id" = ${args.where.id}
            `;
          }
          
          // Remove from args to avoid TypeScript errors
          delete args.data.verificationCode;
        }
        
        if (args.data && 'verificationCodeExpiresAt' in args.data) {
          // Execute raw SQL to ensure the verification code expires at field is updated
          if (args.where && args.where.id) {
            await prisma.$executeRaw`
              UPDATE "User" 
              SET "verificationCodeExpiresAt" = ${args.data.verificationCodeExpiresAt}
              WHERE "id" = ${args.where.id}
            `;
          }
          
          // Remove from args to avoid TypeScript errors
          delete args.data.verificationCodeExpiresAt;
        }
        
        return query(args);
      },
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prismaWithExtensions; 