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
import { useRouter } from 'next/navigation';
import { Role, ProviderSpecialty } from '@prisma/client';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { routes } from '@/config/routes';
import type { Route } from 'next';
import { useSignUp } from '@clerk/nextjs';
import { useToast } from '@/contexts/ToastContext';
import axios from 'axios';

interface RegisterFormInputs {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: Role;
  specialty?: ProviderSpecialty;
}

export const RegisterForm: React.FC = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.PATIENT);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { error, handleError, clearError, withErrorHandling } = useErrorHandler({
    context: 'Registration'
  });
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormInputs>();

  const password = watch('password');

  // Function to sync user with database
  const syncUserWithDatabase = async (userId: string, role: Role, specialty?: ProviderSpecialty) => {
    try {
      console.log('Syncing user with database:', userId);
      const token = await window.Clerk?.session?.getToken();
      
      if (!token) {
        console.error('Failed to get auth token for sync');
        return false;
      }
      
      // Store role in localStorage to ensure it's available during sync
      localStorage.setItem('pendingUserRole', role);
      if (specialty) {
        localStorage.setItem('pendingUserSpecialty', specialty);
      }
      
      // Call our sync endpoint with retry logic
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          console.log(`Sync attempt ${retries + 1}/${maxRetries}`);
          
          const response = await axios.post(
            `/api/auth/sync/${userId}`,
            {
              role, 
              specialty
            },
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
          
          console.log('User sync successful:', response.data);
          
          // Update clerk metadata to indicate sync success
          try {
            await window.Clerk.user?.update({
              publicMetadata: { 
                dbSynced: true,
                dbUserId: response.data.user.id
              }
            });
          } catch (metadataError) {
            console.error('Error updating Clerk metadata:', metadataError);
            // Non-fatal error, continue
          }
          
          return true;
        } catch (error) {
          retries++;
          console.error(`Sync attempt ${retries} failed:`, error);
          
          if (retries >= maxRetries) {
            console.error(`All ${maxRetries} sync attempts failed`);
            return false;
          }
          
          // Wait with exponential backoff before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error syncing user with database:', error);
      return false;
    }
  };

  const onSubmit = async (data: RegisterFormInputs) => {
    withErrorHandling(async () => {
      setIsLoading(true);
      
      try {
        if (!signUp) {
          throw new Error('Sign up not initialized');
        }

        const result = await signUp.create({
          emailAddress: data.email,
          password: data.password,
          firstName: data.name.split(' ')[0],
          lastName: data.name.split(' ').slice(1).join(' '),
          unsafeMetadata: {
            role: data.role,
            specialty: data.specialty || null
          }
        });

        if (result?.status === 'complete') {
          await setActive({ session: result.createdSessionId });
          
          // Store role (and specialty if applicable) for later use when email verification is completed
          localStorage.setItem('pendingUserRole', data.role);
          if (data.role === 'PROVIDER' && data.specialty) {
            localStorage.setItem('pendingUserSpecialty', data.specialty);
          }
          
          // Try to sync the user with our database
          if (result.createdUserId) {
            const syncResult = await syncUserWithDatabase(
              result.createdUserId, 
              data.role, 
              data.specialty
            );
            
            if (syncResult) {
              toast.showSuccess('Registration successful and user data synced!');
            } else {
              toast.showInfo('Registration successful, but user data sync failed. Please try logging in again.');
            }
          }
          
          setRegistrationSuccess(true);
          router.push('/dashboard');
        } else if (result?.status === 'missing_requirements') {
          // Store role (and specialty if applicable) for later use when requirements are fulfilled
          localStorage.setItem('pendingUserRole', data.role);
          if (data.role === 'PROVIDER' && data.specialty) {
            localStorage.setItem('pendingUserSpecialty', data.specialty);
          }
          
          // User needs to verify email, show success message and verification instructions
          setRegistrationSuccess(true);
          setIsLoading(false);
        } else {
          throw new Error('Registration failed');
        }
      } catch (error) {
        handleError(error);
      } finally {
        setIsLoading(false);
      }
    });
  };

  if (!isLoaded) {
    return <LoadingState />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
      <TextField
        margin="normal"
        required
        fullWidth
        id="name"
        label="Full Name"
        autoComplete="name"
        autoFocus
        {...register('name', {
          required: 'Name is required',
          minLength: {
            value: 2,
            message: 'Name must be at least 2 characters'
          }
        })}
        error={!!errors.name}
        helperText={errors.name?.message}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        autoComplete="email"
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        })}
        error={!!errors.email}
        helperText={errors.email?.message}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        label="Password"
        type="password"
        id="password"
        autoComplete="new-password"
        {...register('password', {
          required: 'Password is required',
          minLength: {
            value: 8,
            message: 'Password must be at least 8 characters'
          }
        })}
        error={!!errors.password}
        helperText={errors.password?.message}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        label="Confirm Password"
        type="password"
        id="confirmPassword"
        autoComplete="new-password"
        {...register('confirmPassword', {
          required: 'Please confirm your password',
          validate: value => value === password || 'Passwords do not match'
        })}
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword?.message}
      />
      <FormControl fullWidth margin="normal">
        <InputLabel id="role-label">Role</InputLabel>
        <Select
          labelId="role-label"
          id="role"
          label="Role"
          {...register('role', { required: 'Role is required' })}
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as Role)}
        >
          <MenuItem value={Role.PATIENT}>Patient</MenuItem>
          <MenuItem value={Role.PROVIDER}>Provider</MenuItem>
          <MenuItem value={Role.ADMIN}>Admin</MenuItem>
        </Select>
        {errors.role && (
          <FormHelperText error>{errors.role.message}</FormHelperText>
        )}
      </FormControl>
      {selectedRole === Role.PROVIDER && (
        <FormControl fullWidth margin="normal">
          <InputLabel id="specialty-label">Specialty</InputLabel>
          <Select
            labelId="specialty-label"
            id="specialty"
            label="Specialty"
            {...register('specialty')}
          >
            {Object.values(ProviderSpecialty).map((specialty) => (
              <MenuItem key={specialty} value={specialty}>
                {specialty}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Register'}
      </Button>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Already have an account?{' '}
          <Link href={routes.root.login} variant="body2">
            Sign in
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};
