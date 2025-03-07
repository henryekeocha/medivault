'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  CircularProgress,
  Alert,
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  QrCode2 as QrCodeIcon,
  Numbers as NumbersIcon,
  Phone as PhoneIcon,
  Security as SecurityIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { fetchAuthSession, setUpTOTP, verifyTOTPSetup, updateMFAPreference, getCurrentUser } from '@aws-amplify/auth';
import Image from 'next/image';

interface SetupMFAProps {
  onComplete: (isMFASetup: boolean) => void;
  onCancel: () => void;
}

export default function SetupMFA({ onComplete, onCancel }: SetupMFAProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Fetch the QR code and secret key on component mount
  useEffect(() => {
    const setupMFA = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get the current authenticated user
        const user = await getCurrentUser();
        
        // Setup TOTP (Time-based One-Time Password)
        const { sharedSecret } = await setUpTOTP();
        
        // Convert the secret key to a QR code URL using the Amplify format
        // The format is typically: otpauth://totp/AWSCognito:{username}?secret={secretKey}&issuer={issuerName}
        const issuer = 'MedicalImageSharing';
        const username = user.username || 'user';
        const qrCodeUrl = `otpauth://totp/${issuer}:${username}?secret=${sharedSecret}&issuer=${issuer}`;
        
        // Set the QR code and secret key
        setQrCode(qrCodeUrl);
        setSecretCode(sharedSecret);
        
        // Move to the next step
        setActiveStep(1);
      } catch (err: any) {
        console.error('Error setting up MFA:', err);
        setError(err.message || 'Failed to set up MFA. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    setupMFA();
  }, []);
  
  const handleVerify = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get the current authenticated user
      const user = await getCurrentUser();
      
      // Verify the TOTP code and associate it with the user
      await verifyTOTPSetup({ code: verificationCode });
      
      // Set the preferred MFA method to TOTP
      await updateMFAPreference({ totp: 'PREFERRED' });
      
      // Show success message
      setSuccess(true);
      setActiveStep(2);
      
      // Notify parent component that MFA setup is complete
      setTimeout(() => {
        onComplete(true);
      }, 2000);
    } catch (err: any) {
      console.error('Error verifying MFA code:', err);
      
      // Handle specific errors
      if (err.code === 'EnableSoftwareTokenMFAException') {
        setError('Invalid verification code. Please try again.');
      } else {
        setError(err.message || 'Failed to verify MFA code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSkip = async () => {
    try {
      // Get the current authenticated user
      const user = await getCurrentUser();
      
      // Set the preferred MFA method to NONE
      await updateMFAPreference({ totp: 'DISABLED' });
      
      // Notify parent component that user skipped MFA setup
      onComplete(false);
    } catch (err: any) {
      console.error('Error skipping MFA:', err);
      setError(err.message || 'Failed to skip MFA setup. Please try again.');
    }
  };
  
  const steps = ['Generate QR Code', 'Verify Code', 'Complete Setup'];
  
  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: 2, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom align="center" fontWeight="bold">
        Set Up Two-Factor Authentication
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Two-factor authentication has been successfully set up for your account!
        </Alert>
      )}
      
      {isLoading && activeStep === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Setting up MFA...</Typography>
        </Box>
      ) : (
        <>
          {activeStep === 1 && (
            <Box>
              <Typography variant="body1" paragraph>
                Please scan this QR code with your authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).
              </Typography>
              
              {qrCode && (
                <Box sx={{ textAlign: 'center', my: 2 }}>
                  <Box sx={{ 
                    display: 'inline-block', 
                    p: 2, 
                    border: '1px solid #ddd', 
                    borderRadius: 1,
                    bgcolor: 'white'
                  }}>
                    {/* Display QR code image */}
                    {/* In a real app, you'd use a QR code library to render this */}
                    <Box sx={{ 
                      width: 200, 
                      height: 200, 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'white'
                    }}>
                      <QrCodeIcon sx={{ fontSize: 100, color: 'text.secondary' }} />
                      <Typography variant="caption" sx={{ mt: 1 }}>
                        (QR Code would appear here)
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              
              {secretCode && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    If you can't scan the QR code, enter this key manually:
                  </Typography>
                  <Box 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'grey.100', 
                      borderRadius: 1, 
                      fontFamily: 'monospace',
                      wordBreak: 'break-all' 
                    }}
                  >
                    {secretCode}
                  </Box>
                </Box>
              )}
              
              <Typography variant="body1" sx={{ mb: 2 }}>
                After scanning, enter the 6-digit code from your authenticator app:
              </Typography>
              
              <TextField
                fullWidth
                label="Verification Code"
                variant="outlined"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
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
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  Skip for Now
                </Button>
                <Button 
                  variant="contained"
                  onClick={handleVerify}
                  disabled={isLoading || verificationCode.length !== 6}
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {isLoading ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </Box>
            </Box>
          )}
          
          {activeStep === 2 && (
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'success.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}>
                <CheckIcon sx={{ fontSize: 40 }} />
              </Box>
              
              <Typography variant="h6" gutterBottom>
                Setup Complete!
              </Typography>
              
              <Typography variant="body1" paragraph>
                Two-factor authentication has been enabled for your account. From now on, you'll need to enter a verification code from your authenticator app when signing in.
              </Typography>
              
              <Typography variant="body2" paragraph color="text.secondary">
                Redirecting you to your dashboard...
              </Typography>
            </Box>
          )}
          
          {activeStep === 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </>
      )}
      
      <Divider sx={{ my: 3 }} />
      
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Why use two-factor authentication?
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemIcon>
              <SecurityIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Adds an extra layer of security to your account" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <PhoneIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Prevents unauthorized access even if your password is compromised" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Protects your sensitive medical information" />
          </ListItem>
        </List>
      </Box>
    </Paper>
  );
} 