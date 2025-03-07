/**
 * Test script for the HIPAA-compliant audit logger
 * 
 * This script simulates various audit events to test the audit logger functionality
 * For local development only - helps verify the logger works as expected
 * 
 * Usage:
 * npx ts-node scripts/test-audit-logger.ts
 */

import { logAudit } from '../src/lib/audit-logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Mock user IDs for testing
const mockUsers = {
  admin: 'usr_admin123',
  doctor: 'usr_doctor456',
  patient: 'usr_patient789'
};

// Mock patient IDs for testing
const mockPatients = {
  patient1: 'pat_12345',
  patient2: 'pat_67890'
};

// Mock image IDs for testing
const mockImages = {
  image1: 'img_dicom123',
  image2: 'img_dicom456'
};

/**
 * Generate a timestamp for the specified number of minutes ago
 */
function minutesAgo(minutes: number): string {
  const date = new Date(Date.now() - minutes * 60 * 1000);
  return date.toISOString();
}

/**
 * Simulate authentication events
 */
async function simulateAuthEvents() {
  console.log('Simulating authentication events...');
  
  // Successful login
  logAudit('USER_LOGGED_IN', {
    status: 'success',
    timestamp: minutesAgo(30),
    userId: mockUsers.doctor,
    ipAddress: '192.168.1.100',
    deviceId: 'dev_laptop1',
    browser: 'Chrome/96.0.4664.110'
  });
  
  // Failed login
  logAudit('LOGIN_FAILED', {
    status: 'error',
    timestamp: minutesAgo(25),
    attemptedUserId: mockUsers.admin,
    ipAddress: '203.0.113.45',
    reason: 'INVALID_PASSWORD',
    attemptCount: 2
  });
  
  // Successful token refresh
  logAudit('TOKEN_REFRESHED', {
    status: 'success',
    timestamp: minutesAgo(15),
    userId: mockUsers.doctor,
    deviceId: 'dev_laptop1'
  });
  
  // Logout
  logAudit('USER_LOGGED_OUT', {
    status: 'success',
    timestamp: minutesAgo(5),
    userId: mockUsers.doctor,
    deviceId: 'dev_laptop1',
    sessionDuration: 1500 // 25 minutes in seconds
  });
}

/**
 * Simulate MFA events
 */
async function simulateMfaEvents() {
  console.log('Simulating MFA events...');
  
  // MFA setup initiated
  logAudit('MFA_SETUP_INITIATED', {
    status: 'success',
    timestamp: minutesAgo(60),
    userId: mockUsers.admin,
    mfaType: 'TOTP',
    deviceId: 'dev_desktop1'
  });
  
  // MFA setup completed
  logAudit('MFA_SETUP_COMPLETED', {
    status: 'success',
    timestamp: minutesAgo(58),
    userId: mockUsers.admin,
    mfaType: 'TOTP',
    deviceId: 'dev_desktop1'
  });
  
  // MFA verification successful
  logAudit('MFA_VERIFIED', {
    status: 'success',
    timestamp: minutesAgo(40),
    userId: mockUsers.admin,
    mfaType: 'TOTP',
    deviceId: 'dev_desktop1'
  });
  
  // MFA verification failed
  logAudit('MFA_VERIFICATION_FAILED', {
    status: 'error',
    timestamp: minutesAgo(20),
    userId: mockUsers.doctor,
    mfaType: 'SMS',
    deviceId: 'dev_mobile1',
    reason: 'EXPIRED_CODE'
  });
}

/**
 * Simulate PHI access events
 */
async function simulatePhiAccessEvents() {
  console.log('Simulating PHI access events...');
  
  // DICOM metadata access
  logAudit('DICOM_METADATA_ACCESS', {
    status: 'success',
    timestamp: minutesAgo(45),
    userId: mockUsers.doctor,
    patientId: mockPatients.patient1,
    imageId: mockImages.image1,
    accessReason: 'TREATMENT'
  });
  
  // DICOM view access
  logAudit('DICOM_VIEW_ACCESS', {
    status: 'success',
    timestamp: minutesAgo(44),
    userId: mockUsers.doctor,
    patientId: mockPatients.patient1,
    imageId: mockImages.image1,
    accessReason: 'TREATMENT'
  });
  
  // PHI shared
  logAudit('PHI_SHARED', {
    status: 'success',
    timestamp: minutesAgo(35),
    userId: mockUsers.doctor,
    patientId: mockPatients.patient1,
    imageId: mockImages.image1,
    sharedWithId: 'usr_radiologist123',
    sharingMethod: 'INTERNAL_SHARING',
    accessReason: 'CONSULTATION'
  });
}

/**
 * Simulate security events
 */
async function simulateSecurityEvents() {
  console.log('Simulating security events...');
  
  // New device detected
  logAudit('USER_DEVICE_UPDATED', {
    status: 'success',
    timestamp: minutesAgo(120),
    userId: mockUsers.admin,
    deviceId: 'dev_mobile2',
    deviceType: 'iPhone',
    ipAddress: '198.51.100.234',
    action: 'ADDED'
  });
  
  // Device removed
  logAudit('USER_DEVICE_REMOVED', {
    status: 'success',
    timestamp: minutesAgo(10),
    userId: mockUsers.doctor,
    deviceId: 'dev_tablet1',
    ipAddress: '198.51.100.42'
  });
  
  // MFA disabled
  logAudit('MFA_DISABLED', {
    status: 'success',
    timestamp: minutesAgo(8),
    userId: mockUsers.patient,
    mfaType: 'SMS',
    ipAddress: '203.0.113.101'
  });
}

/**
 * Main test function
 */
async function runTests() {
  console.log('Starting audit logger tests...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  try {
    await simulateAuthEvents();
    await simulateMfaEvents();
    await simulatePhiAccessEvents();
    await simulateSecurityEvents();
    
    console.log('All audit log tests completed successfully!');
  } catch (error) {
    console.error('Error during audit log testing:', error);
  }
}

// Run the tests
runTests(); 