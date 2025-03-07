'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  CircularProgress,
  Alert,
  InputAdornment,
  Link as MuiLink,
} from '@mui/material';
import {
  Numbers as NumbersIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { confirmSignIn, signOut } from '@aws-amplify/auth';

interface VerifyMFAProps {
  user: any; // The Cognito user object
  onComplete: (user: any) => void;
  onError: (error: string) => void;
  challengeName?: string;
}

export default function VerifyMFA({ user, onComplete, onError, challengeName }: VerifyMFAProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Handle different MFA challenges from Cognito
      let verifiedUser;
      
      if (challengeName === 'SOFTWARE_TOKEN_MFA') {
        // This is a TOTP challenge (e.g., Google Authenticator)
        verifiedUser = await confirmSignIn({
          challengeResponse: verificationCode,
        });
      } else if (challengeName === 'SMS_MFA') {
        // This is an SMS-based MFA challenge
        verifiedUser = await confirmSignIn({
          challengeResponse: verificationCode,
        });
      } else {
        // Default case - attempt TOTP verification
        verifiedUser = await confirmSignIn({
          challengeResponse: verificationCode,
        });
      }
      
      // Pass the verified user back to the parent component
      onComplete(verifiedUser);
    } catch (err: any) {
      console.error('MFA verification error:', err);
      
      // Handle specific errors
      if (err.code === 'CodeMismatchException') {
        setError('Invalid verification code. Please try again.');
      } else {
        setError(err.message || 'Failed to verify code. Please try again.');
        onError(err.message || 'Failed to verify code');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    // Log out the current session since MFA was not completed
    signOut().catch((err: Error) => {
      console.error('Error signing out:', err);
    });
    
    // Notify the parent component of the error
    onError('MFA verification cancelled');
  };
  
  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: 2, maxWidth: 500, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
        <SecurityIcon color="primary" sx={{ fontSize: 32, mr: 1 }} />
        <Typography variant="h5" fontWeight="bold">
          Two-Factor Authentication
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Typography variant="body1" paragraph>
        Please enter the verification code from your authenticator app to complete the sign-in process.
      </Typography>
      
      <TextField
        fullWidth
        label="Verification Code"
        variant="outlined"
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
        disabled={isLoading}
        placeholder="123456"
        inputProps={{ maxLength: 6 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <NumbersIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />
      
      <Button
        fullWidth
        variant="contained"
        color="primary"
        size="large"
        onClick={handleVerify}
        disabled={isLoading || verificationCode.length !== 6}
        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        sx={{ mb: 2 }}
      >
        {isLoading ? 'Verifying...' : 'Verify & Sign In'}
      </Button>
      
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2">
          <MuiLink
            component="button"
            variant="body2"
            onClick={handleCancel}
            underline="hover"
            sx={{ cursor: 'pointer' }}
          >
            Cancel and return to login
          </MuiLink>
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          If you've lost access to your authenticator app, please contact
          support for assistance.
        </Typography>
      </Box>
    </Paper>
  );
} 