import { useSignIn, useSignUp, useClerk, useAuth as useClerkAuth } from "@clerk/nextjs";
import { Role } from '@prisma/client';
import { useState } from 'react';
import { SignInResource, EmailCodeAttempt, EmailCodeFactor, SessionVerificationResource, SignUpResource } from '@clerk/types';
import { DEFAULT_ROUTES } from '@/config/routes';

type MFAStrategy = 'phone_code' | 'totp' | 'backup_code' | 'email_code';

interface SignInResult {
  success: boolean;
  error?: string;
  needsMFA?: boolean;
  strategy?: MFAStrategy;
  redirectTo?: string;
}

interface SignUpResult {
  success: boolean;
  error?: string;
  needsVerification?: boolean;
  signUpId?: string;
}

export function useAuth() {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const clerk = useClerk();
  const { isLoaded: isAuthLoaded, isSignedIn } = useClerkAuth();
  const [needsMFA, setNeedsMFA] = useState(false);
  const [mfaStrategy, setMfaStrategy] = useState<MFAStrategy | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);

  // Simplified session cleanup function
  const ensureCleanSession = async (): Promise<boolean> => {
    if (!clerk || !isAuthLoaded) {
      return false;
    }

    try {
      // Only clean if we have an inconsistent state
      if (isSignedIn) {
        const user = await clerk.user;
        if (!user) {
          console.log('Detected inconsistent session state, cleaning up');
          
          // Store cleanup attempt timestamp
          if (typeof window !== 'undefined') {
            const lastCleanAttempt = localStorage.getItem('lastSessionCleanAttempt');
            const now = Date.now();
            
            // Only clean if last attempt was more than 30 seconds ago
            if (lastCleanAttempt && (now - parseInt(lastCleanAttempt)) < 30000) {
              console.log('Skipping session cleanup - too soon since last attempt');
              return false;
            }
            
            localStorage.setItem('lastSessionCleanAttempt', now.toString());
          }
          
          // Use Clerk's standard signOut
          await clerk.signOut();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error in session cleanup:', error);
      return false;
    }
  };

  const handleSignIn = async (email: string, password: string): Promise<SignInResult> => {
    try {
      console.log('Starting sign-in process...');
      
      if (!signIn) {
        console.error('SignIn not initialized');
        return {
          success: false,
          error: 'Authentication service not initialized'
        };
      }

      // Check if user is already signed in
      if (isSignedIn && clerk.user) {
        console.log('User already signed in, retrieving role');
        
        // Get the role from metadata
        const user = await clerk.user;
        let role: Role | null = null;
        
        // Try to get role from metadata
        if (user?.unsafeMetadata?.role) {
          role = user.unsafeMetadata.role as Role;
        } else if (user?.publicMetadata?.role) {
          role = user.publicMetadata.role as Role;
        }
        
        // If we have a role, return success
        if (role) {
          console.log('User already signed in with role:', role);
          return {
            success: true,
            redirectTo: DEFAULT_ROUTES[role]
          };
        }
      }

      // If we're already in the 2FA process, don't create a new sign-in attempt
      if (needsMFA) {
        console.log('Already in 2FA process, redirecting to verification page');
        return {
          success: false,
          needsMFA: true,
          strategy: mfaStrategy || 'email_code',
          error: 'Please enter the verification code sent to your email'
        };
      }

      // Attempt sign in with Clerk
      console.log('Creating new sign-in attempt');
      const result = await signIn.create({
        identifier: email,
        password,
      });

      console.log('Sign-in result:', result.status);
      console.log('First factors:', result.supportedFirstFactors);
      console.log('Second factors:', result.supportedSecondFactors);

      // If sign-in is already complete, we can just activate the session
      if (result.status === 'complete') {
        console.log('Sign-in complete, activating session');
        
        // Activate the session
        if (result.createdSessionId) {
          await setSignInActive({ session: result.createdSessionId });
          
          // Get user role
          const user = await clerk.user;
          let role: Role | null = null;
          
          if (user?.unsafeMetadata?.role) {
            role = user.unsafeMetadata.role as Role;
          } else if (user?.publicMetadata?.role) {
            role = user.publicMetadata.role as Role;
          }
          
          // If we have a role, return success
          if (role) {
            return {
              success: true,
              redirectTo: DEFAULT_ROUTES[role]
            };
          }
          
          // If no role, we need to sync with database to get it
          try {
            const { syncUser } = await import('@/lib/clerk/actions');
            const syncResult = await syncUser();
            
            if (syncResult && syncResult.role) {
              return {
                success: true,
                redirectTo: DEFAULT_ROUTES[syncResult.role as Role]
              };
            } else {
              // No role found, sign the user out
              await clerk.signOut();
              return {
                success: false,
                error: 'No role assigned to your account. Please contact support.'
              };
            }
          } catch (error) {
            console.error('Error syncing user:', error);
            // Error during sync, sign the user out
            await clerk.signOut();
            return {
              success: false,
              error: 'Error retrieving your account information. Please try again or contact support.'
            };
          }
        }
      }

      // Handle 2FA for users with email verification enabled
      if (result.status === 'needs_first_factor' || result.status === 'needs_second_factor') {
        try {
          let emailAddressId = null;
          let strategy: MFAStrategy = 'email_code';
          
          // For needs_second_factor - use the appropriate strategy
          if (result.status === 'needs_second_factor' && result.supportedSecondFactors) {
            const secondFactors = result.supportedSecondFactors;
            console.log('Available second factors:', secondFactors);
            
            // Use available second factor
            if (secondFactors.length > 0) {
              const emailFactor = secondFactors.find(f => f.strategy === 'email_code' as any);
              
              if (emailFactor) {
                strategy = 'email_code';
              } else {
                strategy = secondFactors[0].strategy as MFAStrategy;
              }
              
              console.log('Using second factor strategy:', strategy);
              
              // Prepare second factor
              await signIn.prepareSecondFactor({
                strategy: strategy as any
              });
              
              // Set MFA state
              setNeedsMFA(true);
              setMfaStrategy(strategy);
              
              // Store email for verification page
              if (typeof window !== 'undefined') {
                localStorage.setItem('pendingAuthEmail', email);
              }
              
              return {
                success: false,
                needsMFA: true,
                strategy,
                error: 'Please enter the verification code sent to your email'
              };
            }
          }
          
          // For needs_first_factor - find email address ID
          if (result.supportedFirstFactors && result.supportedFirstFactors.length > 0) {
            const emailFactors = result.supportedFirstFactors.filter(
              factor => factor.strategy === 'email_code'
            ) as EmailCodeFactor[];
            
            if (emailFactors && emailFactors.length > 0) {
              emailAddressId = emailFactors[0].emailAddressId;
              console.log('Found email address ID from first factors:', emailAddressId);
            }
          }
          
          // If no email address ID found, we can't do email verification
          if (!emailAddressId) {
            console.error('No email address ID found for first factor');
            return {
              success: false,
              error: 'Unable to find a valid email for verification'
            };
          }
          
          console.log('Preparing email verification with ID:', emailAddressId);
          
          // Prepare first factor email verification
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId
          });
          
          // Set MFA state
          setNeedsMFA(true);
          setMfaStrategy('email_code');
          
          // Store email for verification page
          if (typeof window !== 'undefined') {
            localStorage.setItem('pendingAuthEmail', email);
          }
          
          return {
            success: false,
            needsMFA: true,
            strategy: 'email_code',
            error: 'Please enter the verification code sent to your email'
          };
        } catch (error) {
          console.error('Error preparing verification:', error);
          return {
            success: false,
            error: 'Failed to prepare verification: ' + (error instanceof Error ? error.message : String(error))
          };
        }
      }

      console.log('Sign-in failed with status:', result.status);
      return {
        success: false,
        error: 'Authentication failed. Please check your credentials and try again.'
      };
    } catch (error) {
      console.error('Sign-in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  };

  const handleSignUp = async (email: string, password: string, firstName: string, lastName: string, role?: Role): Promise<SignUpResult> => {
    try {
      if (!isSignUpLoaded || !signUp || !clerk || !isAuthLoaded) {
        throw new Error('Clerk is not loaded');
      }
      
      // Check if user is already signed in - this handles the single session mode issue
      if (isSignedIn) {
        // Sign out first
        await clerk.signOut();
      }

      // Start a new sign-up attempt
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      console.log('Sign up result:', result);

      if (result.status === "complete") {
        // Set user role in Clerk metadata
        if (result.createdUserId) {
          const user = await clerk.user;
          if (user) {
            await user.update({
              unsafeMetadata: { role }
            });
            
            // Verify the role was set
            const updatedUser = await clerk.user;
            const userRole = updatedUser?.publicMetadata?.role as Role;
            if (!userRole) {
              throw new Error('Failed to set user role during sign up');
            }

            // Create user in our database
            try {
              const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  username: `${firstName}${lastName}`.toLowerCase(),
                  email,
                  role,
                  authId: result.createdUserId,
                }),
              });

              if (!response.ok) {
                throw new Error('Failed to create user in database');
              }
            } catch (error) {
              console.error('Error creating user in database:', error);
              // Don't throw here, as the Clerk user is already created
            }
          }
        }
        await setSignUpActive({ session: result.createdSessionId });
        return { success: true };
      } else if (result.status === "missing_requirements") {
        // Handle email verification
        const signUpResource = result as SignUpResource;
        
        // Prepare email verification
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code"
        });
        
        // Store the sign-up attempt ID for verification
        return { 
          success: false,
          error: "Please check your email for a verification code.",
          needsVerification: true,
          signUpId: signUpResource.id
        };
      }
      
      return { 
        success: false, 
        error: "Sign up failed. Please try again." 
      };
    } catch (error) {
      console.error("Sign up error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "An error occurred during sign up" 
      };
    }
  };

  const verifyEmail = async (code: string): Promise<SignUpResult> => {
    try {
      if (!isSignUpLoaded || !signUp) {
        throw new Error('Clerk is not loaded');
      }

      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        // Set the active session
        await setSignUpActive({ session: result.createdSessionId });
        return { success: true };
      } else if (result.status === "missing_requirements") {
        return { 
          success: false,
          error: "Verification code is invalid or has expired. Please try again.",
          needsVerification: true
        };
      }

      return { 
        success: false, 
        error: "Verification failed. Please try again." 
      };
    } catch (error) {
      console.error("Verification error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "An error occurred during verification" 
      };
    }
  };

  const signOut = async () => {
    try {
      if (!clerk) {
        throw new Error('Clerk is not loaded');
      }
      await clerk.signOut();
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "An error occurred during sign out" 
      };
    }
  };

  const submitMfaCode = async (code: string): Promise<SignInResult> => {
    try {
      console.log('Verifying MFA code:', { mfaStrategy, code });
      
      if (!signIn) {
        console.error('SignIn not initialized');
        return {
          success: false,
          error: 'Authentication service not initialized'
        };
      }
      
      // Check if user is already signed in
      if (isSignedIn && clerk.user) {
        console.log('User already signed in during verification attempt');
        
        // Get the role from metadata
        const user = await clerk.user;
        let role: Role | null = null;
        
        // Try to get role from metadata
        if (user?.unsafeMetadata?.role) {
          role = user.unsafeMetadata.role as Role;
        } else if (user?.publicMetadata?.role) {
          role = user.publicMetadata.role as Role;
        }
        
        // If we have a role, return success
        if (role) {
          console.log('User already has role:', role);
          
          // Reset MFA state
          setNeedsMFA(false);
          setMfaStrategy(null);
          
          return {
            success: true,
            redirectTo: DEFAULT_ROUTES[role]
          };
        }
      }
      
      // If we don't have a sign-in attempt in progress, create one
      // This handles cases where the page might be refreshed or session lost
      if (!signIn.status) {
        console.log('No sign-in attempt in progress, cannot verify code');
        return {
          success: false,
          error: 'Verification session expired. Please sign in again.'
        };
      }
      
      let result;
      
      try {
        // Try first factor verification
        console.log('Attempting first factor verification');
        result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code
        });
        console.log('First factor verification result:', result.status);
      } catch (firstFactorError) {
        console.log('First factor verification failed:', firstFactorError);
        
        try {
          // Try second factor verification
          console.log('Attempting second factor verification');
          result = await signIn.attemptSecondFactor({
            strategy: mfaStrategy as any,
            code
          });
          console.log('Second factor verification result:', result.status);
        } catch (secondFactorError) {
          console.error('Both verification methods failed:', secondFactorError);
          
          // Try to extract meaningful error message
          const errorMessage = 
            secondFactorError instanceof Error 
              ? secondFactorError.message
              : 'Verification code is invalid or has expired';
              
          // Check for specific error types
          if (errorMessage.includes('Attempted to access resource') || 
              errorMessage.includes('Unable to complete') ||
              errorMessage.includes('No sign_in')) {
            return {
              success: false,
              error: 'Your verification session has expired. Please sign in again.'
            };
          }
          
          return {
            success: false,
            error: errorMessage
          };
        }
      }
      
      if (!result || result.status !== 'complete') {
        console.error('Verification failed with status:', result?.status);
        return {
          success: false,
          error: 'Verification failed. Please try again with a new code.'
        };
      }
      
      console.log('MFA verification complete, setting active session');
      
      // Activate the session
      try {
        await setSignInActive({ session: result.createdSessionId });
      } catch (activateError) {
        console.error('Error activating session:', activateError);
        return {
          success: false,
          error: 'Error activating your session. Please try signing in again.'
        };
      }
      
      // Reset the MFA state
      setNeedsMFA(false);
      setMfaStrategy(null);
      
      // Sync user to ensure we have their data in our database
      try {
        const { syncUser } = await import('@/lib/clerk/actions');
        const syncResult = await syncUser();
        console.log('User sync result:', syncResult);
      } catch (syncError) {
        console.error('Error syncing user after MFA:', syncError);
      }
      
      // Get the user's role with multiple retry attempts
      const user = await clerk.user;
      console.log('User after verification:', {
        id: user?.id,
        metadata: user?.publicMetadata,
        unsafeMetadata: user?.unsafeMetadata
      });
      
      let role: Role | null = null;
      let retryCount = 0;
      
      // Try multiple sources for the role with retries
      while (!role && retryCount < 3) {
        // Try to get role from unsafe metadata first (most reliable)
        if (user?.unsafeMetadata?.role) {
          role = user.unsafeMetadata.role as Role;
          console.log('Role found in unsafeMetadata:', role);
        } 
        // Then try public metadata
        else if (user?.publicMetadata?.role) {
          role = user.publicMetadata.role as Role;
          console.log('Role found in publicMetadata:', role);
        } 
        // Then try to fetch from our database via API
        else {
          try {
            const token = await clerk.session?.getToken();
            if (token) {
              const response = await fetch('/api/users/me', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (response.ok) {
                const userData = await response.json();
                if (userData.role) {
                  role = userData.role as Role;
                  console.log('Role found in database:', role);
                  
                  // Update Clerk metadata with the role
                  await user?.update({
                    unsafeMetadata: { ...user.unsafeMetadata, role }
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error fetching user role from API:', error);
          }
        }
        
        // If still no role, wait briefly and retry
        if (!role) {
          retryCount++;
          console.log(`Role not found, retrying (${retryCount}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // If we still don't have a role, don't default to patient
      if (!role) {
        console.error('No role found after multiple attempts, signing user out');
        await clerk.signOut();
        return {
          success: false,
          error: 'No role assigned to your account. Please contact support.'
        };
      }
      
      console.log('Final user role determined:', role);
      
      // Store role in state
      setUserRole(role);
      
      // Clean up any temporary authentication state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pendingAuthEmail');
        document.cookie = 'pendingAuth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      
      return {
        success: true,
        redirectTo: DEFAULT_ROUTES[role]
      };
    } catch (error) {
      console.error('MFA verification error:', error);
      
      // More specific error handling
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      if (errorMessage.includes('sign_in') || errorMessage.includes('session')) {
        return {
          success: false,
          error: 'Your verification session has expired. Please sign in again.'
        };
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  // Method to explicitly sync user data with our database
  const syncUser = async (): Promise<boolean> => {
    if (!isAuthLoaded || !isSignedIn || !clerk) {
      console.error('Cannot sync user: not authenticated');
      return false;
    }

    try {
      const token = await clerk.session?.getToken();
      
      if (!token) {
        console.error('No auth token available for sync');
        return false;
      }
      
      const response = await fetch('/api/sync/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('User sync failed:', errorData);
        return false;
      }
      
      const data = await response.json();
      console.log('User data synchronized successfully:', data);
      return true;
    } catch (error) {
      console.error('Error syncing user data:', error);
      return false;
    }
  };

  return {
    handleSignIn,
    handleSignUp,
    verifyEmail,
    signOut,
    submitMfaCode,
    isLoaded: isSignInLoaded && isSignUpLoaded && isAuthLoaded,
    isSignedIn,
    needsMFA,
    mfaStrategy,
    userRole,
    syncUser
  };
} 