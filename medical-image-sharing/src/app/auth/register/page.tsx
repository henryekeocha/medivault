'use client';

import React, { useState } from 'react';
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
import { signUp, confirmSignUp } from '@aws-amplify/auth';
import { Role, ProviderSpecialty } from '@prisma/client';
import { routes } from '@/config/routes';
import type { Route } from 'next';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons';

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
  
  // Register with Cognito
  const handleCognitoRegister = async (e: React.FormEvent) => {
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
      // Sign up with Amplify Auth
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            name,
            email,
            'custom:role': role.toLowerCase(),
            ...(role === Role.PROVIDER && specialty ? { 'custom:specialty': specialty } : {}),
          },
        },
      });
      
      // Show verification UI
      setVerifying(true);
      setSuccessMessage('Account created! Please check your email for a verification code.');
    } catch (error: any) {
      console.error('Cognito registration error:', error);
      
      // Handle specific Cognito errors
      switch (error.code) {
        case 'UsernameExistsException':
          setLocalError('An account with this email already exists');
          break;
        case 'InvalidPasswordException':
          setLocalError('Password does not meet complexity requirements');
          break;
        default:
          setLocalError(error.message || 'Registration failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Verify email with code
  const handleVerify = async () => {
    if (!verificationCode) {
      setLocalError('Please enter the verification code');
      return;
    }
    
    setIsSubmitting(true);
    setLocalError(null);
    
    try {
      // Confirm signup
      await confirmSignUp({ username: email, confirmationCode: verificationCode });
      
      // Show success and redirect
      setSuccessMessage('Email verified successfully! You can now sign in.');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push(routes.root.login as Route);
      }, 2000);
    } catch (error: any) {
      console.error('Verification error:', error);
      setLocalError(error.message || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Register through API
  const handleApiRegister = async (e: React.FormEvent) => {
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
    
    setIsSubmitting(true);
    setLocalError(null);
    
    // Use the register function from AuthContext
    const success = await register({
      name,
      email,
      password,
      role,
      ...(role === Role.PROVIDER ? { specialty } : {}),
    });
    
    setIsSubmitting(false);
    
    if (success) {
      // Registration successful, redirect to login
      setSuccessMessage('Registration successful! You can now sign in.');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(routes.root.login as Route);
      }, 2000);
    }
  };
  
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
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
            Create Account
          </Typography>
        </Box>
        
        {localError && (
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
            {localError}
          </Alert>
        )}
        
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              borderRadius: 1 
            }}
          >
            {successMessage}
          </Alert>
        )}
        
        {verifying ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              Verify Your Email
            </Typography>
            
            <Typography variant="body2" paragraph>
              We've sent a verification code to <strong>{email}</strong>. 
              Please enter the code below to verify your account.
            </Typography>
            
            <TextField
              fullWidth
              label="Verification Code"
              variant="outlined"
              margin="normal"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={isSubmitting}
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
              onClick={handleVerify}
              disabled={isSubmitting || !verificationCode}
              sx={{ 
                mt: 2, 
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
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isSubmitting ? 'Verifying...' : 'Verify Email'}
            </Button>
            
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              onClick={() => setVerifying(false)}
              disabled={isSubmitting}
              sx={{ 
                mb: 2,
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Back to Registration
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleCognitoRegister}>
            <TextField
              fullWidth
              label="Full Name"
              variant="outlined"
              margin="normal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
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
              label="Email"
              variant="outlined"
              margin="normal"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  '&.Mui-focused fieldset': {
                    borderWidth: 2
                  }
                }
              }}
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-label">Account Type</InputLabel>
              <Select
                labelId="role-label"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                label="Account Type"
                disabled={isSubmitting}
              >
                <MenuItem value={Role.PATIENT}>Patient</MenuItem>
                <MenuItem value={Role.PROVIDER}>Medical Provider</MenuItem>
              </Select>
            </FormControl>
            
            {role === Role.PROVIDER && (
              <FormControl fullWidth margin="normal">
                <InputLabel id="specialty-label">Medical Specialty</InputLabel>
                <Select
                  labelId="specialty-label"
                  value={specialty || ''}
                  onChange={(e) => setSpecialty(e.target.value as ProviderSpecialty)}
                  label="Medical Specialty"
                  disabled={isSubmitting}
                >
                  {Object.values(ProviderSpecialty).map((spec) => (
                    <MenuItem key={spec} value={spec}>
                      {spec.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <TextField
              fullWidth
              label="Password"
              variant="outlined"
              margin="normal"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              disabled={isSubmitting}
              InputProps={{
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
              label="Confirm Password"
              variant="outlined"
              margin="normal"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>
            
            {/* Social Login Buttons */}
            <SocialLoginButtons
              onBeforeLogin={() => setIsSubmitting(true)}
            />
            
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="body1">
                Already have an account?{' '}
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
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
} 