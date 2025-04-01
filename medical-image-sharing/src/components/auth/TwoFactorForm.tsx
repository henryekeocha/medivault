'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  CardActions,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useSignIn } from '@clerk/nextjs';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface TwoFactorFormProps {
  email: string;
  onSuccess?: () => void;
}

// Create form schema
const formSchema = z.object({
  code: z.string().min(6, {
    message: 'Verification code must be at least 6 characters long',
  }),
});

type FormData = z.infer<typeof formSchema>;

export const TwoFactorForm: React.FC<TwoFactorFormProps> = ({
  email,
  onSuccess,
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { signIn, isLoaded } = useSignIn();
  
  useEffect(() => {
    // Start the MFA process when the component loads
    if (isLoaded && signIn) {
      const prepareSecondFactor = async () => {
        try {
          // Start the second factor verification process
          await signIn.prepareSecondFactor({
            strategy: 'email_code' as any,
          });
        } catch (error) {
          console.error('Error preparing second factor:', error);
          setErrorMessage('Unable to send verification code. Please try again.');
        }
      };
      
      prepareSecondFactor();
    }
  }, [isLoaded, signIn]);

  // Initialize form
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      if (!isLoaded || !signIn) {
        throw new Error('Authentication system not loaded');
      }
      
      // Use Clerk's built-in MFA functionality
      const result = await signIn.attemptSecondFactor({
        strategy: 'email_code' as any,
        code: data.code
      });
      
      if (result.status === 'complete') {
        // Successfully verified, redirect to dashboard
        router.push('/dashboard');
      } else {
        setErrorMessage('Invalid or expired verification code. Please try again.');
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom textAlign="center">
        Two-Factor Authentication
      </Typography>
      <Typography variant="body1" gutterBottom textAlign="center" sx={{ mb: 3 }}>
        Please enter the verification code sent to {email}
      </Typography>

      <Box component="form" onSubmit={form.handleSubmit(onSubmit)}>
        <TextField
          fullWidth
          label="Verification Code"
          {...form.register("code")}
          margin="normal"
          required
          disabled={isLoading}
          error={!!form.formState.errors.code}
          helperText={form.formState.errors.code?.message}
          inputProps={{ 
            maxLength: 6,
            pattern: '[0-9]*',
            inputMode: 'numeric'
          }}
        />

        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3 }}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Verify'}
        </Button>

        <Button
          fullWidth
          variant="text"
          onClick={() => {
            if (isLoaded && signIn) {
              signIn.prepareSecondFactor({
                strategy: 'email_code' as any,
              });
              setErrorMessage('A new verification code has been sent.');
            }
          }}
          disabled={isLoading}
          sx={{ mt: 2 }}
        >
          Resend verification code
        </Button>
      </Box>
    </Paper>
  );
};
