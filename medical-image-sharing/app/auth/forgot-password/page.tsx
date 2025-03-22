'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  useTheme,
} from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import { routes } from '@/config/routes';
import type { Route } from 'next';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call API route to send password reset email
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request password reset');
      }
      
      // Show success message and prepare to navigate to reset password page
      setSuccess(true);
      
      // Auto-navigate to reset password page after 2 seconds
      setTimeout(() => {
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
      }, 2000);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      
      if (err.message.includes('rate limit') || err.message.includes('too many requests')) {
        setError('Too many attempts. Please try again later.');
      } else if (err.message.includes('invalid email')) {
        setError('Invalid email format. Please enter a valid email address.');
      } else {
        // For security reasons, we don't want to reveal if a user exists or not
        // We show success even if the email isn't found to prevent user enumeration
        setSuccess(true);
        setTimeout(() => {
          router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
        }, 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
            Reset Password
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ maxWidth: '80%', mx: 'auto' }}
          >
            Enter your email address below and we'll send you a code to reset your password.
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
        
        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 3, borderRadius: 1 }}
          >
            Password reset instructions have been sent to your email.
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            variant="outlined"
            margin="normal"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting || success}
            required
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
          
          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            type="submit"
            sx={{ 
              mt: 3, 
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
            disabled={isSubmitting || success || !email}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Code'}
          </Button>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Remember your password?{' '}
              <MuiLink 
                component={Link}
                href={routes.root.login as Route}
                underline="hover"
                sx={{ 
                  fontWeight: 600,
                  '&:hover': {
                    color: 'primary.dark'
                  }
                }}
              >
                Sign In
              </MuiLink>
            </Typography>
            
            <Typography variant="body2" sx={{ mt: 1 }}>
              <MuiLink 
                component={Link}
                href="/auth/reset-password"
                underline="hover"
                sx={{ 
                  fontWeight: 500,
                  '&:hover': {
                    color: 'primary.dark'
                  }
                }}
              >
                Already have a code?
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
} 