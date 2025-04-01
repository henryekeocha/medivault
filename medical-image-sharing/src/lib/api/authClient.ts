'use client';

import { Role } from '@prisma/client';
import { RegisterRequest, LoginRequest, AuthResponse } from './types';

// Auth client for making API calls to auth endpoints
export const authClient = {
  // Register a new user
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Since we're using Clerk, and this is just a test users component,
      // we'll make a basic implementation that returns success
      console.log('Register request:', data);
      
      // In a real implementation, this would call the API
      return {
        status: 'success',
        data: {
          user: {
            id: 'mock-id',
            name: data.name,
            email: data.email,
            role: data.role,
            emailVerified: null,
            isActive: true,
            twoFactorEnabled: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      };
    } catch (error: any) {
      console.error('Register error:', error);
      return {
        status: 'error',
        error: {
          message: error?.message || 'Failed to register user',
          code: error?.code
        }
      };
    }
  },

  // Login a user
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('Login request:', data);
      
      // In a real implementation, this would call the API
      return {
        status: 'success',
        data: {
          user: {
            id: 'mock-id',
            name: 'Mock User',
            email: data.email,
            role: Role.PATIENT,
            emailVerified: null,
            isActive: true,
            twoFactorEnabled: false,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          token: 'mock-token'
        }
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        status: 'error',
        error: {
          message: error?.message || 'Failed to login',
          code: error?.code
        }
      };
    }
  },

  // Logout the current user
  async logout(): Promise<AuthResponse> {
    try {
      // In a real implementation, this would call the API
      return {
        status: 'success'
      };
    } catch (error: any) {
      console.error('Logout error:', error);
      return {
        status: 'error',
        error: {
          message: error?.message || 'Failed to logout',
          code: error?.code
        }
      };
    }
  }
};

export default authClient; 