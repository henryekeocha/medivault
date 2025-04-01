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
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Email as EmailIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { Role, ProviderSpecialty } from '@prisma/client';
import { routes } from '@/config/routes';
import type { Route } from 'next';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons';
import { useSignUp, useAuth, useClerk } from '@clerk/nextjs';

// Add password criteria type
type PasswordCriteria = {
  label: string;
  regex: RegExp;
  met: boolean;
};

export default function RegisterPage() {
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { client: clerk } = useClerk();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<Role>(Role.PATIENT);
  const [specialty, setSpecialty] = useState<ProviderSpecialty | ''>('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria[]>([
    { label: 'At least 8 characters', regex: /.{8,}/, met: false },
    { label: 'Contains uppercase letter', regex: /[A-Z]/, met: false },
    { label: 'Contains lowercase letter', regex: /[a-z]/, met: false },
    { label: 'Contains number', regex: /[0-9]/, met: false },
    { label: 'Contains special character', regex: /[!@#$%^&*(),.?":{}|<>]/, met: false },
  ]);

  // Register with Clerk
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Enhanced validation
      if (!name || !email || !password || !confirmPassword) {
        throw new Error('All fields are required');
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Password validation
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      if (!/[A-Z]/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        throw new Error('Password must contain at least one lowercase letter');
      }
      if (!/[0-9]/.test(password)) {
        throw new Error('Password must contain at least one number');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        throw new Error('Password must contain at least one special character');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Name validation
      const [firstName, lastName] = name.split(' ');
      if (!firstName || !lastName) {
        throw new Error('Please enter your full name (first and last name)');
      }
      if (firstName.length < 2 || lastName.length < 2) {
        throw new Error('First and last names must be at least 2 characters long');
      }

      // Role validation
      if (role === Role.PROVIDER && !specialty) {
        throw new Error('Please select a specialty for healthcare providers');
      }

      if (!isSignUpLoaded || !signUp) {
        throw new Error('Clerk is not loaded');
      }

      // Rate limiting check
      const lastAttempt = localStorage.getItem('lastRegistrationAttempt');
      if (lastAttempt) {
        const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt);
        if (timeSinceLastAttempt < 5000) { // 5 seconds cooldown
          throw new Error('Please wait a few seconds before trying again');
        }
      }

      console.log('Starting sign up process...');
      console.log('Selected role:', role);
      console.log('Selected specialty:', specialty);
      
      const signUpData = {
        emailAddress: email,
        password,
        firstName,
        lastName,
        unsafeMetadata: {
          role: role,
          ...(role === Role.PROVIDER && { specialty })
        }
      };
      
      console.log('Sign up data:', signUpData);
      
      const result = await signUp.create(signUpData);
      
      console.log('Sign up result:', result);
      console.log('User ID:', result.createdUserId);
      console.log('Status:', result.status);

      // Store registration attempt timestamp
      localStorage.setItem('lastRegistrationAttempt', Date.now().toString());

      if (result.status === "complete") {
        if (result.createdUserId) {
          try {
            console.log('Registration complete, redirecting to verification');
            
            // The webhook will handle creating the user in our database
            // Clear sensitive data from localStorage
            localStorage.removeItem('lastRegistrationAttempt');
            
            // Store the role in localStorage for later retrieval after verification
            localStorage.setItem('pendingUserRole', role);
            if (role === Role.PROVIDER && specialty) {
              localStorage.setItem('pendingUserSpecialty', specialty);
            }
            
            // Redirect to verification page
            router.push('/auth/verify-email');
          } catch (error) {
            console.error('Error during registration:', error);
            // Clear sensitive data from localStorage
            localStorage.removeItem('lastRegistrationAttempt');
            // Still redirect to verification page
            router.push('/auth/verify-email');
          }
        }
      } else if (result.status === "missing_requirements") {
        // Handle email verification
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code"
        });
        
        console.log('Registration requires verification, redirecting');
        
        // Store the role in localStorage for later retrieval after verification
        localStorage.setItem('pendingUserRole', role);
        if (role === Role.PROVIDER && specialty) {
          localStorage.setItem('pendingUserSpecialty', specialty);
        }
        
        // Redirect to verification page
        router.push('/auth/verify-email');
      } else {
        throw new Error('Sign up failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add password strength calculation
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    const criteria = passwordCriteria.map(criterion => {
      const met = criterion.regex.test(password);
      if (met) strength += 20;
      return { ...criterion, met };
    });
    setPasswordCriteria(criteria);
    setPasswordStrength(strength);
  };

  // Update password handler
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    calculatePasswordStrength(newPassword);
  };

  // Handle social login success
  const handleSocialLoginSuccess = () => {
    router.push('/dashboard');
  };

  // Handle social login error
  const handleSocialLoginError = (error: string) => {
    setError(error);
  };

  // If user is already signed in, redirect to dashboard
  useEffect(() => {
    if (isSignedIn) {
      router.push('/dashboard');
    }
  }, [isSignedIn, router]);

  // Show loading state while Clerk is initializing
  if (!isSignUpLoaded || !isAuthLoaded) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Create an Account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={handlePasswordChange}
              disabled={isSubmitting}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Password Strength Indicator */}
            <Box sx={{ mt: 1, mb: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={passwordStrength} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: passwordStrength === 100 ? '#4caf50' : 
                                   passwordStrength >= 60 ? '#2196f3' : 
                                   passwordStrength >= 40 ? '#ff9800' : '#f44336',
                  }
                }} 
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Password Strength: {passwordStrength === 100 ? 'Strong' : 
                                  passwordStrength >= 60 ? 'Good' : 
                                  passwordStrength >= 40 ? 'Fair' : 'Weak'}
              </Typography>
            </Box>

            {/* Password Criteria List */}
            <List dense sx={{ mb: 2 }}>
              {passwordCriteria.map((criterion, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {criterion.met ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={criterion.label}
                    sx={{
                      color: criterion.met ? 'success.main' : 'text.secondary',
                      '& .MuiListItemText-primary': {
                        fontSize: '0.875rem',
                      }
                    }}
                  />
                </ListItem>
              ))}
            </List>

            <TextField
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                label="Role"
                disabled={isSubmitting}
              >
                <MenuItem value={Role.PATIENT}>Patient</MenuItem>
                <MenuItem value={Role.PROVIDER}>Healthcare Provider</MenuItem>
                <MenuItem value={Role.ADMIN}>Administrator</MenuItem>
              </Select>
            </FormControl>

            {role === Role.PROVIDER && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Specialty</InputLabel>
                <Select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value as ProviderSpecialty)}
                  label="Specialty"
                  disabled={isSubmitting}
                >
                  {Object.values(ProviderSpecialty).map((specialty) => (
                    <MenuItem key={specialty} value={specialty}>
                      {specialty.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={isSubmitting}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Button>

            {/* Add clerk-captcha element for CAPTCHA validation */}
            <div id="clerk-captcha" style={{ marginTop: '10px' }}></div>

            <Divider sx={{ my: 2 }}>or</Divider>

            <SocialLoginButtons
              onSuccess={handleSocialLoginSuccess}
              onError={handleSocialLoginError}
            />

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body1">
                Already have an account?{' '}
                <MuiLink
                  component={Link}
                  href={routes.root.login as Route}
                  underline="hover"
                >
                  Sign In
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 