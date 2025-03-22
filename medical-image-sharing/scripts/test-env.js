/**
 * Environment Variable Test Script
 * 
 * This script tests that critical environment variables are properly loaded
 * Run it with: node scripts/test-env.js
 */

// Script to test if environment variables are loaded correctly
console.log('Testing environment variables...');

// Load environment variables from .env.local if available
try {
  require('dotenv').config({ path: '.env.local' });
  console.log('Loaded environment variables from .env.local');
} catch (err) {
  console.log('Could not load dotenv, continuing with process.env variables');
}

// Essential NextAuth variables
const requiredVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'NEXT_PUBLIC_AWS_REGION'
];

// Check for required variables
const missingVars = [];
const loadedVars = [];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
    console.error(`❌ Missing: ${varName}`);
  } else {
    loadedVars.push(varName);
    // Log the variable name and first/last characters to verify it's loaded without exposing secrets
    const value = process.env[varName];
    const safeValue = varName.includes('SECRET') 
      ? `${value.substring(0, 3)}...${value.substring(value.length - 3)} (length: ${value.length})`
      : value;
    
    console.log(`✅ Loaded: ${varName} = ${safeValue}`);
  }
}

// Summary
console.log('\nEnvironment Variables Summary:');
console.log(`- Total variables checked: ${requiredVars.length}`);
console.log(`- Variables loaded: ${loadedVars.length}`);
console.log(`- Variables missing: ${missingVars.length}`);

if (missingVars.length > 0) {
  console.error('\n❌ Missing required environment variables. Please check your .env file.');
  console.error('Missing variables:', missingVars.join(', '));
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are loaded successfully!');
}

// Check if we're running in a Node.js environment or browser
console.log('\nRuntime environment:');
console.log(`- Environment: ${typeof window === 'undefined' ? 'Node.js' : 'Browser'}`);
console.log(`- Node.js version: ${process.version}`);

// Exit with success
process.exit(0); 