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
import { useCognitoAuth } from '@/hooks/useCognitoAuth';
import { UserProfileService } from '@/lib/api/services/user-profile.service';
import { CognitoUserAttributes, UserUpdatePayload } from '@/types/user';
import { useRouter } from 'next/navigation';
import { Edit as EditIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Image from 'next/image';
import { useToast } from '@/contexts/ToastContext';
import { routes } from '@/config/routes';
import type { Route } from 'next';

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
  const { isAuthenticated, isLoading: authLoading, user } = useCognitoAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userAttributes, setUserAttributes] = useState<CognitoUserAttributes>({});
  const [editMode, setEditMode] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [verificationSent, setVerificationSent] = useState<{ email?: boolean; phone?: boolean }>({});
  const [verificationCode, setVerificationCode] = useState<{ email?: string; phone?: string }>({});
  const [formValues, setFormValues] = useState<UserUpdatePayload>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const userProfileService = UserProfileService.getInstance();

  // Load user attributes on page load
  useEffect(() => {
    if (!isAuthenticated) {
      router.push(routes.root.login as Route);
      return;
    }
    
    const fetchUserAttributes = async () => {
      try {
        setLoading(true);
        const attributes = await userProfileService.getCurrentUserAttributes();
        setUserAttributes(attributes);
        // Initialize form values from attributes
        setFormValues({
          name: attributes.name,
          email: attributes.email,
          phoneNumber: attributes.phone_number,
          address: attributes.address,
          birthdate: attributes.birthdate,
          gender: attributes.gender,
          givenName: attributes.given_name,
          familyName: attributes.family_name,
          picture: attributes.picture,
          custom_preferences: attributes.custom_preferences
        });
      } catch (error) {
        console.error('Error fetching user attributes:', error);
        showToast(
          'Failed to load profile information. Please try again later.',
          'error'
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAttributes();
  }, [isAuthenticated, router, showToast]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleInputChange = (field: keyof UserUpdatePayload, value: string) => {
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
    
    // Phone validation (basic international format)
    if (formValues.phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(formValues.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number (e.g., +1234567890)';
    }
    
    // Birthdate validation (if provided, ensure it's in YYYY-MM-DD format)
    if (formValues.birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(formValues.birthdate)) {
      errors.birthdate = 'Please enter a valid date in YYYY-MM-DD format';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSave = async () => {
    if (!validateForm()) {
      showToast(
        'Please correct the errors before saving.',
        'error'
      );
      return;
    }
    
    try {
      setSaving(true);
      await userProfileService.updateUserAttributes(formValues);
      
      // Refresh user attributes
      const updatedAttributes = await userProfileService.getCurrentUserAttributes();
      setUserAttributes(updatedAttributes);
      
      setEditMode(false);
      showToast(
        'Profile updated successfully!',
        'success'
      );
    } catch (error) {
      console.error('Error updating user attributes:', error);
      showToast(
        'Failed to update profile. Please try again later.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };
  
  const handleRequestVerification = async (attribute: 'email' | 'phone_number') => {
    try {
      setLoading(true);
      await userProfileService.requestVerificationCode(attribute);
      setVerificationSent({
        ...verificationSent,
        [attribute === 'email' ? 'email' : 'phone']: true
      });
      showToast(
        `Verification code sent to your ${attribute === 'email' ? 'email' : 'phone'}!`,
        'success'
      );
    } catch (error) {
      console.error(`Error requesting ${attribute} verification:`, error);
      showToast(
        `Failed to send verification code. Please try again later.`,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyAttribute = async (attribute: 'email' | 'phone_number') => {
    const code = attribute === 'email' ? verificationCode.email : verificationCode.phone;
    
    if (!code) {
      showToast(
        'Please enter the verification code.',
        'error'
      );
      return;
    }
    
    try {
      setLoading(true);
      const success = await userProfileService.verifyAttribute(attribute, code);
      
      if (success) {
        // Refresh user attributes
        const updatedAttributes = await userProfileService.getCurrentUserAttributes();
        setUserAttributes(updatedAttributes);
        
        // Reset verification state
        setVerificationSent({
          ...verificationSent,
          [attribute === 'email' ? 'email' : 'phone']: false
        });
        setVerificationCode({
          ...verificationCode,
          [attribute === 'email' ? 'email' : 'phone']: ''
        });
        
        showToast(
          `Your ${attribute === 'email' ? 'email' : 'phone'} has been verified successfully!`,
          'success'
        );
      } else {
        showToast(
          'Verification failed. Please check the code and try again.',
          'error'
        );
      }
    } catch (error) {
      console.error(`Error verifying ${attribute}:`, error);
      showToast(
        'Verification failed. Please try again later.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate profile completion percentage
  const calculateProfileCompletion = (): number => {
    const totalFields = 10; // Total number of profile fields we track
    const filledFields = Object.keys(userAttributes).filter(key => 
      userAttributes[key] && 
      !key.includes('sub') && 
      !key.includes('custom:') && 
      !key.includes('_verified')
    ).length;
    
    return Math.min(Math.round((filledFields / totalFields) * 100), 100);
  };
  
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <LinearProgress color="primary" />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading profile information...
        </Typography>
      </Container>
    );
  }

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
                src={userAttributes.picture || ''}
                alt={userAttributes.name || 'User'}
                sx={{ width: 120, height: 120, margin: '0 auto 16px' }}
              />
              <Typography variant="h5" gutterBottom>
                {userAttributes.name || 'Your Name'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {userAttributes.email || 'email@example.com'}
              </Typography>
              
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Profile Completion
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={calculateProfileCompletion()} 
                  sx={{ mt: 1, mb: 1 }} 
                />
                <Typography variant="body2">
                  {calculateProfileCompletion()}% Complete
                </Typography>
              </Box>
              
              <Divider sx={{ mt: 2, mb: 2 }} />
              
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
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
                      color={userAttributes.email_verified === 'true' ? 'success' : 'error'} 
                      label={userAttributes.email_verified === 'true' ? 'Yes' : 'No'} 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Phone Verified:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Chip 
                      size="small" 
                      color={userAttributes.phone_number_verified === 'true' ? 'success' : 'error'} 
                      label={userAttributes.phone_number_verified === 'true' ? 'Yes' : 'No'} 
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      MFA Enabled:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Chip 
                      size="small" 
                      color="primary" 
                      label="Configure" 
                      onClick={() => router.push('/profile/mfa' as any)} 
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
                        // Reset form values to current attributes
                        setFormValues({
                          name: userAttributes.name,
                          email: userAttributes.email,
                          phoneNumber: userAttributes.phone_number,
                          address: userAttributes.address,
                          birthdate: userAttributes.birthdate,
                          gender: userAttributes.gender,
                          givenName: userAttributes.given_name,
                          familyName: userAttributes.family_name,
                          picture: userAttributes.picture
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Given Name"
                    fullWidth
                    value={formValues.givenName || ''}
                    onChange={(e) => handleInputChange('givenName', e.target.value)}
                    disabled={!editMode || saving}
                    margin="normal"
                    error={!!validationErrors.givenName}
                    helperText={validationErrors.givenName}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Family Name"
                    fullWidth
                    value={formValues.familyName || ''}
                    onChange={(e) => handleInputChange('familyName', e.target.value)}
                    disabled={!editMode || saving}
                    margin="normal"
                    error={!!validationErrors.familyName}
                    helperText={validationErrors.familyName}
                  />
                </Grid>
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
                    label="Phone Number"
                    fullWidth
                    value={formValues.phoneNumber || ''}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    disabled={!editMode || saving}
                    margin="normal"
                    placeholder="+1234567890"
                    error={!!validationErrors.phoneNumber}
                    helperText={validationErrors.phoneNumber || "Include country code, e.g. +1 for US"}
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Birthdate"
                    fullWidth
                    value={formValues.birthdate || ''}
                    onChange={(e) => handleInputChange('birthdate', e.target.value)}
                    disabled={!editMode || saving}
                    margin="normal"
                    placeholder="YYYY-MM-DD"
                    error={!!validationErrors.birthdate}
                    helperText={validationErrors.birthdate || "Format: YYYY-MM-DD"}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Gender"
                    fullWidth
                    select
                    SelectProps={{ native: true }}
                    value={formValues.gender || ''}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    disabled={!editMode || saving}
                    margin="normal"
                  >
                    <option value=""></option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Profile Picture URL"
                    fullWidth
                    value={formValues.picture || ''}
                    onChange={(e) => handleInputChange('picture', e.target.value)}
                    disabled={!editMode || saving}
                    margin="normal"
                    error={!!validationErrors.picture}
                    helperText={validationErrors.picture}
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
                {userAttributes.email_verified === 'true' ? (
                  <Alert severity="success">
                    <AlertTitle>Verified</AlertTitle>
                    Your email address ({userAttributes.email}) is verified.
                  </Alert>
                ) : (
                  <>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <AlertTitle>Verification Required</AlertTitle>
                      Your email address ({userAttributes.email}) needs to be verified.
                    </Alert>
                    
                    {verificationSent.email ? (
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={8}>
                          <TextField
                            label="Verification Code"
                            fullWidth
                            value={verificationCode.email || ''}
                            onChange={(e) => setVerificationCode({...verificationCode, email: e.target.value})}
                            disabled={loading}
                            placeholder="Enter the code sent to your email"
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Button
                            fullWidth
                            variant="contained"
                            onClick={() => handleVerifyAttribute('email')}
                            disabled={loading || !verificationCode.email}
                          >
                            Verify Email
                          </Button>
                        </Grid>
                      </Grid>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={() => handleRequestVerification('email')}
                        disabled={loading}
                      >
                        Send Verification Code
                      </Button>
                    )}
                  </>
                )}
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Phone Verification
              </Typography>
              <Box sx={{ mb: 3 }}>
                {!userAttributes.phone_number ? (
                  <Alert severity="info">
                    <AlertTitle>No Phone Number</AlertTitle>
                    Add a phone number in your profile to enable verification.
                  </Alert>
                ) : userAttributes.phone_number_verified === 'true' ? (
                  <Alert severity="success">
                    <AlertTitle>Verified</AlertTitle>
                    Your phone number ({userAttributes.phone_number}) is verified.
                  </Alert>
                ) : (
                  <>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <AlertTitle>Verification Required</AlertTitle>
                      Your phone number ({userAttributes.phone_number}) needs to be verified.
                    </Alert>
                    
                    {verificationSent.phone ? (
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={8}>
                          <TextField
                            label="Verification Code"
                            fullWidth
                            value={verificationCode.phone || ''}
                            onChange={(e) => setVerificationCode({...verificationCode, phone: e.target.value})}
                            disabled={loading}
                            placeholder="Enter the code sent to your phone"
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Button
                            fullWidth
                            variant="contained"
                            onClick={() => handleVerifyAttribute('phone_number')}
                            disabled={loading || !verificationCode.phone}
                          >
                            Verify Phone
                          </Button>
                        </Grid>
                      </Grid>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={() => handleRequestVerification('phone_number')}
                        disabled={loading}
                      >
                        Send Verification Code
                      </Button>
                    )}
                  </>
                )}
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Multi-Factor Authentication
              </Typography>
              <Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => router.push('/profile/mfa' as any)}
                >
                  Configure MFA
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
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Account Settings
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={() => router.push('/profile/security' as any)}
                sx={{ mt: 1 }}
              >
                Change Password
              </Button>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 