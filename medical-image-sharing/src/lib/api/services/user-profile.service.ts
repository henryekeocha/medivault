import { patientClient } from '../patientClient';
import { providerClient } from '../providerClient';
import { ApiResponse, User as ApiUser, UserPreferences as ApiUserPreferences } from '../types';
import { handleApiError } from '@/lib/api/error-handler';
import { logAudit } from '@/lib/audit-logger';
import type { AuditEventType } from '@/lib/audit-logger';
import { Role } from '@prisma/client';

// Define a new interface for the user profile that works with Next.js Auth
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  image?: string;
  emailVerified: boolean;  // Keep as boolean for UI purposes
  phoneNumber?: string;
  phoneVerified?: boolean;
  address?: string;
  birthdate?: string;
  gender?: string;
  mfaEnabled?: boolean;
  preferences?: ApiUserPreferences;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Service for managing user profile operations with Next.js Auth
 */
export class UserProfileService {
  private patientClient;
  private providerClient;
  private userRole: 'PATIENT' | 'PROVIDER' | null = null;
  private baseUrl = '/api/users/profile';

  constructor() {
    this.patientClient = patientClient;
    this.providerClient = providerClient;
  }

  setUserRole(role: 'PATIENT' | 'PROVIDER') {
    this.userRole = role;
  }

  private getClient() {
    if (!this.userRole) {
      throw new Error('User role not set. Call setUserRole first.');
    }
    return this.userRole === 'PATIENT' ? this.patientClient : this.providerClient;
  }

  /**
   * Fetch the current user's profile
   */
  public async getCurrentUserProfile(): Promise<UserProfile> {
    try {
      const response = await this.getClient().getUserProfile();
      
      logAudit('USER_PROFILE_FETCHED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
      return this.normalizeUserProfile(response.data);
    } catch (error) {
      logAudit('USER_PROFILE_FETCH_FAILED' as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: handleApiError(error).message
      });
      
      throw handleApiError(error);
    }
  }

  /**
   * Update the current user's profile
   */
  public async updateProfile(
    payload: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      // Convert UserProfile to ApiUser type for the client
      const { emailVerified, ...rest } = payload;
      const userPayload: Partial<ApiUser> = {
        ...rest,
        // Only include emailVerified if it's explicitly set
        ...(emailVerified !== undefined && {
          emailVerified: emailVerified ? new Date() : null
        })
      };

      const response = await this.getClient().updateUserProfile(userPayload);
      
      logAudit('USER_PROFILE_UPDATED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
      return this.normalizeUserProfile(response.data);
    } catch (error) {
      logAudit('USER_PROFILE_UPDATE_FAILED' as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: handleApiError(error).message
      });
      
      throw handleApiError(error);
    }
  }

  /**
   * Verify an attribute with the verification code
   */
  public async verifyAttribute(
    attributeName: 'email' | 'phone',
    code: string
  ): Promise<boolean> {
    try {
      const response = await this.getClient().verifyAttribute(attributeName, code);
      
      logAudit('USER_ATTRIBUTE_VERIFIED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString(),
        attributeName
      });
      
      return response.data.success;
    } catch (error) {
      logAudit('USER_ATTRIBUTE_VERIFICATION_FAILED' as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        attributeName,
        error: handleApiError(error).message
      });
      
      throw handleApiError(error);
    }
  }

  /**
   * Request a verification code for an attribute
   */
  public async requestVerification(type: 'email' | 'phone'): Promise<boolean> {
    try {
      const response = await this.getClient().requestVerification(type);
      
      logAudit('VERIFICATION_CODE_REQUESTED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString(),
        type
      });
      
      return response.data.success;
    } catch (error) {
      logAudit('VERIFICATION_CODE_REQUEST_FAILED' as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        type,
        error: handleApiError(error).message
      });
      
      throw handleApiError(error);
    }
  }

  /**
   * Upload a profile picture
   */
  public async uploadProfilePicture(file: File): Promise<string> {
    try {
      const response = await this.getClient().uploadProfilePicture(file);
      
      logAudit('PROFILE_PICTURE_UPLOADED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
      return response.data.user.image || '';
    } catch (error) {
      logAudit('PROFILE_PICTURE_UPLOAD_FAILED' as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: handleApiError(error).message
      });
      
      throw handleApiError(error);
    }
  }

  /**
   * Helper method to normalize user profile data
   */
  private normalizeUserProfile(data: any): UserProfile {
    const profile = {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      role: data.role || '',
      image: data.image,
      emailVerified: data.emailVerified instanceof Date,  // Convert Date to boolean
      phoneNumber: data.profile?.phone || '',
      phoneVerified: !!data.phoneVerified,
      address: data.profile?.location || '',
      birthdate: data.birthdate || '',
      gender: data.gender || '',
      mfaEnabled: !!data.mfaEnabled,
      preferences: data.preferences || {
        notifications: {
          email: true,
          sms: false
        },
        session: {
          persistLogin: true
        }
      },
      createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
    };
    
    return profile as UserProfile;
  }
}

export const userProfileService = new UserProfileService();