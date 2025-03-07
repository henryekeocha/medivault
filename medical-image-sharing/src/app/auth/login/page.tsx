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
import { signIn, resendSignUpCode } from '@aws-amplify/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useCognitoAuthContext } from '@/contexts/CognitoAuthContext';
import VerifyMFA from '@/components/auth/MFA/VerifyMFA';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons';
import { routes } from '@/config/routes';

/**
 * Unified Login Page
 * 
 * This page handles both standard authentication via the AuthContext
 * and Cognito-specific authentication. It combines the functionality
 * that was previously split between the login and cognito-login pages.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [challengeName, setChallengeName] = useState<string | null>(null);
  const [cognitoUser, setCognitoUser] = useState<any>(null);
  const [unconfirmedUser, setUnconfirmedUser] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, error: authError } = useAuth();
  const { signIn: cognitoSignIn, error: cognitoError, isLoading: isCognitoLoading } = useCognitoAuthContext();
  const theme = useTheme();
  
  // Combine errors from all contexts and local state
  const error = localError || 
    (authError ? authError.toString() : null) || 
    (cognitoError ? cognitoError.toString() : null);
  
  // Check if direct Cognito login is requested via query param
  const useCognitoDirectLogin = searchParams?.get('from') === 'cognito';

  // Combined form handler that chooses the appropriate login method
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use direct Cognito login if specifically requested
    if (useCognitoDirectLogin) {
      await handleDirectCognitoLogin(e);
    } else {
      await handleCognitoLogin(e);
    }
  };
  
  const handleCognitoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }
    
    setIsSubmitting(true);
    setLocalError(null);
    
    try {
      // Attempt to sign in with Cognito
      const { isSignedIn, nextStep } = await signIn({ username: email, password });
      
      // Check if MFA is required
      if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE' || nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
        // User needs to provide an MFA code
        setMfaRequired(true);
        setChallengeName(nextStep.signInStep);
        setCognitoUser(nextStep);
      } else {
        // No MFA required, proceed with login
        handleLoginSuccess(isSignedIn);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle specific Cognito errors
      switch (err.code) {
        case 'UserNotConfirmedException':
          setUnconfirmedUser(true);
          setLocalError('Your account is not verified. Please verify your email address.');
          break;
        case 'NotAuthorizedException':
          setLocalError('Incorrect username or password');
          break;
        case 'UserNotFoundException':
          setLocalError('Incorrect username or password');
          break;
        case 'PasswordResetRequiredException':
          setLocalError('Password reset required. Please reset your password.');
          // Redirect to reset password page
          setTimeout(() => {
            router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
          }, 2000);
          break;
        default:
          setLocalError(err.message || 'An error occurred during login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleVerifyMFA = (verifiedUser: any) => {
    // MFA verification successful, proceed with login
    handleLoginSuccess(verifiedUser);
  };
  
  const handleMFAError = (errorMessage: string) => {
    setLocalError(errorMessage);
    setMfaRequired(false);
    setCognitoUser(null);
    setChallengeName(null);
  };
  
  const handleLoginSuccess = (user: any) => {
    setIsSubmitting(false);
    setLocalError(null);
    
    // Get redirect path from query params, or default to dashboard
    const redirectPath = searchParams?.get('redirect') || '/dashboard';
    
    // Navigate to the redirect path
    router.push(redirectPath as Route);
  };
  
  const handleResendVerification = async () => {
    if (!email) {
      setLocalError('Please enter your email address');
      return;
    }
    
    setIsSubmitting(true);
    setLocalError(null);
    
    try {
      await resendSignUpCode({ username: email });
      setLocalError(null);
      // Redirect to verification page
      router.push(`${routes.root.verifyEmail}?email=${encodeURIComponent(email)}` as Route);
    } catch (err: any) {
      console.error('Resend verification error:', err);
      setLocalError(err.message || 'Failed to resend verification email');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  /**
   * Handle direct Cognito login (for users coming from former cognito-login page)
   */
  const handleDirectCognitoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }
    
    setIsSubmitting(true);
    setLocalError(null);
    
    try {
      // Sign in with Cognito directly
      const result = await cognitoSignIn(email, password);
      
      // Check if MFA is required
      if (result.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
        // Redirect to MFA verification page
        router.push(`/auth/cognito-mfa?email=${encodeURIComponent(email)}` as Route);
        return;
      }
      
      // Redirect to dashboard on success
      router.push('/dashboard' as Route);
    } catch (error: any) {
      console.error('Direct Cognito login error:', error);
      
      // Handle specific error cases
      if (error.name === 'UserNotConfirmedException') {
        setLocalError('Please verify your email address before logging in');
      } else if (error.name === 'NotAuthorizedException') {
        setLocalError('Incorrect username or password');
      } else if (error.name === 'UserNotFoundException') {
        setLocalError('User does not exist');
      } else {
        setLocalError(error.message || 'An error occurred during login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Use the appropriate login function based on the URL
  React.useEffect(() => {
    // Check if redirected from components that used to link to cognito-login
    const from = searchParams?.get('from');
    if (from === 'cognito') {
      // Set a small reminder that we can handle this method
      console.log('Note: Using direct Cognito authentication based on redirect source');
    }
  }, [searchParams]);
  
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: { xs: 3, sm: 4 }, 
          borderRadius: 2,
          background: theme => theme.palette.mode === 'dark' 
            ? 'linear-gradient(to bottom, #1a1a1a, #2c2c2c)' 
            : 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
          boxShadow: theme => theme.palette.mode === 'dark'
            ? '0 8px 24px rgba(0, 0, 0, 0.4)'
            : '0 8px 24px rgba(0, 0, 0, 0.12)'
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h4" 
            gutterBottom 
            fontWeight="bold"
            sx={{ 
              background: theme => theme.palette.mode === 'dark'
                ? 'linear-gradient(45deg, #64b5f6 30%, #4fc3f7 90%)'
                : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              mb: 1
            }}
          >
            MediVault
          </Typography>
          
          <Typography 
            variant="h5" 
            gutterBottom 
            fontWeight="500"
            color="text.primary"
          >
            Sign In
          </Typography>
        </Box>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: 1,
              '& .MuiAlert-icon': {
                color: 'error.main'
              }
            }}
          >
            {error}
          </Alert>
        )}
        
        {useCognitoDirectLogin && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 1 }}>
            You're being signed in using Cognito authentication
          </Alert>
        )}
        
        {mfaRequired ? (
          <VerifyMFA 
            user={cognitoUser}
            challengeName={challengeName || undefined}
            onComplete={handleVerifyMFA}
            onError={handleMFAError}
          />
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              variant="outlined"
              margin="normal"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  '&.Mui-focused fieldset': {
                    borderWidth: 2
                  }
                }
              }}
            />
            
            <TextField
              fullWidth
              label="Password"
              variant="outlined"
              margin="normal"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'text.secondary' }}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  '&.Mui-focused fieldset': {
                    borderWidth: 2
                  }
                }
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 2 }}>
              <MuiLink 
                component={Link} 
                href={routes.root.forgotPassword as Route} 
                underline="hover" 
                variant="body2"
                sx={{ 
                  fontWeight: 500,
                  '&:hover': {
                    color: 'primary.dark'
                  }
                }}
              >
                Forgot Password?
              </MuiLink>
            </Box>
            
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              type="submit"
              sx={{ 
                mt: 1, 
                mb: 2, 
                py: 1.5,
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                boxShadow: theme => theme.palette.mode === 'dark'
                  ? '0 4px 12px rgba(33, 150, 243, 0.15)'
                  : '0 4px 12px rgba(33, 150, 243, 0.3)',
                background: theme => theme.palette.mode === 'dark'
                  ? 'linear-gradient(45deg, #1976d2 30%, #0d47a1 90%)'
                  : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                '&:hover': {
                  boxShadow: theme => theme.palette.mode === 'dark'
                    ? '0 6px 16px rgba(33, 150, 243, 0.25)'
                    : '0 6px 16px rgba(33, 150, 243, 0.4)',
                  background: theme => theme.palette.mode === 'dark'
                    ? 'linear-gradient(45deg, #1565c0 30%, #0c3d86 90%)'
                    : 'linear-gradient(45deg, #1e88e5 30%, #1cb5e0 90%)',
                }
              }}
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
            
            {unconfirmedUser && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 1 }}>
                  Your account hasn't been verified yet. Please check your email for a verification code or request a new one.
                </Alert>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  onClick={handleResendVerification}
                  disabled={isSubmitting}
                  sx={{ 
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  Resend Verification Email
                </Button>
              </Box>
            )}
            
            {/* Social Login Buttons */}
            <SocialLoginButtons
              onBeforeLogin={() => setIsSubmitting(true)}
            />
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body1">
                Don't have an account?{' '}
                <MuiLink 
                  component={Link} 
                  href={routes.root.register as Route} 
                  underline="hover"
                  sx={{ 
                    fontWeight: 600,
                    '&:hover': {
                      color: 'primary.dark'
                    }
                  }}
                >
                  Sign Up
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
} 