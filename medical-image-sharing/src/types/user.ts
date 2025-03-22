import { Role } from '@prisma/client';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: Role;
  image?: string;
  avatar?: string;
  created_at?: Date;
  updated_at?: Date;
  emailVerified?: boolean;
  phoneVerified?: boolean;
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
  role?: string;
  preferences?: string;
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