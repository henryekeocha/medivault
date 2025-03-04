export enum UserRole {
  USER = 'user',
  ADMIN = 'ADMIN',
  PROVIDER = 'PROVIDER',
  PATIENT = 'PATIENT'
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

// Import instead of re-exporting to avoid name clashes
import * as AuthTypes from './auth.js';
import * as ModelTypes from './models.js';
import * as EnumTypes from './enums.js';

// Export namespaced types to avoid name clashes
export { AuthTypes, ModelTypes, EnumTypes };

// Override this with our proper AuthUser from middleware
import { AuthUser } from '../middleware/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      rawBody?: string;
    }
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
      JWT_EXPIRES_IN: string;
      REFRESH_TOKEN_SECRET: string;
      REFRESH_TOKEN_EXPIRES_IN: string;
      AWS_REGION: string;
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      AWS_BUCKET_NAME: string;
      SMTP_HOST: string;
      SMTP_PORT: string;
      SMTP_USER: string;
      SMTP_PASS: string;
      EMAIL_FROM: string;
      CORS_ORIGIN: string;
      RATE_LIMIT_WINDOW: string;
      RATE_LIMIT_MAX_REQUESTS: string;
      SESSION_SECRET: string;
      MAX_FILE_SIZE: string;
      STORAGE_PATH: string;
      REDIS_URL: string;
      ADMIN_EMAIL: string;
      ADMIN_PASSWORD: string;
    }
  }
} 