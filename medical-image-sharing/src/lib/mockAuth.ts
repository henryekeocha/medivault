import { User, Role, ProviderSpecialty } from '@/lib/api/types';

// Mock users for testing different roles
export const mockUsers: Record<string, User> = {
  admin: {
    id: 'mock-admin-id',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN' as Role,
    isActive: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    backupCodes: [],
  },
  provider: {
    id: 'mock-provider-id',
    name: 'Provider User',
    email: 'provider@example.com',
    role: 'PROVIDER' as Role,
    specialty: 'RADIOLOGY' as ProviderSpecialty,
    isActive: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    backupCodes: [],
  },
  patient: {
    id: 'mock-patient-id',
    name: 'Patient User',
    email: 'patient@example.com',
    role: 'PATIENT' as Role,
    isActive: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    backupCodes: [],
  }
};

// Mock token for authentication
export const mockToken = 'mock-jwt-token';

// Helper function to get a mock user by role
export const getMockUserByRole = (role: Role): User => {
  switch (role) {
    case 'ADMIN':
      return mockUsers.admin;
    case 'PROVIDER':
      return mockUsers.provider;
    case 'PATIENT':
      return mockUsers.patient;
    default:
      return mockUsers.patient;
  }
}; 