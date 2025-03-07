'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { TextField, Button, Box, Typography, Alert, CircularProgress, Link } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LoginRequest } from '@/lib/api/types';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { trackLoginFlow, verifyAuthState, logAuthEvent } from '@/lib/utils/auth-debug';
import { routes } from '@/config/routes';
import type { Route } from 'next';

interface LoginFormInputs extends LoginRequest {
  email: string;
  password: string;
}

export const LoginForm: React.FC = () => {
  const { login, error: authError, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { error, handleError, clearError, withErrorHandling } = useErrorHandler({
    context: 'Login'
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();

  // Show auth context errors if they exist
  useEffect(() => {
    if (authError) {
      trackLoginFlow('Error from AuthContext', authError);
      handleError(new Error(authError));
    }
  }, [authError, handleError]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      trackLoginFlow('Already authenticated, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginFormInputs) => {
    withErrorHandling(async () => {
      setIsLoading(true);
      trackLoginFlow('Login attempt started', { email: data.email });
      
      try {
        // Verify initial auth state
        trackLoginFlow('Pre-login state');
        verifyAuthState();
        
        const success = await login(data.email, data.password);
        
        if (success) {
          setLoginSuccess(true);
          trackLoginFlow('Login successful');
          logAuthEvent('Login', true, { email: data.email });
          
          // Verify final auth state after login
          trackLoginFlow('Post-login state');
          verifyAuthState();
          
          // AuthContext will handle the redirect
        } else {
          trackLoginFlow('Login failed', { email: data.email });
          logAuthEvent('Login', false, { email: data.email });
          throw new Error('Login failed. Please check your credentials and try again.');
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        maxWidth: 400,
        mx: 'auto',
        mt: 0,
        p: 3,
        borderRadius: 2,
        boxShadow: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom textAlign="center">
        Login to Your Account
      </Typography>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={clearError}
            >
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loginSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Login successful! Redirecting...
        </Alert>
      )}

      <TextField
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address',
          },
        })}
        label="Email"
        fullWidth
        margin="normal"
        error={!!errors.email}
        helperText={errors.email?.message}
        disabled={isLoading || loginSuccess}
        autoComplete="email"
        type="email"
      />

      <TextField
        {...register('password', {
          required: 'Password is required',
          minLength: {
            value: 6,
            message: 'Password must be at least 6 characters',
          },
        })}
        label="Password"
        type="password"
        fullWidth
        margin="normal"
        error={!!errors.password}
        helperText={errors.password?.message}
        disabled={isLoading || loginSuccess}
        autoComplete="current-password"
      />

      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        sx={{ mt: 3 }}
        disabled={isLoading || loginSuccess}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
            Logging in...
          </Box>
        ) : (
          'Login'
        )}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Don't have an account?{' '}
          <Link
            component="button"
            onClick={(e) => {
              e.preventDefault();
              router.push(routes.root.register as Route);
            }}
            sx={{ textDecoration: 'none' }}
          >
            Register here
          </Link>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <Link
            component="button"
            onClick={(e) => {
              e.preventDefault();
              router.push('/forgot-password' as any);
            }}
            sx={{ textDecoration: 'none' }}
          >
            Forgot your password?
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};
