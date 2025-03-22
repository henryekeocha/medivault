import { apiClient } from '../client';
import { UserUpdatePayload, User, UserPreferences } from '@/types/user';
import { handleApiError } from '@/lib/api/error-handler';
import { logAudit } from '@/lib/audit-logger';
import type { AuditEventType } from '@/lib/audit-logger';

// Define a new interface for the user profile that works with Next.js Auth
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified?: boolean;
  address?: string;
  birthdate?: string;
  gender?: string;
  mfaEnabled?: boolean;
  preferences?: UserPreferences;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Service for managing user profile operations with Next.js Auth
 */
export class UserProfileService {
  private static instance: UserProfileService;
  private baseUrl = '/api/users/profile';

  private constructor() {}

  /**
   * Get singleton instance of UserProfileService
   */
  public static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService();
    }
    return UserProfileService.instance;
  }

  /**
   * Fetch the current user's profile
   */
  public async getCurrentUserProfile(): Promise<UserProfile> {
    try {
      const response = await apiClient.get<UserProfile>(this.baseUrl);
      
      logAudit('USER_PROFILE_FETCHED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
      return this.normalizeUserProfile(response);
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
      const response = await apiClient.patch<UserProfile>(this.baseUrl, payload);
      
      logAudit('USER_PROFILE_UPDATED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
      return this.normalizeUserProfile(response);
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
      const response = await apiClient.post<{ success: boolean }>(
        `${this.baseUrl}/verify`,
        {
          type: attributeName,
          code
        }
      );
      
      logAudit('USER_ATTRIBUTE_VERIFIED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString(),
        attributeName
      });
      
      return response.success;
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
      const response = await apiClient.post<{ success: boolean }>(
        `${this.baseUrl}/request-verification`,
        { type }
      );
      
      logAudit('VERIFICATION_CODE_REQUESTED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString(),
        type
      });
      
      return response.success;
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
      // First, get a presigned URL for the upload
      const urlResponse = await apiClient.get<{ uploadUrl: string, key: string }>(
        `${this.baseUrl}/image`
      );
      
      // Upload the file directly to the presigned URL
      await fetch(urlResponse.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      // Notify the backend about the uploaded file
      const response = await apiClient.post<{ user: User }>(
        `${this.baseUrl}/image`,
        { fileKey: urlResponse.key }
      );
      
      logAudit('PROFILE_PICTURE_UPLOADED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
      return response.user.image || '';
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
      emailVerified: !!data.emailVerified,
      phoneNumber: data.profile?.phone || '',
      phoneVerified: !!data.phoneVerified,
      address: data.profile?.location || '',
      // Convert other fields as needed
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