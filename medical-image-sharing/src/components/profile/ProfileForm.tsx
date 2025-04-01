'use client';

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Divider,
  Alert,
  Dialog,
  DialogContent,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import { Switch } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import { useAuth } from '@/lib/clerk/use-auth';
import { TwoFactorForm } from '@/components/auth/TwoFactorForm';
import { patientClient, providerClient, adminClient } from '@/lib/api';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { RefreshOutlined as RefreshIcon, LockOutlined as LockIcon } from '@mui/icons-material';
import { Role } from '@prisma/client';

// Note: Session interface is already extended in src/types/next-auth.d.ts

interface ProfileFormProps {
  additionalFields?: React.ReactNode;
  userData?: {
    name?: string;
    phoneNumber?: string;
  };
  onUpdate?: (response: any) => void;
}

interface ProfileData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface MFAData {
  enabled: boolean;
  method: 'sms' | 'authenticator';
}

// Tab interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `profile-tab-${index}`,
    'aria-controls': `profile-tabpanel-${index}`,
  };
}

export function ProfileFormComponent({ additionalFields, userData, onUpdate }: ProfileFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const { withErrorHandling, handleError } = useErrorHandler();
  const [tabValue, setTabValue] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: '',
  });

  const { syncUser } = useAuth();

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: '',
      });
    }
  }, [user]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await withErrorHandling(async () => {
      setIsSubmitting(true);
      setSuccess('');
      
      try {
        if (!user) throw new Error('User not authenticated');
        
        let response;
        const userRole = user.publicMetadata?.role as Role;
        
        if (userRole === Role.PATIENT) {
          response = await patientClient.updateSettings({
            personalInfo: {
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              dateOfBirth: '', // This should be handled separately
              phone: profileData.phoneNumber,
              email: user.emailAddresses[0]?.emailAddress || '',
              emergencyContact: {
                name: '',
                relationship: '',
                phone: ''
              }
            },
            privacy: {
              shareDataWithProviders: true,
              allowImageSharing: true,
              showProfileToOtherPatients: false,
              allowAnonymousDataUse: false
            },
            notifications: {
              emailNotifications: true,
              smsNotifications: true,
              appointmentReminders: true,
              imageShareNotifications: true,
              providerMessages: true,
              marketingEmails: false
            },
            communication: {
              preferredLanguage: 'en',
              preferredContactMethod: 'email',
              preferredAppointmentReminder: 'email'
            }
          });
        } else if (userRole === Role.PROVIDER) {
          response = await providerClient.updateSettings({
            personalInfo: {
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              phone: profileData.phoneNumber,
              email: user.emailAddresses[0]?.emailAddress || '',
            },
            providerSettings: {
              availableForAppointments: true,
              specialties: [],
              languages: ['en'],
              acceptingNewPatients: true
            }
          });
        } else {
          response = await adminClient.updateSettings({
            personalInfo: {
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              phone: profileData.phoneNumber,
              email: user.emailAddresses[0]?.emailAddress || '',
            },
            adminSettings: {
              notificationsEnabled: true,
              systemAlerts: true,
              activityReports: true
            }
          });
        }

        // Update Clerk user data
        await user.update({
          firstName: profileData.firstName || null,
          lastName: profileData.lastName || null,
          unsafeMetadata: {
            ...user.unsafeMetadata,
            phoneNumber: profileData.phoneNumber,
          },
        });

        // After successful profile update, sync with database
        await syncUser();

        setSuccess('Profile updated successfully');
        if (onUpdate) onUpdate(response);
      } catch (error) {
        handleError(error);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  if (!user) return <LoadingState />;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Profile" />
        <Tab label="Security" />
        <Tab label="Notifications" />
      </Tabs>

      {tabValue === 0 && (
        <Box>
          <TextField
            fullWidth
            label="First Name"
            value={profileData.firstName}
            onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Last Name"
            value={profileData.lastName}
            onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Phone Number"
            value={profileData.phoneNumber}
            onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            value={user.emailAddresses[0]?.emailAddress || ''}
            disabled
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Role"
            value={user.publicMetadata?.role || ''}
            disabled
            sx={{ mb: 2 }}
          />
          {additionalFields}
          <Box sx={{ mt: 2 }}>
            <Button
              onClick={handleProfileSubmit}
              variant="contained"
              color="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                'Update Profile'
              )}
            </Button>
            {success && (
              <Typography color="success.main" sx={{ mt: 1 }}>
                {success}
              </Typography>
            )}
            {error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Security settings are managed through Clerk&apos;s dashboard
            </Typography>
          </Box>
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notification Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your notification preferences
            </Typography>
          </Box>
          {/* Add notification settings here */}
        </Box>
      )}
    </Box>
  );
}

export default ProfileFormComponent; 