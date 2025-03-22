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
  IconButton,
  useTheme,
  Grid,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Numbers as NumbersIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
} from '@mui/icons-material';
import { routes } from '@/config/routes';
import type { Route } from 'next';

// For password strength validation
interface PasswordCriteria {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Password strength visualization
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useTheme();
  
  // Get email from query parameters if available
  useEffect(() => {
    const emailParam = searchParams?.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);
  
  // Update password strength check as user types
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    
    // Update criteria
    setPasswordCriteria({
      minLength: value.length >= 8,
      hasUpperCase: /[A-Z]/.test(value),
      hasLowerCase: /[a-z]/.test(value),
      hasNumber: /[0-9]/.test(value),
      hasSpecialChar: /[^A-Za-z0-9]/.test(value),
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!email || !code || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Check password strength
    const isPasswordStrong = 
      passwordCriteria.minLength && 
      passwordCriteria.hasUpperCase && 
      passwordCriteria.hasLowerCase && 
      passwordCriteria.hasNumber;
    
    if (!isPasswordStrong) {
      setError('Password does not meet strength requirements');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call API route to confirm password reset
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token: code,
          password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      
      // Show success message
      setSuccess(true);
      
      // Auto-navigate to login page after 3 seconds
      setTimeout(() => {
        router.push(routes.root.login as Route);
      }, 3000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      
      // Handle common reset password errors
      if (err.message.includes('token') || err.message.includes('code')) {
        setError('Invalid verification code. Please try again or request a new one.');
      } else if (err.message.includes('expired')) {
        setError('Verification code has expired. Please request a new one.');
      } else if (err.message.includes('rate limit') || err.message.includes('too many attempts')) {
        setError('Too many attempts. Please try again later.');
      } else if (err.message.includes('password')) {
        setError('Password does not meet requirements. Please choose a stronger password.');
      } else {
        setError('Failed to reset password. Please try again.');
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
            Password reset successful! You can now sign in with your new password.
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
            label="Verification Code"
            variant="outlined"
            margin="normal"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isSubmitting || success}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <NumbersIcon color="primary" />
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
            label="New Password"
            variant="outlined"
            margin="normal"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            disabled={isSubmitting || success}
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
          
          {/* Password strength indicator */}
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Password must contain:
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {passwordCriteria.minLength ? (
                    <CheckCircleIcon fontSize="small" color="success" />
                  ) : (
                    <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
                  )}
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    At least 8 characters
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {passwordCriteria.hasUpperCase ? (
                    <CheckCircleIcon fontSize="small" color="success" />
                  ) : (
                    <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
                  )}
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Uppercase letter
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {passwordCriteria.hasLowerCase ? (
                    <CheckCircleIcon fontSize="small" color="success" />
                  ) : (
                    <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
                  )}
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Lowercase letter
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {passwordCriteria.hasNumber ? (
                    <CheckCircleIcon fontSize="small" color="success" />
                  ) : (
                    <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
                  )}
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Number
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {passwordCriteria.hasSpecialChar ? (
                    <CheckCircleIcon fontSize="small" color="success" />
                  ) : (
                    <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
                  )}
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Special character
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
          
          <TextField
            fullWidth
            label="Confirm New Password"
            variant="outlined"
            margin="normal"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSubmitting || success}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="primary" />
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
            disabled={isSubmitting || success || !email || !code || !password || !confirmPassword}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
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
                href="/auth/forgot-password"
                underline="hover"
                sx={{ 
                  fontWeight: 500,
                  '&:hover': {
                    color: 'primary.dark'
                  }
                }}
              >
                Need a new code?
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
} 