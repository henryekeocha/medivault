'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { Box, Typography, CircularProgress, Alert, Link as MuiLink } from '@mui/material';
import { useCognitoAuthContext } from '@/contexts/CognitoAuthContext';
import { routes } from '@/config/routes';

/**
 * Social Login Callback Page
 * Handles the OAuth callback from social identity providers
 */
export default function SocialCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useCognitoAuthContext();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const success = searchParams.get('success');
        
        // Handle error from OAuth provider
        if (error) {
          setStatus('error');
          setError(`Authentication failed: ${error}`);
          return;
        }
        
        // Handle success/error from our backend
        if (success === 'false') {
          setStatus('error');
          setError('Authentication failed. Please try again.');
          return;
        }
        
        // If we have a code, exchange it for tokens
        if (code) {
          // In a real implementation, we would exchange the code for tokens
          // For now, we'll just redirect to the dashboard
          setStatus('success');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
          return;
        }
        
        // If we don't have a code or error, something went wrong
        setStatus('error');
        setError('Invalid callback. Missing authentication code.');
      } catch (error) {
        console.error('Error processing social login callback:', error);
        setStatus('error');
        setError('An unexpected error occurred. Please try again.');
      }
    };
    
    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
      router.push('/dashboard');
      return;
    }
    
    processCallback();
  }, [searchParams, router, isAuthenticated]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 3,
      }}
    >
      {status === 'loading' && (
        <>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Completing your sign-in...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please wait while we verify your credentials
          </Typography>
        </>
      )}
      
      {status === 'success' && (
        <Alert severity="success" sx={{ width: '100%', maxWidth: 500 }}>
          <Typography variant="body1">
            Sign-in successful! Redirecting to your dashboard...
          </Typography>
        </Alert>
      )}
      
      {status === 'error' && (
        <Alert severity="error" sx={{ width: '100%', maxWidth: 500 }}>
          <Typography variant="body1">
            {error || 'An error occurred during sign-in'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <MuiLink 
              component={Link}
              href={routes.root.login as Route}
              sx={{ color: 'inherit' }}
              underline="hover"
            >
              Return to login
            </MuiLink>
          </Typography>
        </Alert>
      )}
    </Box>
  );
} 