'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Link,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { RegisterRequest } from '@/lib/api/types';
import { Role, ProviderSpecialty } from '@prisma/client';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { routes } from '@/config/routes';
import type { Route } from 'next';

interface RegisterFormInputs extends Omit<RegisterRequest, 'role'> {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: Role;
  specialty?: ProviderSpecialty;
}

export const RegisterForm: React.FC = () => {
  const { register: registerUser, error: authError, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.PATIENT);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { error, handleError, clearError, withErrorHandling } = useErrorHandler({
    context: 'Registration'
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormInputs>();

  const password = watch('password');
  
  // Show auth context errors if they exist
  useEffect(() => {
    if (authError) {
      handleError(new Error(authError));
    }
  }, [authError, handleError]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: RegisterFormInputs) => {
    await withErrorHandling(async () => {
      setIsLoading(true);
      
      try {
        // Validate passwords match
        if (data.password !== data.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        // Create a userData object matching the RegisterRequest interface
        const userData: RegisterRequest = {
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          specialty: data.specialty
        };
        
        await registerUser(userData);
        
        // If no error was thrown, registration was successful
        setRegistrationSuccess(true);
        
        // Redirect to login after successful registration
        setTimeout(() => {
          router.push(routes.root.login as Route);
        }, 2000);
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
        maxWidth: 500,
        mx: 'auto',
        mt: 4,
        p: 3,
        borderRadius: 2,
        boxShadow: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom textAlign="center">
        Create an Account
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
      
      {registrationSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Registration successful! Redirecting...
        </Alert>
      )}

      <TextField
        {...register('name', {
          required: 'Full name is required',
          minLength: {
            value: 2,
            message: 'Name must be at least 2 characters',
          },
        })}
        label="Full Name"
        fullWidth
        margin="normal"
        error={!!errors.name}
        helperText={errors.name?.message}
        disabled={isLoading || registrationSuccess}
      />

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
        disabled={isLoading || registrationSuccess}
        type="email"
        autoComplete="email"
      />

      <TextField
        {...register('password', {
          required: 'Password is required',
          minLength: {
            value: 8,
            message: 'Password must be at least 8 characters',
          },
          pattern: {
            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            message:
              'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
          },
        })}
        label="Password"
        type="password"
        fullWidth
        margin="normal"
        error={!!errors.password}
        helperText={errors.password?.message}
        disabled={isLoading || registrationSuccess}
        autoComplete="new-password"
      />

      <TextField
        {...register('confirmPassword', {
          required: 'Please confirm your password',
          validate: value => value === password || 'Passwords do not match',
        })}
        label="Confirm Password"
        type="password"
        fullWidth
        margin="normal"
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword?.message}
        disabled={isLoading || registrationSuccess}
        autoComplete="new-password"
      />

      <FormControl fullWidth margin="normal" error={!!errors.role}>
        <InputLabel id="role-select-label">Role</InputLabel>
        <Select
          labelId="role-select-label"
          label="Role"
          defaultValue={Role.PATIENT}
          {...register('role', { required: 'Role is required' })}
          onChange={e => setSelectedRole(e.target.value as Role)}
          disabled={isLoading || registrationSuccess}
        >
          <MenuItem value={Role.PATIENT}>Patient</MenuItem>
          <MenuItem value={Role.PROVIDER}>Provider</MenuItem>
        </Select>
        {errors.role && <FormHelperText>{errors.role.message}</FormHelperText>}
      </FormControl>

      {selectedRole === Role.PROVIDER && (
        <FormControl fullWidth margin="normal" error={!!errors.specialty}>
          <InputLabel id="specialty-select-label">Specialty</InputLabel>
          <Select
            labelId="specialty-select-label"
            label="Specialty"
            defaultValue=""
            {...register('specialty', {
              required: selectedRole === Role.PROVIDER ? 'Specialty is required for providers' : false,
            })}
            disabled={isLoading || registrationSuccess}
          >
            {Object.values(ProviderSpecialty).map(specialty => (
              <MenuItem key={specialty} value={specialty}>
                {specialty.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </Select>
          {errors.specialty && <FormHelperText>{errors.specialty.message}</FormHelperText>}
        </FormControl>
      )}

      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        sx={{ mt: 3 }}
        disabled={isLoading || registrationSuccess}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
            Registering...
          </Box>
        ) : (
          'Register'
        )}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Already have an account?{' '}
          <Link
            component="button"
            onClick={(e) => {
              e.preventDefault();
              router.push(routes.root.login as Route);
            }}
            sx={{ textDecoration: 'none' }}
          >
            Login here
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};
