import { Role } from '@prisma/client';

interface ClerkSession {
  getToken(): Promise<string>;
}

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: Array<{
    id: string;
    emailAddress: string;
    verification: {
      status: string;
    };
  }>;
  primaryEmailAddressId: string | null;
  publicMetadata: {
    role?: Role;
    [key: string]: any;
  };
  update(params: {
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    primaryEmailAddressId?: string | null;
    primaryPhoneNumberId?: string | null;
    primaryWeb3WalletId?: string | null;
    unsafeMetadata?: Record<string, any>;
    publicMetadata?: {
      role?: Role;
      [key: string]: any;
    };
  }): Promise<ClerkUser>;
}

interface Clerk {
  session: ClerkSession;
  user: ClerkUser | null;
  signOut(): Promise<void>;
}

declare global {
  interface Window {
    Clerk?: Clerk;
  }
}

export {}; 