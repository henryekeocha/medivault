import { apiClient } from '../client';
import { CognitoUserAttributes, UserUpdatePayload } from '@/types/user';
import { handleApiError } from '@/lib/api/error-handler';
import { logAudit } from '@/lib/audit-logger';
import type { AuditEventType } from '@/lib/audit-logger';

/**
 * Service for managing user profile operations
 */
export class UserProfileService {
  private static instance: UserProfileService;
  private baseUrl = '/auth/cognito/user';

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
   * Fetch the current user's attributes from Cognito
   */
  public async getCurrentUserAttributes(): Promise<CognitoUserAttributes> {
    try {
      const response = await apiClient.get<{ attributes: CognitoUserAttributes }>(this.baseUrl);
      
      logAudit('USER_PROFILE_FETCHED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
      return response.attributes || {};
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
   * Update the current user's attributes in Cognito
   */
  public async updateUserAttributes(
    payload: UserUpdatePayload
  ): Promise<CognitoUserAttributes> {
    try {
      const response = await apiClient.put<{ attributes: CognitoUserAttributes }>(this.baseUrl, {
        attributes: this.formatAttributesForCognito(payload)
      });
      
      logAudit('USER_PROFILE_UPDATED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString()
      });
      
      return response.attributes || {};
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
    attributeName: string,
    code: string
  ): Promise<boolean> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        `${this.baseUrl}/verify-attribute`,
        {
          attributeName,
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
  public async requestVerificationCode(attributeName: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        `${this.baseUrl}/request-verification`,
        { attributeName }
      );
      
      logAudit('VERIFICATION_CODE_REQUESTED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString(),
        attributeName
      });
      
      return response.success;
    } catch (error) {
      logAudit('VERIFICATION_CODE_REQUEST_FAILED' as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        attributeName,
        error: handleApiError(error).message
      });
      
      throw handleApiError(error);
    }
  }

  /**
   * Format user update payload to Cognito attribute format
   */
  private formatAttributesForCognito(payload: UserUpdatePayload): Record<string, string> {
    const attributeMap: Record<string, string> = {};
    
    // Map fields from our payload to Cognito attribute names
    if (payload.name) attributeMap['name'] = payload.name;
    if (payload.givenName) attributeMap['given_name'] = payload.givenName;
    if (payload.familyName) attributeMap['family_name'] = payload.familyName;
    if (payload.email) attributeMap['email'] = payload.email;
    if (payload.phoneNumber) attributeMap['phone_number'] = payload.phoneNumber;
    if (payload.address) attributeMap['address'] = payload.address;
    if (payload.birthdate) attributeMap['birthdate'] = payload.birthdate;
    if (payload.gender) attributeMap['gender'] = payload.gender;
    if (payload.picture) attributeMap['picture'] = payload.picture;
    if (payload.custom_preferences) attributeMap['custom:preferences'] = payload.custom_preferences;
    
    return attributeMap;
  }
}