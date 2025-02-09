export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  PROVIDER = 'provider',
  PATIENT = 'patient'
}

export interface JWTPayload {
  id: number;
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  token: string;
  expiresIn: string | number;
} 