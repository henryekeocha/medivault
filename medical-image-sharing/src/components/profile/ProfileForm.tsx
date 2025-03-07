'use client';

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Dialog,
  DialogContent,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { TwoFactorForm } from '@/components/auth/TwoFactorForm';
import { ApiClient } from '@/lib/api/client'; 
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { RefreshOutlined as RefreshIcon } from '@mui/icons-material';

interface ProfileFormProps {
  additionalFields?: React.ReactNode;
}

// Create a profile data interface to include phoneNumber
interface ProfileData {
  name: string;
  phoneNumber: string;
}

export function ProfileForm({ additionalFields }: ProfileFormProps) {
  const { state, dispatch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: state.user?.name || '',
    phoneNumber: (state.user as any)?.phoneNumber || '', // Type assertion for phoneNumber
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const { error, handleError, clearError, withErrorHandling } = useErrorHandler({
    context: 'Profile Management'
  });
  
  const apiClient = ApiClient.getInstance();

  // Update profileData when user data changes
  useEffect(() => {
    if (state.user) {
      setProfileData({
        name: state.user.name || '',
        phoneNumber: (state.user as any)?.phoneNumber || '', // Type assertion for phoneNumber
      });
    }
  }, [state.user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await withErrorHandling(async () => {
      setLoading(true);
      setSuccess('');
      
      try {
        const response = await apiClient.updateProfile(profileData);
        
        if (response.data) {
          setSuccess('Profile updated successfully');
          
          // Update the user in the auth context
          if (state.user) {
            dispatch({
              type: 'SET_USER',
              payload: {
                ...state.user,
                ...profileData
              }
            });
          }
        } else {
          throw new Error('Failed to update profile: No data returned');
        }
      } finally {
        setLoading(false);
      }
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      handleError(new Error('New passwords do not match'));
      return;
    }

    await withErrorHandling(async () => {
      setLoading(true);
      setSuccess('');
      
      try {
        await apiClient.changePassword(
          passwordData.currentPassword, 
          passwordData.newPassword
        );
        
        setSuccess('Password updated successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } finally {
        setLoading(false);
      }
    });
  };

  const handleTwoFactorToggle = () => {
    setShowTwoFactorSetup(true);
  };

  const handleTwoFactorSetup = async (code: string) => {
    await withErrorHandling(async () => {
      setLoading(true);
      
      try {
        // First enable 2FA if not already enabled
        if (!state.user?.twoFactorEnabled) {
          await apiClient.toggleTwoFactor(true);
        }
        
        // Then verify with the provided code
        await apiClient.verifyTwoFactor(code, ''); // The secret would be managed on the server
        
        setSuccess('Two-factor authentication enabled successfully');
        setShowTwoFactorSetup(false);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleTwoFactorResend = async () => {
    await withErrorHandling(async () => {
      setLoading(true);
      try {
        // Disable current 2FA and then re-enable to get a new secret
        await apiClient.toggleTwoFactor(false);
        const response = await apiClient.toggleTwoFactor(true);
        
        // We don't return the value here as onResend is defined as () => Promise<void>
        // Just store it in state if needed
        if (response.data) {
          // Update any necessary state with the new secret/QR code
        }
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <Grid container spacing={4}>
      {/* Profile Information */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>
          
          {error && error.includes('Profile update failed') && (
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
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleProfileSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  disabled={loading}
                  error={!!error && error.includes('Profile update failed')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={state.user?.email}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phoneNumber"
                  value={profileData.phoneNumber}
                  onChange={handleProfileChange}
                  disabled={loading}
                  error={!!error && error.includes('Profile update failed')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Role"
                  value={state.user?.role}
                  disabled
                />
              </Grid>
              {additionalFields}
              <Grid item xs={12}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    'Update Profile'
                  )}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Grid>

      {/* Security Settings */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Security Settings
          </Typography>

          {error && 
            (error.includes('Password update failed') || 
             error.includes('Password validation failed')) && (
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
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handlePasswordChange}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Current Password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  disabled={loading}
                  error={!!error && 
                    (error.includes('Password update failed') || 
                     error.includes('Password validation failed'))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  disabled={loading}
                  error={!!error && error.includes('Password validation failed')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Confirm New Password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  disabled={loading}
                  error={!!error && error.includes('Password validation failed')}
                />
              </Grid>
              <Grid item xs={12}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={loading}
                >
                  Change Password
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Two-Factor Authentication
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={state.user?.twoFactorEnabled || false}
                onChange={handleTwoFactorToggle}
                disabled={loading}
              />
            }
            label="Enable Two-Factor Authentication"
          />

          <Dialog open={showTwoFactorSetup} onClose={() => setShowTwoFactorSetup(false)}>
            <DialogContent>
              <TwoFactorForm
                email={state.user?.email || ''}
                onVerify={handleTwoFactorSetup}
                onResend={handleTwoFactorResend}
              />
            </DialogContent>
          </Dialog>
        </Paper>
      </Grid>
    </Grid>
  );
} 