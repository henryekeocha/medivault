import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;  
    }
  }
}

declare module 'otplib' {
  export const authenticator: {
    generate: (secret: string) => string;
    verify: (token: string, secret: string) => boolean;
    generateSecret: () => string;
  };
}

// Extend process.env with our custom environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
      JWT_EXPIRES_IN: string;
      AWS_REGION: string;
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      AWS_BUCKET_NAME: string;
      SMTP_HOST: string;
      SMTP_PORT: string;
      SMTP_USER: string;
      SMTP_PASS: string;
      EMAIL_FROM: string;
    }
  }
}
