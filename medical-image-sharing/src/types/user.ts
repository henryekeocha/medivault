import { Role } from '@prisma/client';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: Role;
  avatar?: string;
  created_at?: Date;
  updated_at?: Date;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

// Cognito user attributes interface
export interface CognitoUserAttributes {
  sub?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  phone_number?: string;
  phone_number_verified?: string;
  address?: string;
  birthdate?: string;
  gender?: string;
  custom_role?: string;
  custom_preferences?: string;
  picture?: string;
  updated_at?: string;
  [key: string]: string | undefined;
}

export interface UserUpdatePayload {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  birthdate?: string;
  gender?: string;
  givenName?: string;
  familyName?: string;
  custom_role?: string;
  custom_preferences?: string;
  picture?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  language?: string;
  timezone?: string;
  [key: string]: any;
} 