// Test script to check Prisma connection
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Testing Prisma connection...');
  
  try {
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`Database connection successful. User count: ${userCount}`);
    
    // List model names to check what models are available
    console.log('Available models in Prisma client:');
    const modelNames = Object.keys(prisma).filter(key => 
      !key.startsWith('_') && 
      typeof prisma[key] === 'object' && 
      prisma[key] !== null
    );
    console.log(modelNames);
    
    return 'Success';
  } catch (error) {
    console.error('Prisma connection test failed:', error);
    return 'Failed';
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(console.log)
  .catch(console.error); 