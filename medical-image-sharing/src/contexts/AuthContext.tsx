import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';
import { syncUser } from '@/lib/api/utils/syncUser';

interface AuthContextType {
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<boolean>;
  syncUserWithBackend: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerkAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [syncAttempted, setSyncAttempted] = useState(false);
  const [syncRetries, setSyncRetries] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const maxRetries = 3;

  // Attempt to sync the user with the backend when the Clerk user is loaded
  useEffect(() => {
    if (isLoaded && clerkUser && !syncAttempted) {
      const attemptSync = async () => {
        try {
          console.log(`Sync attempt ${syncRetries + 1}/${maxRetries + 1}`);
          await syncUserWithBackend();
          setSyncAttempted(true);
          setSyncRetries(0); // Reset retries on success
          console.log('User synchronized successfully with backend');
        } catch (error) {
          console.error(`Sync attempt ${syncRetries + 1} failed:`, error);
          
          if (syncRetries < maxRetries) {
            // Exponential backoff for retries
            const backoffTime = Math.min(1000 * Math.pow(2, syncRetries), 10000);
            console.log(`Will retry sync in ${backoffTime}ms`);
            
            // Schedule retry
            setTimeout(() => {
              setSyncRetries(prev => prev + 1);
              setSyncAttempted(false); // Reset so we can try again
            }, backoffTime);
          } else {
            console.error(`Failed to sync user after ${maxRetries + 1} attempts`);
            setSyncAttempted(true); // Stop trying after max retries
          }
        }
      };
      
      attemptSync();
    }
  }, [isLoaded, clerkUser, syncAttempted, syncRetries]);

  // Effect to sync user with backend on sign-in
  useEffect(() => {
    // Check if user is loaded from Clerk
    if (!isLoaded) return;

    if (isSignedIn && clerkUser) {
      console.log('AuthContext: User is signed in, syncing with backend');

      // Helper function to sync user with exponential backoff
      const syncUserWithBackend = async (attempt = 1, maxAttempts = 3) => {
        try {
          // Force sync to ensure user is up to date
          const result = await syncUser(clerkUser.id, clerkUser.publicMetadata.role as string || 'PATIENT');
          console.log('AuthContext: User sync result:', result);
          
          if (result.success) {
            console.log('AuthContext: User sync successful', result.user);
            setCurrentUser(result.user);
            setIsLoading(false);
          } else {
            console.warn(`AuthContext: User sync failed (attempt ${attempt}/${maxAttempts}):`, result.error);
            
            // Retry with exponential backoff
            if (attempt < maxAttempts) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
              console.log(`AuthContext: Retrying sync in ${delay}ms`);
              
              setTimeout(() => {
                syncUserWithBackend(attempt + 1, maxAttempts);
              }, delay);
            } else {
              console.error('AuthContext: All sync attempts failed, proceeding with limited functionality');
              setIsLoading(false);
            }
          }
        } catch (error) {
          console.error('AuthContext: Error syncing user with backend:', error);
          setIsLoading(false);
        }
      };

      syncUserWithBackend();
    } else {
      // No user signed in
      setCurrentUser(null);
      setIsLoading(false);
    }
  }, [isSignedIn, clerkUser, isLoaded]);

  useEffect(() => {
    setIsLoading(!isLoaded);
  }, [isLoaded]);

  const syncUserWithBackend = async () => {
    if (!clerkUser) return;
    
    try {
      console.log('Attempting to sync user with backend...');
      const role = clerkUser.publicMetadata.role as Role || Role.PATIENT;
      const result = await syncUser(clerkUser.id, role);
      
      if (result.success) {
        console.log('User sync successful:', result.user);
      } else {
        console.error('User sync failed:', result.error);
        // You might want to show an error to the user here
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing user:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Clerk handles the actual sign-in
      router.push('/auth/login' as any);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      router.push('/' as any);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) => {
    try {
      // Clerk handles the actual sign-up
      router.push('/sign-up' as any);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const value = {
    user: clerkUser ? {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0].emailAddress,
      name: clerkUser.fullName || '',
      role: (clerkUser.publicMetadata.role as Role) || Role.PATIENT,
    } : null,
    isAuthenticated: !!clerkUser,
    isLoading,
    login,
    logout,
    register,
    syncUserWithBackend,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 