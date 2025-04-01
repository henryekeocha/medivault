'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  Numbers as NumbersIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useAuth, useUser, useSignUp, useClerk } from '@clerk/nextjs';
import { routes } from '@/config/routes';
import type { Route } from 'next';
import { Role } from '@prisma/client';
import { createUserFromClerk } from '@/lib/clerk/create-user';
import axios from 'axios';

export default function VerifyEmailPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signUp } = useSignUp();
  const { signOut } = useClerk();
  
  // If user is already authenticated and email is verified, redirect to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn && user?.primaryEmailAddress?.verification?.status === 'verified') {
      if (user?.publicMetadata?.role) {
        const role = user.publicMetadata.role as Role;
        switch (role) {
          case Role.PATIENT:
            router.push(routes.patient.dashboard as Route);
            break;
          case Role.PROVIDER:
            router.push(routes.provider.dashboard as Route);
            break;
          default:
            router.push('/dashboard');
        }
      } else {
        router.push('/dashboard');
      }
    }
  }, [isLoaded, isSignedIn, user, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code) {
      setError('Verification code is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (!signUp) {
        throw new Error('Sign up session not found. Please try registering again.');
      }

      // Clear any potentially stale sessions before verification
      if (isSignedIn) {
        console.log('User is already signed in before verification, attempting to refresh session');
        try {
          await router.push(`${routes.root.login as Route}?message=verification_complete`);
          return;
        } catch (refreshError) {
          console.error('Error refreshing session:', refreshError);
        }
      }

      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        console.log('Verification complete, showing success message');
        setSuccess(true);
        
        try {
          // Synchronize the user with our database
          const pendingRole = localStorage.getItem('pendingUserRole');
          const pendingSpecialty = localStorage.getItem('pendingUserSpecialty');
          const userId = result.createdUserId;
          
          if (userId) {
            console.log('Attempting to sync user after verification:', userId);
            try {
              // Try to sync using our utility function
              await axios.post(`/api/auth/sync/${userId}`, {
                role: pendingRole || 'PATIENT',
                specialty: pendingSpecialty || undefined
              });
              console.log('User sync successful after verification');
              localStorage.setItem('userSyncStatus', 'success');
            } catch (syncError) {
              console.error('Error syncing user after verification:', syncError);
              localStorage.setItem('userSyncStatus', 'failed');
              // We'll still continue with the flow despite sync failure
            }
          }

          // Clear any existing session to prevent "already signed in" errors
          console.log('Attempting to clear session after verification');
          try {
            if (signOut) {
              await signOut();
              console.log('Session cleared successfully after verification');
            }
          } catch (signOutError) {
            console.warn('Non-critical error clearing session:', signOutError);
            // Continue regardless - this is just to clean up
          }
          
          // Clear clerk browser storage to ensure a clean state
          localStorage.removeItem('clerk-db-auth');
          
          // When a user verifies their email, they don't have a full account yet
          // We should redirect them to login page to complete the flow
          setTimeout(() => {
            console.log('Redirecting to login page after verification');
            // Store verification state in localStorage to help with debugging
            localStorage.setItem('emailVerificationCompleted', 'true');
            localStorage.setItem('verificationTimestamp', Date.now().toString());
            localStorage.setItem('verificationStatus', 'complete');
            
            // Check if we have a pending role - keep it for login
            const pendingRole = localStorage.getItem('pendingUserRole');
            if (pendingRole) {
              console.log('Verification complete with pending role:', pendingRole);
            }
            
            // Redirect to login with special parameter to indicate verification is complete
            // Force page reload to clear any lingering state
            window.location.href = `${routes.root.login}?message=verification_complete&reset=true`;
          }, 2000);
        } catch (error) {
          console.error('Error during post-verification cleanup:', error);
          // Still redirect to login
          setTimeout(() => {
            router.push(`${routes.root.login as Route}?message=verification_complete`);
          }, 2000);
        }
      } else if (result.status === "missing_requirements") {
        // Handle the case where verification is successful but more steps are needed
        console.log('Verification successful but additional steps required');
        setSuccess(true);
        
        // Redirect to login page with a success message
        setTimeout(() => {
          console.log('Redirecting to login page for additional requirements');
          // Store verification state in localStorage to help with debugging
          localStorage.setItem('emailVerificationCompleted', 'true');
          localStorage.setItem('verificationTimestamp', Date.now().toString());
          localStorage.setItem('verificationStatus', 'missing_requirements');
          
          router.push(`${routes.root.login as Route}?message=verification_complete`);
        }, 2000);
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Email verification error:', err);
      
      // Handle common verification errors
      if (err.message.includes('code') || err.message.includes('token')) {
        setError('Invalid verification code. Please try again.');
      } else if (err.message.includes('expired')) {
        setError('Verification code has expired. Please request a new one.');
      } else if (err.message.includes('session')) {
        setError('Verification session expired. Please try registering again.');
      } else {
        setError('Failed to verify email. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleResendCode = async () => {
    if (!signUp) {
      setError('Sign up session not found. Please try registering again.');
      return;
    }
    
    setIsResending(true);
    setError(null);
    setResendSuccess(false);
    
    try {
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code"
      });
      
      setResendSuccess(true);
      
      // Clear the resend success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Resend verification code error:', err);
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };
  
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
          Medical Image Sharing
        </Typography>
        
        <Typography variant="h5" align="center" gutterBottom sx={{ mb: 4 }}>
          Verify Your Email
        </Typography>
        
        {(error) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your email has been successfully verified! Redirecting you to sign in...
          </Alert>
        )}
        
        {resendSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            A new verification code has been sent to your email address.
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="body1" paragraph>
            Please enter the verification code that was sent to your email address.
          </Typography>
          
          <TextField
            fullWidth
            label="Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={!!error}
            disabled={isSubmitting || success}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <NumbersIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />
          
          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={isSubmitting || success}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
            sx={{ mb: 3 }}
          >
            {isSubmitting ? 'Verifying...' : 'Verify Email'}
          </Button>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" paragraph>
              Didn't receive a verification code?
            </Typography>
            
            <Button
              variant="outlined"
              onClick={handleResendCode}
              disabled={isResending || isSubmitting || success}
              startIcon={isResending ? <CircularProgress size={16} /> : <SendIcon />}
              sx={{ mb: 3 }}
            >
              {isResending ? 'Sending...' : 'Resend Code'}
            </Button>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" sx={{ mt: 2 }}>
                Already verified?{' '}
                <MuiLink 
                  component={Link}
                  href={routes.root.login as Route}
                  underline="hover"
                >
                  Sign In
                </MuiLink>
              </Typography>
              
              <Typography variant="body2" sx={{ mt: 1 }}>
                <MuiLink 
                  component={Link}
                  href="/auth/register"
                  underline="hover"
                >
                  Need to create an account?
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
} 