import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';

interface MFAStatus {
  success: boolean;
  enabled: boolean;
  strategy?: string;
  error?: string;
}

interface MFASetupResult {
  success: boolean;
  qrCode?: string;
  backupCodes?: string[];
  error?: string;
}

interface MFAVerificationResult {
  success: boolean;
  error?: string;
}

/**
 * A service that handles authentication using Clerk - Client Side Version
 * This file contains client-side safe code and avoids server-only imports
 */
export class ClerkAuthService {
  /**
   * Check if the user is authenticated (client-side)
   * Note: This should be used with the useAuth hook in components
   */
  static isAuthenticated(isSignedIn?: boolean): boolean {
    if (typeof window === 'undefined') return false;
    return !!isSignedIn;
  }

  /**
   * Redirect based on user role - must be called inside a React component
   */
  static redirectBasedOnRole(
    isLoaded: boolean,
    isSignedIn: boolean | undefined,
    router: ReturnType<typeof useRouter>,
    redirectTo = "/auth/login"
  ) {
    if (isLoaded && !isSignedIn) {
      router.push(redirectTo as any);
    }
  }

  /**
   * Check if current route is allowed for the user's role - for client components
   */
  static isRouteAllowed(currentRole: Role | null, allowedRoles: Role[]): boolean {
    if (!currentRole) return false;
    return allowedRoles.includes(currentRole);
  }
  
  /**
   * Sign out the user - must be used in a React component
   */
  static async signOut(clerk: ReturnType<typeof useClerk>) {
    try {
      await clerk.signOut();
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  }

  /**
   * Get MFA status - placeholder for client component
   */
  static async getMFAStatus(): Promise<MFAStatus> {
    // This is a client-side placeholder
    // In client components, you should use Clerk's hooks to get this information
    if (typeof window === 'undefined') {
      return { success: false, enabled: false, error: 'Server side rendering' };
    }
    
    return { success: false, enabled: false, error: 'Not implemented in client version' };
  }

  /**
   * Setup MFA - placeholder for client component
   */
  static async setupMFA(strategy: string): Promise<MFASetupResult> {
    // This is a client-side placeholder
    // In client components, you should use Clerk's hooks to set this up
    if (typeof window === 'undefined') {
      return { success: false, error: 'Server side rendering' };
    }
    
    return { success: false, error: 'Not implemented in client version' };
  }

  /**
   * Verify MFA - placeholder for client component
   */
  static async verifyMFA(code: string): Promise<MFAVerificationResult> {
    // This is a client-side placeholder
    // In client components, you should use Clerk's hooks to verify
    if (typeof window === 'undefined') {
      return { success: false, error: 'Server side rendering' };
    }
    
    return { success: false, error: 'Not implemented in client version' };
  }

  /**
   * Disable MFA - placeholder for client component
   */
  static async disableMFA(strategy: string): Promise<MFAVerificationResult> {
    // This is a client-side placeholder
    // In client components, you should use Clerk's hooks to disable MFA
    if (typeof window === 'undefined') {
      return { success: false, error: 'Server side rendering' };
    }
    
    return { success: false, error: 'Not implemented in client version' };
  }
} 