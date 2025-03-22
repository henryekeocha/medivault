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
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';

interface TwoFactorFormProps {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
}

export const TwoFactorForm: React.FC<TwoFactorFormProps> = ({
  email,
  onVerify,
  onResend,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const router = useRouter();
  const { error, handleError, clearError, withErrorHandling } = useErrorHandler({
    context: 'Two-Factor Authentication'
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      handleError(new Error('Please enter the verification code'));
      return;
    }

    await withErrorHandling(async () => {
      setLoading(true);
      try {
        await onVerify(code);
        router.push('/dashboard');
      } catch (err: any) {
        // Re-throw with more specific error message
        throw new Error(err.response?.data?.message || 'Invalid verification code');
      } finally {
        setLoading(false);
      }
    });
  };

  const handleResend = async () => {
    await withErrorHandling(async () => {
      setLoading(true);
      try {
        await onResend();
        setCountdown(30);
        setResendDisabled(true);
        setCode(''); // Clear code field on resend
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400, mx: 'auto' }}>
      <Box 
        component="form" 
        onSubmit={handleSubmit}
        role="dialog"
        aria-labelledby="two-factor-dialog-title"
        aria-describedby="two-factor-dialog-description"
      >
        <Typography 
          id="two-factor-dialog-title"
          variant="h5" 
          component="h1" 
          gutterBottom 
          textAlign="center"
        >
          Two-Factor Authentication
        </Typography>

        <Typography
          id="two-factor-dialog-description"
          variant="body2"
          color="text.secondary"
          paragraph
          textAlign="center"
        >
          We've sent a verification code to {email}. Please enter it below to
          continue.
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
            role="alert"
          >
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Verification Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          margin="normal"
          autoComplete="one-time-code"
          inputProps={{
            maxLength: 6,
            inputMode: 'numeric',
            pattern: '[0-9]*',
            'aria-label': 'Verification code input'
          }}
          error={!!error}
          disabled={loading}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{ mt: 3 }}
          disabled={loading || !code}
        >
          {loading ? <CircularProgress size={24} /> : 'Verify'}
        </Button>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            onClick={handleResend}
            disabled={resendDisabled || loading}
            sx={{ textTransform: 'none' }}
          >
            {resendDisabled
              ? `Resend code in ${countdown}s`
              : 'Resend verification code'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};
