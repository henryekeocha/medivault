'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
  CircularProgress,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import type { Route } from 'next';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons';
import { useAuth } from '@/lib/clerk/use-auth';
import { useClerk } from '@clerk/nextjs';
import { Role } from '@prisma/client';
import { DEFAULT_ROUTES } from '@/config/routes';
import { SyncUserButton } from '@/components/auth/SyncUserButton';
import { useToast } from '@/contexts/ToastContext';

/**
 * Login Page using Next.js Auth
 * 
 * This page handles user authentication using Next Auth
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams?.get('message');
  const resetRequested = searchParams?.get('reset') === 'true';
  const { handleSignIn, isLoaded, isSignedIn, signOut, needsMFA, mfaStrategy, submitMfaCode } = useAuth();
  const clerk = useClerk();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationSuccess, setShowVerificationSuccess] = useState<boolean>(false);
  const toast = useToast();

  // Handle reset request once
  useEffect(() => {
    if (resetRequested && isLoaded) {
      const cleanupSessions = async () => {
        try {
          await signOut();
          // Remove the reset parameter without refreshing
          const url = new URL(window.location.href);
          url.searchParams.delete('reset');
          url.searchParams.delete('justRefreshed');
          window.history.replaceState({}, '', url.toString());
          
          // Clear any pending data
          localStorage.removeItem('pendingUserRole');
          localStorage.removeItem('pendingUserSpecialty');
          localStorage.removeItem('lastSessionCleanAttempt');
        } catch (error) {
          console.error('Error cleaning up sessions:', error);
        }
      };
      cleanupSessions();
    }
  }, [resetRequested, isLoaded, signOut]);

  // Check verification state and error parameters once on mount
  useEffect(() => {
    const messageParam = searchParams?.get('message');
    const errorParam = searchParams?.get('error');
    
    if (messageParam === 'verification_complete') {
      setShowVerificationSuccess(true);
      // Clean up verification data
      localStorage.removeItem('emailVerificationCompleted');
      localStorage.removeItem('verificationTimestamp');
      localStorage.removeItem('verificationStatus');
    }
    
    // Handle specific error cases
    if (errorParam === 'no_role_found') {
      setError('Your account does not have a valid role. Please contact support.');
    } else if (errorParam === 'role_error') {
      setError('There was an error retrieving your account role. Please try again or contact support.');
    }
  }, [searchParams]);

  // Handle automatic navigation when signed in
  useEffect(() => {
    if (!isLoaded) return;

    const handleSignedInState = async () => {
      console.log('Checking signed in state:', { 
        isSignedIn, 
        hasUser: !!clerk.user, 
        needsMFA,
        mfaStrategy 
      });
      
      // Don't redirect if 2FA is required
      if (needsMFA) {
        console.log('2FA required, staying on login page');
        return;
      }
      
      if (isSignedIn && clerk.user) {
        try {
          // Check if we have a valid session
          const user = await clerk.user;
          console.log('Current user data:', { 
            id: user?.id, 
            email: user?.emailAddresses[0]?.emailAddress,
            role: user?.publicMetadata?.role || user?.unsafeMetadata?.role,
            hasVerifiedEmail: user?.emailAddresses.some(email => email.verification?.status === 'verified')
          });
          
          if (!user) {
            console.log('No valid user data, signing out');
            await signOut();
            return;
          }

          // Sync user with database
          try {
            // Import the syncUser function dynamically to avoid bundling server code
            const { syncUser } = await import('@/lib/clerk/actions');
            const syncResult = await syncUser();
            
            if (syncResult) {
              console.log('User synced successfully with database, role:', syncResult.role);
            } else {
              console.warn('User sync with database failed');
            }
          } catch (syncError) {
            console.error('Error syncing user with database:', syncError);
            // Continue even if sync fails - the role might still be in metadata
          }

          // Get the role from metadata or localStorage
          let role: typeof Role[keyof typeof Role] | null = null;
          if (user.unsafeMetadata?.role) {
            role = user.unsafeMetadata.role as typeof Role[keyof typeof Role];
          } else if (user.publicMetadata?.role) {
            role = user.publicMetadata.role as typeof Role[keyof typeof Role];
          } else {
            const pendingRole = localStorage.getItem('pendingUserRole');
            if (pendingRole) {
              role = pendingRole as typeof Role[keyof typeof Role];
            }
          }

          // If we have a role, redirect to the appropriate dashboard
          if (role) {
            console.log('User has role:', role, 'Redirecting to:', DEFAULT_ROUTES[role]);
            router.push(DEFAULT_ROUTES[role] as Route);
          } else {
            console.log('No role found, signing out');
            await signOut();
          }
        } catch (error) {
          console.error('Navigation error:', error);
          await signOut();
        }
      }
    };

    handleSignedInState();
  }, [isLoaded, isSignedIn, clerk.user, router.push, toast, signOut, needsMFA]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Starting login process');
      
      // Handle regular sign in
      const currentEmail = email.trim();
      const currentPassword = password;
      
      if (!currentEmail || !currentPassword) {
        setError('Email and password are required');
        setIsSubmitting(false);
        return;
      }

      console.log('Attempting sign in with Clerk');
      const result = await handleSignIn(currentEmail, currentPassword);
      console.log('Sign in result:', result);
      
      if (result.success && result.redirectTo) {
        console.log('Sign in successful, redirecting to:', result.redirectTo);
        router.push(result.redirectTo as Route);
      } else if (result.needsMFA) {
        console.log('2FA required, redirecting to verification page');
        // Set a session cookie to maintain the authentication state
        document.cookie = `pendingAuth=true; path=/; max-age=900; SameSite=Strict`;
        // Redirect to 2FA verification page
        router.push('/auth/verify-2fa' as Route);
      } else {
        setError(result.error || 'Failed to sign in');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login' as Route);
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Failed to sign out');
    }
  };

  const handleSocialLoginSuccess = async () => {
    const result = await handleSignIn('', '');
    if (result.success && result.redirectTo) {
      window.location.href = result.redirectTo;
    }
  };

  const handleSocialLoginError = (error: string) => {
    setError(error);
  };

  if (!isLoaded) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (isSignedIn) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            You are already signed in
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSignOut}
            disabled={isSubmitting}
            sx={{ mt: 2 }}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Sign Out'}
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Sign In
        </Typography>
        
        {error && (
          <Alert severity={needsMFA ? "info" : "error"} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {showVerificationSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Your email has been verified successfully! Please sign in with your credentials.
          </Alert>
        )}

        {message === 'unauthorized' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You are not authorized to access this page. Please sign in to continue.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            disabled={needsMFA}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            disabled={needsMFA}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {needsMFA && (
            <>
              <Typography variant="body1" sx={{ mt: 2, mb: 1, fontWeight: 'medium' }}>
                Verification Required
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                {mfaStrategy === 'totp' 
                  ? 'Please enter the code from your authenticator app.'
                  : 'Please enter the verification code sent to your email.'}
              </Typography>
              <TextField
                fullWidth
                label={mfaStrategy === 'totp' ? 'Authenticator Code' : 'Verification Code'}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                margin="normal"
                required
                autoFocus
                placeholder="Enter verification code"
                inputProps={{
                  maxLength: 6,
                  inputMode: 'numeric',
                }}
              />
            </>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            sx={{ mt: 2 }}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>

          <div id="clerk-captcha" style={{ marginTop: '10px' }}></div>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              Don't have an account?{' '}
              <MuiLink
                component={Link}
                href="/auth/register"
                underline="hover"
              >
                Sign up
              </MuiLink>
            </Typography>
          </Box>
        </form>

        <Box sx={{ mt: 4, mb: 2 }}>
          <Divider>
            <Typography variant="body2" color="textSecondary">
              Having trouble?
            </Typography>
          </Divider>
          <SyncUserButton />
        </Box>

        <Divider sx={{ my: 3 }}>or</Divider>

        <SocialLoginButtons
          onSuccess={handleSocialLoginSuccess}
          onError={handleSocialLoginError}
        />
      </Paper>
    </Container>
  );
} 