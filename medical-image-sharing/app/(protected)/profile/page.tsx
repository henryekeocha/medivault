'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Divider,
  Avatar,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { Edit as EditIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Image from 'next/image';
import { useToast } from '@/contexts/ToastContext';
import { routes } from '@/config/routes';
import type { Route } from 'next';
import { useSession } from 'next-auth/react';
import { UserProfileService, UserProfile } from '@/lib/api/services/user-profile.service';

// Tab panel component
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [verificationSent, setVerificationSent] = useState<{ email?: boolean; phone?: boolean }>({});
  const [verificationCode, setVerificationCode] = useState<{ email?: string; phone?: string }>({});
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formValues, setFormValues] = useState<Partial<UserProfile>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update the service instantiation
  const userProfileService = UserProfileService.getInstance();

  // Update the profile loading effect
  useEffect(() => {
    if (session?.user) {
      const loadProfile = async () => {
        try {
          const profileData = await userProfileService.getCurrentUserProfile();
          setProfile(profileData);
          setFormValues({
            name: profileData.name,
            email: profileData.email,
            phoneNumber: profileData.phoneNumber,
            address: profileData.address,
            birthdate: profileData.birthdate,
            gender: profileData.gender,
            image: profileData.image,
          });
        } catch (error) {
          console.error('Error loading profile:', error);
          showToast('Failed to load profile information', 'error');
        }
      };
      loadProfile();
    }
  }, [session, showToast]);

  // Calculate profile completion
  const calculateProfileCompletion = (): number => {
    if (!profile) return 0;
    
    const requiredFields = ['name', 'email', 'phoneNumber', 'address', 'birthdate', 'gender'];
    const completedFields = requiredFields.filter(field => !!profile[field as keyof UserProfile]);
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  // Update verification request handler
  const handleRequestVerification = async (type: 'email' | 'phone') => {
    try {
      await userProfileService.requestVerification(type);
      setVerificationSent({ ...verificationSent, [type]: true });
      showToast(`Verification code sent to your ${type}!`, 'success');
    } catch (error) {
      console.error(`Error requesting ${type} verification:`, error);
      showToast(`Failed to send verification code`, 'error');
    }
  };

  // Update verification submission handler
  const handleVerifyAttribute = async (type: 'email' | 'phone') => {
    const code = type === 'email' ? verificationCode.email : verificationCode.phone;
    if (!code) {
      showToast('Please enter the verification code', 'error');
      return;
    }

    try {
      await userProfileService.verifyAttribute(type, code);
      
      // Update profile data after verification
      const updatedProfile = await userProfileService.getCurrentUserProfile();
      setProfile(updatedProfile);
      
      setVerificationSent({ ...verificationSent, [type]: false });
      setVerificationCode({ ...verificationCode, [type]: '' });
      
      showToast(`Your ${type} has been verified successfully!`, 'success');
    } catch (error) {
      console.error(`Error verifying ${type}:`, error);
      showToast('Verification failed. Please try again', 'error');
    }
  };

  // Update profile save handler
  const handleSave = async () => {
    if (!validateForm()) {
      showToast('Please correct the errors before saving', 'error');
      return;
    }

    try {
      setSaving(true);
      await userProfileService.updateProfile(formValues);
      
      // Update session data if name or email changed
      if (formValues.name !== session?.user?.name || formValues.email !== session?.user?.email) {
        await updateSession();
      }
      
      // Refresh profile data
      const updatedProfile = await userProfileService.getCurrentUserProfile();
      setProfile(updatedProfile);
      
      setEditMode(false);
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile. Please try again later', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <LinearProgress color="primary" />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading profile information...
        </Typography>
      </Container>
    );
  }

  if (!session) {
    router.push(routes.root.login as Route);
    return null;
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleInputChange = (field: keyof typeof formValues, value: string) => {
    setFormValues({ ...formValues, [field]: value });
    
    // Clear validation error when field is edited
    if (validationErrors[field]) {
      const newErrors = { ...validationErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Email validation
    if (formValues.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Profile
      </Typography>
      
      <Grid container spacing={3}>
        {/* Profile Summary Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                alt={session.user?.name || 'User'}
                src={profile?.image || ''}
                sx={{ width: 120, height: 120, margin: '0 auto 16px' }}
              />
              <Typography variant="h5" gutterBottom>
                {session.user?.name || 'Your Name'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {session.user?.email || 'email@example.com'}
              </Typography>
              
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Account Status
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Email Verified:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Chip 
                      size="small" 
                      color={profile?.emailVerified ? "success" : "error"}
                      label={profile?.emailVerified ? "Yes" : "No"}
                    />
                  </Grid>
                  {profile?.phoneNumber && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Phone Verified:
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Chip 
                          size="small" 
                          color={profile?.phoneVerified ? "success" : "error"}
                          label={profile?.phoneVerified ? "Yes" : "No"}
                        />
                      </Grid>
                    </>
                  )}
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Role:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Chip 
                      size="small" 
                      color="primary" 
                      label={session.user?.role || 'User'} 
                    />
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Profile Details */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="profile tabs">
                <Tab label="Personal Information" id="profile-tab-0" aria-controls="profile-tabpanel-0" />
                <Tab label="Security & Verification" id="profile-tab-1" aria-controls="profile-tabpanel-1" />
                <Tab label="Preferences" id="profile-tab-2" aria-controls="profile-tabpanel-2" />
              </Tabs>
            </Box>
            
            {/* Personal Information Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                {!editMode ? (
                  <Button 
                    startIcon={<EditIcon />} 
                    onClick={() => setEditMode(true)}
                    variant="outlined"
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Box>
                    <Button 
                      startIcon={<CloseIcon />}
                      onClick={() => {
                        setEditMode(false);
                        // Reset form values to current session data
                        setFormValues({
                          name: session.user?.name || '',
                          email: session.user?.email || '',
                          role: session.user?.role || '',
                        });
                        setValidationErrors({});
                      }}
                      variant="outlined"
                      color="error"
                      sx={{ mr: 1 }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      startIcon={<CheckIcon />}
                      onClick={handleSave}
                      variant="contained"
                      color="primary"
                      disabled={saving}
                    >
                      Save Changes
                    </Button>
                  </Box>
                )}
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Full Name"
                    fullWidth
                    value={formValues.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!editMode || saving}
                    margin="normal"
                    error={!!validationErrors.name}
                    helperText={validationErrors.name}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={formValues.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!editMode || saving}
                    margin="normal"
                    error={!!validationErrors.email}
                    helperText={validationErrors.email}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Role"
                    fullWidth
                    value={formValues.role || ''}
                    disabled={true}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Phone Number"
                    fullWidth
                    value={formValues.phoneNumber || ''}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    disabled={!editMode || saving}
                    margin="normal"
                    error={!!validationErrors.phoneNumber}
                    helperText={validationErrors.phoneNumber}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Address"
                    fullWidth
                    multiline
                    rows={3}
                    value={formValues.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    disabled={!editMode || saving}
                    margin="normal"
                    error={!!validationErrors.address}
                    helperText={validationErrors.address}
                  />
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Security & Verification Tab */}
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                Email Verification
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Alert severity="success">
                  <AlertTitle>Verified</AlertTitle>
                  Your email address ({session.user?.email}) is verified.
                </Alert>
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Password
              </Typography>
              <Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => router.push(routes.settings.security as Route)}
                >
                  Change Password
                </Button>
              </Box>
            </TabPanel>
            
            {/* Preferences Tab */}
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                Notification Preferences
              </Typography>
              <FormControlLabel
                control={<Switch checked={true} />}
                label="Email Notifications"
                disabled={true}
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                Coming soon: Customize which email notifications you receive
              </Typography>
              
              <FormControlLabel
                control={<Switch checked={false} />}
                label="SMS Notifications"
                disabled={true}
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                Coming soon: Customize which SMS notifications you receive
              </Typography>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Session Preferences
              </Typography>
              <FormControlLabel
                control={<Switch checked={true} />}
                label="Keep me signed in on this device"
                disabled={true}
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
                Coming soon: Manage your session persistence settings
              </Typography>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 