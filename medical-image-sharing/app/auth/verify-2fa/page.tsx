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
  InputAdornment,
  IconButton,
  Link,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { useAuth } from '@/lib/clerk/use-auth';
import { useToast } from '@/contexts/ToastContext';
import type { Route } from 'next';

export default function Verify2FAPage() {
  const router = useRouter();
  const { submitMfaCode, needsMFA, mfaStrategy, isLoaded, isSignedIn } = useAuth();
  const toast = useToast();
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'pending' | 'error' | 'verified'>('loading');

  // Get email from local storage if available and check auth state
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {
      // Check for pending authentication
      const hasPendingAuth = document.cookie.includes('pendingAuth=true');
      const storedEmail = localStorage.getItem('pendingAuthEmail');
      
      console.log('2FA Page - Auth state:', { 
        hasPendingAuth, 
        storedEmail, 
        needsMFA, 
        isLoaded,
        isSignedIn
      });
      
      if (storedEmail) {
        setEmail(storedEmail);
      }
      
      // Set auth state based on conditions
      if (needsMFA) {
        setAuthState('pending');
      } else if (isSignedIn) {
        setAuthState('verified');
        // If already signed in, redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard' as Route);
        }, 1500);
      } else if (!hasPendingAuth && !needsMFA) {
        setAuthState('error');
        // If no pending auth or MFA needed, redirect to login after a delay
        setTimeout(() => {
          console.log('No 2FA pending, redirecting to login');
          router.push('/auth/login' as Route);
        }, 2000);
      } else {
        setAuthState('pending');
      }
    }
  }, [needsMFA, isLoaded, isSignedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Submitting verification code:', verificationCode);
      const result = await submitMfaCode(verificationCode);
      console.log('Verification result:', result);
      
      if (result.success && result.redirectTo) {
        setAuthState('verified');
        toast.showSuccess('Verification successful');
        router.push(result.redirectTo as Route);
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    try {
      // Clear existing error
      setError(null);
      
      // Clear pending auth state
      document.cookie = 'pendingAuth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      localStorage.removeItem('pendingAuthEmail');
      
      // Redirect to login page to restart the process
      toast.showInfo('Please sign in again to receive a new code');
      router.push('/auth/login' as Route);
    } catch (error) {
      console.error('Error resending code:', error);
      setError('Failed to resend verification code');
    }
  };

  if (!isLoaded || authState === 'loading') {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading authentication state...
        </Typography>
      </Container>
    );
  }

  if (authState === 'verified') {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom color="primary">
            Verification Successful
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            You have been successfully authenticated. Redirecting to dashboard...
          </Typography>
          <CircularProgress size={24} />
        </Paper>
      </Container>
    );
  }

  if (authState === 'error') {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom color="error">
            Verification Error
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            There is no pending verification process. Redirecting to login page...
          </Typography>
          <CircularProgress size={24} />
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Two-Factor Authentication
        </Typography>

        <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
          {email ? 
            `Please enter the verification code sent to ${email}` : 
            'Please enter the verification code sent to your email'
          }
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>
          For additional security, we require a verification code to complete your sign-in process.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Verification Code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            margin="normal"
            required
            autoFocus
            placeholder="Enter 6-digit code"
            inputProps={{
              maxLength: 6,
              inputMode: 'numeric',
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            sx={{ mt: 2 }}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Verify Code'}
          </Button>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link
              component="button"
              variant="body2"
              onClick={handleResendCode}
              sx={{ textDecoration: 'none', cursor: 'pointer' }}
            >
              Didn't receive a code? Try again
            </Link>
          </Box>
        </form>
      </Paper>
    </Container>
  );
} 