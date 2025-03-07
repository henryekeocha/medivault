import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn']
      : ['error'],
  });
  
  return client;
}

export default prisma; 