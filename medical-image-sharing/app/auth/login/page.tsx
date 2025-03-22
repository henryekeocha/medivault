'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Divider,
  Alert,
  CircularProgress,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from 'next-auth/react';
import { routes, DEFAULT_ROUTES } from '@/config/routes';

/**
 * Login Page using Next.js Auth
 * 
 * This page handles user authentication using Next Auth
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, error: authError } = useAuth();
  const theme = useTheme();
  
  // Get the callbackUrl from the query parameters
  const callbackUrl = searchParams?.get('callbackUrl') || routes.root.home;
  
  // Combine errors from all contexts and local state
  const error = localError || (authError ? authError.toString() : null);

  // Form handler for login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }
    
    setIsSubmitting(true);
    setLocalError(null);
    
    try {
      console.log('Attempting to sign in with credentials:', { 
        email, 
        callbackUrl
      });
      
      // Sign in with Next Auth
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      
      console.log('Sign in result:', result);
      
      if (result?.error) {
        console.error('Sign in error:', result.error);
        
        if (result.error.includes('fetch failed')) {
          setLocalError('Could not connect to the authentication server. Please try again later.');
        } else if (result.error.includes('CredentialsSignin')) {
          setLocalError('Invalid email or password. Please check your credentials and try again.');
        } else {
          setLocalError(result.error);
        }
        return;
      }
      
      if (result?.ok) {
        // Get the session to determine the user's role for proper redirection
        try {
          // Fetch session from the server - allow a short delay for session to be established
          setTimeout(async () => {
            try {
              const sessionResponse = await fetch('/api/auth/session');
              const session = await sessionResponse.json();
              
              if (session?.user?.role) {
                const userRole = session.user.role;
                console.log('User authenticated with role:', userRole);
                
                // Get the appropriate dashboard URL based on the role
                let dashboardUrl = '/dashboard';
                
                if (userRole === 'ADMIN') {
                  dashboardUrl = '/admin/dashboard';
                } else if (userRole === 'PROVIDER') {
                  dashboardUrl = '/provider/dashboard';
                } else if (userRole === 'PATIENT') {
                  dashboardUrl = '/patient/dashboard';
                }
                
                console.log('Redirecting to dashboard:', dashboardUrl);
                window.location.href = dashboardUrl;
              } else {
                // Fallback to the callback URL if role is not available
                console.log('Role not found in session, redirecting to:', callbackUrl);
                window.location.href = callbackUrl as string;
              }
            } catch (error) {
              console.error('Error fetching session in callback:', error);
              // Fallback to the callback URL if there's an error
              window.location.href = callbackUrl as string;
            }
          }, 500); // Short delay to ensure session is established
        } catch (error) {
          console.error('Error fetching session:', error);
          // Fallback to the callback URL if there's an error
          console.log('Fallback redirect to:', callbackUrl);
          window.location.href = callbackUrl as string;
        }
      } else {
        console.error('Sign in failed but no error was returned');
        setLocalError('Authentication failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setLocalError(error.message || 'An error occurred during login');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          Sign In
        </Typography>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ width: '100%', mb: 2 }}
          >
            {error}
          </Alert>
        )}
        
        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ width: '100%', mt: 1 }}
        >
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              ),
            }}
            disabled={isSubmitting}
          />
          
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            disabled={isSubmitting}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3, mb: 2, py: 1.2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Sign In'
            )}
          </Button>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, mb: 2 }}>
            <Link href="/auth/forgot-password" passHref legacyBehavior>
              <MuiLink variant="body2" component="span">
                Forgot password?
              </MuiLink>
            </Link>
            <Link href="/auth/register" passHref legacyBehavior>
              <MuiLink variant="body2" component="span">
                {"Don't have an account? Sign Up"}
              </MuiLink>
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
} 