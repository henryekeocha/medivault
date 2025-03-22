'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  useTheme,
} from '@mui/material';
import {
  Email as EmailIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Role, ProviderSpecialty } from '@prisma/client';
import { routes } from '@/config/routes';
import type { Route } from 'next';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'; 
import { signIn } from 'next-auth/react';

// For password strength validation
interface PasswordCriteria {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.PATIENT);
  const [specialty, setSpecialty] = useState<ProviderSpecialty | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Password strength visualization
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  
  const { register, error: authError } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  
  // Combine errors from context and local state
  const error = localError || authError;

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
  
  // Register with Next.js Auth
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setLocalError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    
    // Check password strength
    const isPasswordStrong = 
      passwordCriteria.minLength && 
      passwordCriteria.hasUpperCase && 
      passwordCriteria.hasLowerCase && 
      passwordCriteria.hasNumber;
    
    if (!isPasswordStrong) {
      setLocalError('Password does not meet strength requirements');
      return;
    }
    
    setIsSubmitting(true);
    setLocalError(null);
    
    try {
      // Get the current hostname and port for the API call
      const baseUrl = window.location.origin;
      
      // Call the API route for registration
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          ...(role === Role.PROVIDER && specialty ? { specialty } : {})
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Extract error information from the API response
        const errorMsg = data.error || 'Registration failed';
        throw new Error(errorMsg);
      }
      
      // Registration successful
      setSuccessMessage('Account created successfully! You can now sign in.');
      
      // Redirect to login page after a delay
      setTimeout(() => {
        router.push(routes.auth.login as Route);
      }, 3000);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle common registration errors
      if (error.message.includes('already exists')) {
        setLocalError('An account with this email already exists');
      } else {
        setLocalError(error.message || 'Registration failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSocialLoginSuccess = () => {
    router.push(routes.root.home as Route);
  };
  
  const handleSocialLoginError = (error: string) => {
    setLocalError(`Social login error: ${error}`);
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
          Create an Account
        </Typography>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ width: '100%', mb: 2 }}
          >
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ width: '100%', mb: 2 }}
          >
            {successMessage}
          </Alert>
        )}
        
        {!verifying ? (
          // Registration Form
          <Box 
            component="form" 
            onSubmit={handleRegister}
            sx={{ width: '100%', mt: 1 }}
          >
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              autoComplete="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
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
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
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
            
            {/* Password Strength Indicator */}
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Password Requirements:
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {passwordCriteria.minLength ? (
                      <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                    ) : (
                      <RadioButtonUncheckedIcon color="disabled" fontSize="small" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body2" color={passwordCriteria.minLength ? 'success.main' : 'text.secondary'}>
                      At least 8 characters
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {passwordCriteria.hasUpperCase ? (
                      <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                    ) : (
                      <RadioButtonUncheckedIcon color="disabled" fontSize="small" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body2" color={passwordCriteria.hasUpperCase ? 'success.main' : 'text.secondary'}>
                      One uppercase letter
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {passwordCriteria.hasLowerCase ? (
                      <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                    ) : (
                      <RadioButtonUncheckedIcon color="disabled" fontSize="small" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body2" color={passwordCriteria.hasLowerCase ? 'success.main' : 'text.secondary'}>
                      One lowercase letter
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {passwordCriteria.hasNumber ? (
                      <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                    ) : (
                      <RadioButtonUncheckedIcon color="disabled" fontSize="small" sx={{ mr: 1 }} />
                    )}
                    <Typography variant="body2" color={passwordCriteria.hasNumber ? 'success.main' : 'text.secondary'}>
                      One number
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
              }}
              disabled={isSubmitting}
              error={password !== confirmPassword && confirmPassword !== ''}
              helperText={password !== confirmPassword && confirmPassword !== '' ? 'Passwords do not match' : ''}
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                id="role-select"
                value={role}
                label="Role"
                onChange={(e) => setRole(e.target.value as Role)}
                disabled={isSubmitting}
              >
                <MenuItem value={Role.PATIENT}>Patient</MenuItem>
                <MenuItem value={Role.PROVIDER}>Healthcare Provider</MenuItem>
              </Select>
            </FormControl>
            
            {role === Role.PROVIDER && (
              <FormControl fullWidth margin="normal">
                <InputLabel id="specialty-select-label">Specialty</InputLabel>
                <Select
                  labelId="specialty-select-label"
                  id="specialty-select"
                  value={specialty || ''}
                  label="Specialty"
                  onChange={(e) => setSpecialty(e.target.value as ProviderSpecialty)}
                  disabled={isSubmitting}
                >
                  {Object.values(ProviderSpecialty).map((specialty) => (
                    <MenuItem key={specialty} value={specialty}>
                      {specialty}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
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
                'Sign Up'
              )}
            </Button>
            
            <SocialLoginButtons 
              onSuccess={handleSocialLoginSuccess}
              onError={handleSocialLoginError}
            />
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link href={routes.auth.login as Route} passHref legacyBehavior>
                <MuiLink variant="body2" component="span">
                  Already have an account? Sign In
                </MuiLink>
              </Link>
            </Box>
          </Box>
        ) : (
          // Verification Form (only shown if needed for email verification)
          <Box 
            component="div" 
            sx={{ width: '100%', mt: 1 }}
          >
            <Typography variant="body1" gutterBottom>
              We've sent a verification code to your email. Please enter it below to complete your registration.
            </Typography>
            
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="verificationCode"
              label="Verification Code"
              name="verificationCode"
              autoComplete="one-time-code"
              autoFocus
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={isSubmitting}
            />
            
            <Button
              type="button"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.2 }}
              disabled={isSubmitting}
              onClick={() => router.push(routes.auth.login as Route)}
            >
              {isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Continue to Login'
              )}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
} 