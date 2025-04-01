'use client';

import React, { useState, useEffect, ReactElement } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Box,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Save as SaveIcon,
} from '@mui/icons-material';
import { providerClient } from '@/lib/api/providerClient';
import { User, UserPreferences } from '@/lib/api/types';
import { ClerkAuthService } from '@/lib/clerk/auth-service';
import { useUser } from '@clerk/nextjs';
import { PracticeInfoForm } from './components/PracticeInfoForm';
import { NotificationSettingsForm } from './components/NotificationSettingsForm';
import { SecuritySettingsForm } from './components/SecuritySettingsForm';
import { ImageSharingSettingsForm } from './components/ImageSharingSettingsForm';
import { AvailabilitySettingsForm } from './components/AvailabilitySettingsForm';

interface PracticeInfo {
  practiceName: string;
  address: string;
  phone: string; 
  email: string;
  website: string;
  licenseNumber: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  imageUploadAlerts: boolean;
  systemUpdates: boolean;
  newPatientAlerts: boolean;
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  requirePatientVerification: boolean;
  ipWhitelist: string[];
  autoLogoutMinutes: number;
}

interface ImageSharingSettings {
  defaultLinkExpiry: number;
  requirePatientConsent: boolean;
  watermarkImages: boolean;
  allowDownloads: boolean;
  compressionQuality: 'low' | 'medium' | 'high';
}

interface AvailabilitySettings {
  workingHours: {
    [key: string]: {
      start: string;
      end: string;
      available: boolean;
    };
  };
  appointmentDuration: number;
  bufferTime: number;
}

