'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '@/lib/clerk/use-auth';

export default function AuthError() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const errorParam = searchParams?.get('error') || null;
    setErrorType(errorParam);
    setLoading(false);

    console.log('Auth error page loaded with params:', {
      error: errorParam,
      callbackUrl: searchParams?.get('callbackUrl'),
      isSignedIn
    });

    if (errorParam) {
      switch (errorParam) {
        case 'Signin':
        case 'OAuthSignin':
          setError('An error occurred while trying to sign in. Please try again.');
          break;
        case 'OAuthCallback':
          setError('An error occurred while processing the authentication callback. Please try again.');
          break;
        case 'OAuthCreateAccount':
          setError('Could not create a new account. The email might already be in use.');
          break;
        case 'EmailCreateAccount':
          setError('Could not create a new account. Please try again.');
          break;
        case 'Callback':
          setError('An error occurred during the authentication process. Please try again.');
          break;
        case 'OAuthAccountNotLinked':
          setError('This email is already associated with a different sign-in method. Please use your original sign-in method.');
          break;
        case 'EmailSignin':
          setError('The email verification link is invalid or has expired.');
          break;
        case 'CredentialsSignin':
          setError('Invalid email or password. Please check your credentials and try again.');
          break;
        case 'SessionRequired':
          setError('Please sign in to access this page.');
          break;
        default:
          setError('An unexpected authentication error occurred. Please try again.');
          break;
      }
    } else if (isSignedIn) {
      // If user is signed in but no error parameter, redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } else {
      // If not signed in and no error parameter, redirect to login
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    }
  }, [searchParams, router, isSignedIn]);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm" sx={{ pt: 8, pb: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 2,
        }}
      >
        <Typography component="h1" variant="h4" sx={{ mb: 2 }}>
          Authentication Error
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
            {error}
            {errorType && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Error code: {errorType}
              </Typography>
            )}
          </Alert>
        ) : (
          <Alert severity="info" sx={{ width: '100%', mb: 3 }}>
            {isSignedIn ? 'Redirecting to dashboard...' : 'Redirecting to login page...'}
          </Alert>
        )}

        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Link href="/auth/login" passHref>
            <Button variant="contained" color="primary">
              Back to Sign In
            </Button>
          </Link>
          <Link href="/" passHref>
            <Button variant="outlined">
              Go to Home
            </Button>
          </Link>
        </Box>
      </Paper>
    </Container>
  );
} 