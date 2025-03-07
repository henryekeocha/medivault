'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Divider,
  Alert,
  AlertTitle,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Chip,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { useCognitoAuth } from '@/hooks/useCognitoAuth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import PhoneIcon from '@mui/icons-material/Phone';
import VerifiedIcon from '@mui/icons-material/Verified';
import SecurityIcon from '@mui/icons-material/Security';
import PhonelinkLockIcon from '@mui/icons-material/PhonelinkLock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Image from 'next/image';
import { MfaService } from '@/lib/auth/mfa-service';
import { logAudit, AuditEventType } from '@/lib/audit-logger';
import { routes } from '@/config/routes';
import type { Route } from 'next';

interface MFAState {
  isMFAEnabled: boolean;
  preferredMFA: 'TOTP' | 'SMS' | 'NONE';
  availableMFA: string[];
  qrCode?: string;
  secret?: string;
  isLoading: boolean;
  error?: string;
}

interface MFASetupSteps {
  totp: number;
  sms: number;
}

export default function MFAPage() {
  const auth = useCognitoAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [mfaState, setMFAState] = useState<MFAState>({
    isMFAEnabled: false,
    preferredMFA: 'NONE',
    availableMFA: [],
    isLoading: true,
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [mfaType, setMFAType] = useState<'TOTP' | 'SMS'>('TOTP');
  const [activeStep, setActiveStep] = useState<MFASetupSteps>({ totp: 0, sms: 0 });
  const [mfaService] = useState(() => new MfaService());
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!auth.isAuthenticated && !auth.isLoading) {
      router.push(routes.root.login as Route);
    }
  }, [auth.isAuthenticated, auth.isLoading, router]);
  
  // Fetch MFA status on page load
  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    fetchMFAStatus();
  }, [auth.isAuthenticated, router]);
  
  const fetchMFAStatus = async () => {
    try {
      setMFAState(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      const isMfaEnabled = await mfaService.isMfaEnabled();
      
      // Since getMfaStatus doesn't exist, we'll use a simpler approach
      setMFAState({
        isMFAEnabled: isMfaEnabled,
        preferredMFA: isMfaEnabled ? 'TOTP' : 'NONE', // Default to TOTP if enabled
        availableMFA: isMfaEnabled ? ['TOTP'] : [],
        isLoading: false,
      });
      
      logAudit('MFA_STATUS_CHECKED' as AuditEventType, {
        status: 'success',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching MFA status:', error);
      setMFAState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch MFA status. Please try again.'
      }));
      
      logAudit('MFA_STATUS_CHECK_FAILED' as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  const handleStartTOTPSetup = async () => {
    try {
      setMFAState(prev => ({ ...prev, isLoading: true, error: undefined }));
      setActiveStep({ ...activeStep, totp: 1 });
      
      const setupData = await mfaService.setupMfa();
      
      if (setupData) {
        setMFAState(prev => ({
          ...prev,
          qrCode: setupData.qrCode,
          secret: setupData.secret,
          isLoading: false
        }));
      } else {
        throw new Error('Failed to set up TOTP MFA');
      }
      
      logAudit('TOTP_MFA_SETUP_INITIATED', {
        status: 'success',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error setting up TOTP:', error);
      setMFAState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to set up TOTP. Please try again.'
      }));
      setActiveStep({ ...activeStep, totp: 0 });
      
      logAudit('MFA_TOTP_SETUP_FAILED' as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  const handleStartSMSSetup = async () => {
    try {
      setMFAState(prev => ({ ...prev, isLoading: true, error: undefined }));
      setActiveStep({ ...activeStep, sms: 1 });
      
      // MfaService doesn't have setupSmsMfa, so we'll use a direct API call
      const response = await fetch('/api/auth/cognito/mfa/sms/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMFAState(prev => ({
          ...prev,
          isLoading: false
        }));
      } else {
        throw new Error('Failed to set up SMS MFA');
      }
      
      logAudit('SMS_MFA_SETUP_INITIATED', {
        status: 'success',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error setting up SMS MFA:', error);
      setMFAState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to set up SMS MFA. Please verify your phone number in your profile first.'
      }));
      setActiveStep({ ...activeStep, sms: 0 });
      
      logAudit('MFA_SMS_SETUP_FAILED' as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  const handleVerifyMFA = async () => {
    try {
      if (!verificationCode) {
        setMFAState(prev => ({ ...prev, error: 'Please enter the verification code' }));
        return;
      }
      
      setMFAState(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      let success = false;
      
      if (activeStep.totp > 0) {
        success = await mfaService.confirmMfaSetup(verificationCode, mfaState.secret || '');
      } else if (activeStep.sms > 0) {
        // MfaService doesn't have confirmSmsMfaSetup, so we'll use a direct API call
        const response = await fetch('/api/auth/cognito/mfa/sms/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: verificationCode
          })
        });
        
        const data = await response.json();
        success = data.success;
      }
      
      if (success) {
        showToast('MFA setup completed successfully', 'success');
        
        const eventType = activeStep.totp > 0 ? 'TOTP_MFA_SETUP_COMPLETED' : 'SMS_MFA_SETUP_COMPLETED';
        logAudit(eventType as AuditEventType, {
          status: 'success',
          timestamp: new Date().toISOString()
        });
        
        // Reset state and fetch updated MFA status
        setActiveStep({ totp: 0, sms: 0 });
        setVerificationCode('');
        await fetchMFAStatus();
      } else {
        throw new Error('Failed to verify MFA setup');
      }
    } catch (error) {
      console.error(`Error verifying ${mfaType} MFA:`, error);
      setMFAState(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to verify ${mfaType} MFA. Please check the code and try again.`
      }));
      
      logAudit(`MFA_${mfaType}_VERIFICATION_FAILED` as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setMFAState(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  const handleSetPreferredMFA = async (method: 'TOTP' | 'SMS') => {
    try {
      setMFAState(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      // MfaService doesn't have setPreferredMfa, so we'll use a direct API call
      const response = await fetch('/api/auth/cognito/mfa/preferred', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferredMFA: method
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast(`${method} is now your preferred MFA method`, 'success');
        
        logAudit('MFA_PREFERRED_METHOD_UPDATED', {
          status: 'success',
          timestamp: new Date().toISOString(),
          method
        });
        
        // Update local state
        setMFAState(prev => ({
          ...prev,
          preferredMFA: method,
          isLoading: false
        }));
      } else {
        throw new Error('Failed to set preferred MFA method');
      }
    } catch (error) {
      console.error('Error setting preferred MFA:', error);
      setMFAState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to set preferred MFA method. Please try again.'
      }));
      
      logAudit('MFA_PREFERRED_METHOD_UPDATE_FAILED' as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setMFAState(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  const handleDisableMFA = async () => {
    try {
      setMFAState(prev => ({ ...prev, isLoading: true, error: undefined }));
      
      const success = await mfaService.disableMfa();
      
      if (success) {
        showToast('MFA has been disabled', 'success');
        
        logAudit('MFA_DISABLED', {
          status: 'success',
          timestamp: new Date().toISOString()
        });
        
        // Reset state and fetch updated MFA status
        await fetchMFAStatus();
      } else {
        throw new Error('Failed to disable MFA');
      }
    } catch (error) {
      console.error('Error disabling MFA:', error);
      setMFAState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to disable MFA. Please try again.'
      }));
      
      logAudit('MFA_DISABLE_FAILED' as AuditEventType, {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setMFAState(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  if (mfaState.isLoading && !mfaState.qrCode) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', mt: 4 }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading MFA settings...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/profile')}
          sx={{ mr: 2 }}
        >
          Back to Profile
        </Button>
        <Typography variant="h4">Multi-Factor Authentication</Typography>
      </Box>
      
      {mfaState.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {mfaState.error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* MFA Status Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                MFA Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1">
                    MFA Enabled:
                    <Chip 
                      sx={{ ml: 1 }}
                      size="small" 
                      color={mfaState.isMFAEnabled ? 'success' : 'error'} 
                      label={mfaState.isMFAEnabled ? 'Yes' : 'No'} 
                    />
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1">
                    Preferred Method:
                    <Chip 
                      sx={{ ml: 1 }}
                      size="small" 
                      color={mfaState.preferredMFA === 'NONE' ? 'error' : 'primary'} 
                      label={mfaState.preferredMFA === 'NONE' ? 'Not Set' : mfaState.preferredMFA} 
                    />
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body1">
                    Available Methods:
                    {mfaState.availableMFA.length === 0 ? (
                      <Chip 
                        sx={{ ml: 1 }}
                        size="small" 
                        color="error" 
                        label="None" 
                      />
                    ) : (
                      mfaState.availableMFA.map((method) => (
                        <Chip 
                          key={method}
                          sx={{ ml: 1 }}
                          size="small" 
                          color="success" 
                          label={method} 
                        />
                      ))
                    )}
                  </Typography>
                </Grid>
              </Grid>
              
              {mfaState.isMFAEnabled && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDisableMFA}
                    disabled={mfaState.isLoading}
                  >
                    Disable MFA
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* TOTP Setup */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PhonelinkLockIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Authenticator App (TOTP)</Typography>
              </Box>
              
              <Stepper activeStep={activeStep.totp} sx={{ mb: 3 }}>
                <Step>
                  <StepLabel>Setup</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Scan QR</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Verified</StepLabel>
                </Step>
              </Stepper>
              
              {activeStep.totp === 0 && (
                <Box>
                  <Typography variant="body1" paragraph>
                    Use an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy to generate time-based verification codes.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleStartTOTPSetup}
                    disabled={mfaState.isLoading}
                    fullWidth
                  >
                    Set Up TOTP
                  </Button>
                </Box>
              )}
              
              {activeStep.totp === 1 && mfaState.qrCode && (
                <Box>
                  <Typography variant="body1" paragraph>
                    1. Scan this QR code with your authenticator app.
                  </Typography>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <img 
                      src={mfaState.qrCode} 
                      alt="QR Code" 
                      style={{ maxWidth: '200px', margin: '0 auto' }} 
                    />
                  </Box>
                  
                  <Typography variant="body1" paragraph>
                    2. If you can't scan the QR code, enter this secret key manually:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, overflowX: 'auto' }}>
                    <Typography variant="body2" fontFamily="monospace">
                      {mfaState.secret}
                    </Typography>
                  </Paper>
                  
                  <Typography variant="body1" paragraph>
                    3. Enter the verification code from your app:
                  </Typography>
                  <Box sx={{ display: 'flex', mb: 2 }}>
                    <TextField
                      label="Verification Code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      disabled={mfaState.isLoading}
                      fullWidth
                      inputProps={{ maxLength: 6 }}
                      margin="normal"
                    />
                  </Box>
                  
                  <Button
                    variant="contained"
                    onClick={handleVerifyMFA}
                    disabled={mfaState.isLoading || !verificationCode}
                    fullWidth
                  >
                    {mfaState.isLoading ? <CircularProgress size={24} /> : 'Verify Code'}
                  </Button>
                </Box>
              )}
              
              {activeStep.totp === 2 && (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <AlertTitle>Setup Complete</AlertTitle>
                    TOTP has been successfully set up!
                  </Alert>
                  
                  {!mfaState.availableMFA.includes('TOTP') && (
                    <Typography variant="body2" color="text.secondary">
                      Please refresh the page to see updated MFA status.
                    </Typography>
                  )}
                  
                  {mfaState.availableMFA.includes('TOTP') && mfaState.preferredMFA !== 'TOTP' && (
                    <Button
                      variant="contained"
                      onClick={() => handleSetPreferredMFA('TOTP')}
                      disabled={mfaState.isLoading}
                      fullWidth
                    >
                      Make TOTP Preferred Method
                    </Button>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* SMS Setup */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PhoneIcon sx={{ mr: 1 }} />
                <Typography variant="h6">SMS Authentication</Typography>
              </Box>
              
              <Stepper activeStep={activeStep.sms} sx={{ mb: 3 }}>
                <Step>
                  <StepLabel>Setup</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Verify Code</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Verified</StepLabel>
                </Step>
              </Stepper>
              
              {activeStep.sms === 0 && (
                <Box>
                  <Typography variant="body1" paragraph>
                    Receive verification codes via SMS to your registered phone number. Make sure your phone number is verified in your profile.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={handleStartSMSSetup}
                    disabled={mfaState.isLoading}
                    fullWidth
                  >
                    Set Up SMS
                  </Button>
                </Box>
              )}
              
              {activeStep.sms === 1 && (
                <Box>
                  <Typography variant="body1" paragraph>
                    Enter the verification code sent to your phone:
                  </Typography>
                  <Box sx={{ display: 'flex', mb: 2 }}>
                    <TextField
                      label="Verification Code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      disabled={mfaState.isLoading}
                      fullWidth
                      inputProps={{ maxLength: 6 }}
                      margin="normal"
                    />
                  </Box>
                  
                  <Button
                    variant="contained"
                    onClick={handleVerifyMFA}
                    disabled={mfaState.isLoading || !verificationCode}
                    fullWidth
                  >
                    {mfaState.isLoading ? <CircularProgress size={24} /> : 'Verify Code'}
                  </Button>
                </Box>
              )}
              
              {activeStep.sms === 2 && (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <AlertTitle>Setup Complete</AlertTitle>
                    SMS authentication has been successfully set up!
                  </Alert>
                  
                  {!mfaState.availableMFA.includes('SMS_MFA') && (
                    <Typography variant="body2" color="text.secondary">
                      Please refresh the page to see updated MFA status.
                    </Typography>
                  )}
                  
                  {mfaState.availableMFA.includes('SMS_MFA') && mfaState.preferredMFA !== 'SMS' && (
                    <Button
                      variant="contained"
                      onClick={() => handleSetPreferredMFA('SMS')}
                      disabled={mfaState.isLoading}
                      fullWidth
                    >
                      Make SMS Preferred Method
                    </Button>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* MFA Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                About Multi-Factor Authentication
              </Typography>
              <Typography variant="body1" paragraph>
                Multi-Factor Authentication (MFA) adds an extra layer of security to your account. When MFA is enabled, you'll need to provide:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <VerifiedIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Something you know" 
                    secondary="Your password" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Something you have" 
                    secondary="Your phone or authenticator app" 
                  />
                </ListItem>
              </List>
              <Typography variant="body1" paragraph>
                This ensures that even if someone obtains your password, they still can't access your account without the second factor.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
} 