export default function ProviderSettingsPage(): ReactElement {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [provider, setProvider] = useState<User | null>(null);
  const { user } = useUser();
  const [mfaSetup, setMfaSetup] = useState({
    qrCode: '',
    backupCodes: [] as string[],
    isSetupComplete: false,
  });

  // Practice Information
  const [practiceInfo, setPracticeInfo] = useState<PracticeInfo>({
    practiceName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    licenseNumber: '',
  });

  // Notification Settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: false,
    smsNotifications: false,
    appointmentReminders: false,
    imageUploadAlerts: false,
    systemUpdates: false,
    newPatientAlerts: false,
  });

  // Security Settings
  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorAuth: false,
    requirePatientVerification: false,
    ipWhitelist: [],
    autoLogoutMinutes: 30,
  });

  // Image Sharing Settings
  const [imageSharing, setImageSharing] = useState<ImageSharingSettings>({
    defaultLinkExpiry: 7,
    requirePatientConsent: true,
    watermarkImages: true,
    allowDownloads: true,
    compressionQuality: 'medium',
  });

  // Availability Settings
  const [availability, setAvailability] = useState<AvailabilitySettings>({
    workingHours: {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: '09:00', end: '13:00', available: false },
      sunday: { start: '09:00', end: '13:00', available: false },
    },
    appointmentDuration: 30,
    bufferTime: 15,
  });

  useEffect(() => {
    fetchProviderSettings();
  }, []);

  const fetchProviderSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await providerClient.getUserProfile();

      if (response.status === 'success' && response.data) {
        const user = response.data;
        setProvider(user);

        // Update practice info
        setPracticeInfo({
          practiceName: user.name || '',
          address: user.address || '',
          phone: user.phoneNumber || '',
          email: user.email || '',
          website: user.website || '',
          licenseNumber: user.licenseNumber || '',
        });

        // Update notification settings
        setNotifications({
          emailNotifications: user.preferences?.emailNotifications || false,
          smsNotifications: user.preferences?.smsNotifications || false,
          appointmentReminders: user.preferences?.pushNotifications || false,
          imageUploadAlerts: user.preferences?.pushNotifications || false,
          systemUpdates: user.preferences?.emailNotifications || false,
          newPatientAlerts: user.preferences?.pushNotifications || false,
        });

        // Update security settings
        setSecurity({
          twoFactorAuth: user.mfaEnabled || false,
          requirePatientVerification: user.preferences?.pushNotifications || false,
          ipWhitelist: [],
          autoLogoutMinutes: 30,
        });

        // Update image sharing settings
        setImageSharing({
          defaultLinkExpiry: 7,
          requirePatientConsent: true,
          watermarkImages: false,
          allowDownloads: false,
          compressionQuality: 'medium',
        });

        // Update availability settings
        setAvailability({
          workingHours: user.workingHours || {
            monday: { start: '09:00', end: '17:00', available: true },
            tuesday: { start: '09:00', end: '17:00', available: true },
            wednesday: { start: '09:00', end: '17:00', available: true },
            thursday: { start: '09:00', end: '17:00', available: true },
            friday: { start: '09:00', end: '17:00', available: true },
            saturday: { start: '09:00', end: '13:00', available: false },
            sunday: { start: '09:00', end: '13:00', available: false },
          },
          appointmentDuration: 30,
          bufferTime: 15,
        });

        // Check MFA status
        if (user) {
          const mfaStatus = await ClerkAuthService.getMFAStatus();
          setSecurity(prev => ({
            ...prev,
            twoFactorAuth: mfaStatus.enabled || false,
          }));
        }
      } else {
        setError(response.error?.message || 'Failed to fetch settings');
        console.error('Failed to fetch settings:', response);
      }
    } catch (err) {
      setError('An error occurred while fetching settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Update user profile
      const updateData: Partial<User> = {
        name: practiceInfo.practiceName,
        email: practiceInfo.email,
        phoneNumber: practiceInfo.phone,
        address: practiceInfo.address,
        website: practiceInfo.website,
        licenseNumber: practiceInfo.licenseNumber,
        preferences: {
          emailNotifications: notifications.emailNotifications,
          pushNotifications: notifications.appointmentReminders,
          smsNotifications: notifications.smsNotifications,
          theme: 'light',
          language: 'en'
        },
        workingHours: availability.workingHours,
      };

      const response = await providerClient.updateUserProfile(updateData);

      if (response.status === 'success') {
        setSuccess('Settings saved successfully');
        fetchProviderSettings(); // Refresh settings
      } else {
        setError(response.error?.message || 'Failed to save settings');
        console.error('Failed to save settings:', response);
      }
    } catch (err) {
      setError('An error occurred while saving settings');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccess(null);
  };

  // Handle MFA setup
  const handleMfaSetup = async () => {
    if (!user) return;
    
    try {
      const result = await ClerkAuthService.setupMFA('authenticator');
      
      if (result.success && result.qrCode && result.backupCodes) {
        setMfaSetup({
          qrCode: result.qrCode,
          backupCodes: result.backupCodes,
          isSetupComplete: false,
        });
      } else {
        throw new Error(result.error || 'Failed to setup MFA');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to setup MFA');
    }
  };

  // Handle MFA verification
  const handleMfaVerification = async (code: string) => {
    if (!user) return;
    
    try {
      const result = await ClerkAuthService.verifyMFA(code);
      
      if (result.success) {
        setSecurity(prev => ({ ...prev, twoFactorAuth: true }));
        setMfaSetup(prev => ({ ...prev, isSetupComplete: true }));
      } else {
        throw new Error('Invalid verification code');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify MFA code');
    }
  };

  // Handle MFA disable
  const handleMfaDisable = async () => {
    if (!user) return;
    
    try {
      const result = await ClerkAuthService.disableMFA('authenticator');
      
      if (result.success) {
        setSecurity(prev => ({ ...prev, twoFactorAuth: false }));
        setMfaSetup({
          qrCode: '',
          backupCodes: [],
          isSetupComplete: false,
        });
      } else {
        throw new Error(result.error || 'Failed to disable MFA');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to disable MFA');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <div className="flex justify-center items-center h-screen">
          <CircularProgress />
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {loading ? (
        <div className="flex justify-center items-center h-screen">
          <CircularProgress />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 mb-6">
            <PracticeInfoForm
              practiceInfo={practiceInfo}
              setPracticeInfo={setPracticeInfo}
            />
            <NotificationSettingsForm
              notifications={notifications}
              setNotifications={setNotifications}
            />
            <SecuritySettingsForm
              security={security}
              setSecurity={setSecurity}
            />
            <ImageSharingSettingsForm
              imageSharing={imageSharing}
              setImageSharing={setImageSharing}
            />
            <AvailabilitySettingsForm
              availability={availability}
              setAvailability={setAvailability}
            />
          </div>
          <div className="flex justify-end gap-4">
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </>
      )}
      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setError(null)} severity="error">
            {error}
          </Alert>
        </Snackbar>
      )}
      {success && (
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setSuccess(null)} severity="success">
            {success}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
} 