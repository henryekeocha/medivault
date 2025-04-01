'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { TextField, Button, Box, Typography, Alert, CircularProgress, Link } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { trackLoginFlow, verifyAuthState, logAuthEvent } from '@/lib/utils/auth-debug';
import { routes } from '@/config/routes';
import type { Route } from 'next';
import { useSignIn } from '@clerk/nextjs';
import { useToast } from '@/contexts/ToastContext';

interface LoginFormInputs {
  email: string;
  password: string;
}

export const LoginForm: React.FC = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { error, handleError, clearError, withErrorHandling } = useErrorHandler({
    context: 'Login'
  });
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();

  // Redirect if already authenticated
  useEffect(() => {
    if (isLoaded && signIn?.status === 'complete') {
      trackLoginFlow('Already authenticated, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [isLoaded, signIn?.status, router]);

  const onSubmit = async (data: LoginFormInputs) => {
    withErrorHandling(async () => {
      setIsLoading(true);
      trackLoginFlow('Login attempt started', { email: data.email });
      
      try {
        if (!signIn) {
          throw new Error('Sign in not initialized');
        }

        const result = await signIn.create({
          identifier: data.email,
          password: data.password,
        });

        if (result?.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          setLoginSuccess(true);
          trackLoginFlow('Login successful');
          router.push('/dashboard');
        } else if (result?.status === 'needs_second_factor') {
          trackLoginFlow('2FA required');
          router.push('/auth/2fa' as Route);
        } else {
          throw new Error('Login failed');
        }
      } catch (error) {
        trackLoginFlow('Login failed', { error });
        handleError(error);
      } finally {
        setIsLoading(false);
      }
    });
  };

  if (!isLoaded) {
    return <LoadingState />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        autoComplete="email"
        autoFocus
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        })}
        error={!!errors.email}
        helperText={errors.email?.message}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        label="Password"
        type="password"
        id="password"
        autoComplete="current-password"
        {...register('password', {
          required: 'Password is required',
          minLength: {
            value: 8,
            message: 'Password must be at least 8 characters'
          }
        })}
        error={!!errors.password}
        helperText={errors.password?.message}
      />
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
      </Button>
      <Box sx={{ textAlign: 'center' }}>
        <Link href={routes.root.forgotPassword} variant="body2">
          Forgot password?
        </Link>
      </Box>
    </Box>
  );
};
