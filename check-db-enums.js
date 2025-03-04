const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabaseEnums() {
  try {
    console.log('Checking database enum values...');
    
    // Query for enum values directly from the database
    const result = await prisma.$queryRaw`
      SELECT n.nspname AS enum_schema,
             t.typname AS enum_name,
             e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'providerspecialty'
      ORDER BY enum_schema, enum_name, e.enumsortorder;
    `;
    
    console.log('Database enum values for ProviderSpecialty:');
    console.log(result);
    
    // Check existing users with specialties
    const users = await prisma.user.findMany({
      where: {
        specialty: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        specialty: true
      }
    });
    
    console.log('\nExisting users with specialties:');
    console.log(users);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseEnums(); 