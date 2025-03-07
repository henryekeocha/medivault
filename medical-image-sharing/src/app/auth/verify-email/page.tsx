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
import { confirmSignUp, resendSignUpCode } from '@aws-amplify/auth';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/config/routes';
import type { Route } from 'next';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: authError, isAuthenticated } = useAuth();
  
  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);
  
  // Get email from query parameters if available
  useEffect(() => {
    const emailParam = searchParams?.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !code) {
      setError('Email and verification code are required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call Cognito to confirm the user's signup with the verification code
      await confirmSignUp({ username: email, confirmationCode: code });
      
      // Show success message and redirect to login
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push(routes.root.login as Route);
      }, 2000);
    } catch (err: any) {
      console.error('Email verification error:', err);
      
      // Handle specific Cognito errors
      switch (err.code) {
        case 'CodeMismatchException':
          setError('Invalid verification code. Please try again.');
          break;
        case 'ExpiredCodeException':
          setError('Verification code has expired. Please request a new one.');
          break;
        case 'UserNotFoundException':
          setError('We could not find an account with this email address.');
          break;
        case 'NotAuthorizedException':
          // This could mean the account is already confirmed
          setError('This account has already been verified. You can now log in.');
          break;
        default:
          setError(err.message || 'Failed to verify email. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleResendCode = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setIsResending(true);
    setError(null);
    setResendSuccess(false);
    
    try {
      // Call Cognito to resend the verification code
      await resendSignUpCode({ username: email });
      
      // Show success message
      setResendSuccess(true);
      
      // Clear the resend success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Resend verification code error:', err);
      
      // Handle specific Cognito errors
      switch (err.code) {
        case 'UserNotFoundException':
          setError('We could not find an account with this email address.');
          break;
        case 'LimitExceededException':
          setError('Too many attempts. Please try again later.');
          break;
        case 'InvalidParameterException':
          setError('Invalid email format. Please enter a valid email address.');
          break;
        default:
          setError(err.message || 'Failed to resend code. Please try again.');
      }
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
        
        {(error || authError) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error || authError}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your email has been successfully verified! You can now log in to your account.
            Redirecting to login page...
          </Alert>
        )}
        
        {resendSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            A new verification code has been sent to your email address.
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="body1" paragraph>
            Please enter the verification code that was sent to your email address when you registered.
          </Typography>
          
          <TextField
            fullWidth
            label="Email Address"
            variant="outlined"
            margin="normal"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting || success}
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
            label="Verification Code"
            variant="outlined"
            margin="normal"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isSubmitting || success}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <NumbersIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            type="submit"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={isSubmitting || isResending || success || !email || !code}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isSubmitting ? 'Verifying...' : 'Verify Email'}
          </Button>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" paragraph>
              Didn't receive a verification code?
            </Typography>
            
            <Button
              variant="outlined"
              onClick={handleResendCode}
              disabled={isResending || isSubmitting || success || !email}
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