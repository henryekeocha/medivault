import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a secure 256-bit (32-byte) key
const key = crypto.randomBytes(32);

// Convert to hex string for storage
const keyHex = key.toString('hex');

// Read existing .env file
const envPath = path.join(__dirname, '..', '.env');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.log('No existing .env file found, creating new one');
}

// Replace or add ENCRYPTION_KEY
const envLines = envContent.split('\n');
let keyFound = false;

for (let i = 0; i < envLines.length; i++) {
  if (envLines[i].startsWith('ENCRYPTION_KEY=')) {
    envLines[i] = `ENCRYPTION_KEY=${keyHex}`;
    keyFound = true;
    break;
  }
}

if (!keyFound) {
  envLines.push(`ENCRYPTION_KEY=${keyHex}`);
}

// Write back to .env file
fs.writeFileSync(envPath, envLines.join('\n'));

console.log('Encryption key generated and saved to .env file');
console.log('Key (hex):', keyHex); 