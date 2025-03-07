'use client';

import React, { useState } from 'react';
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
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { ApiClient } from '@/lib/api/client';

// Extend the ApiClient interface to include the missing method
declare module '@/lib/api/client' {
  interface ApiClient {
    updatePatientSettings(settings: any): Promise<{
      status: string;
      data?: any;
      error?: { message: string };
    }>;
  }
}

export default function PatientSettingsPage() { 
  // Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    phone: '(555) 123-4567',
    email: 'john.doe@example.com',
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'Spouse',
      phone: '(555) 987-6543',
    },
  });

  // Privacy Settings
  const [privacy, setPrivacy] = useState({
    shareDataWithProviders: true,
    allowImageSharing: true,
    showProfileToOtherPatients: false,
    allowAnonymousDataUse: true,
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    appointmentReminders: true,
    imageShareNotifications: true,
    providerMessages: true,
    marketingEmails: false,
  });

  // Communication Preferences
  const [communication, setCommunication] = useState({
    preferredLanguage: 'en',
    preferredContactMethod: 'email',
    preferredAppointmentReminder: '24h',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const { handleError, withErrorHandling, loading, error, clearErrors } = useErrorHandler();

  // Define the function that will be wrapped by withErrorHandling
  const saveFn = async () => {
    // Combine all settings data
    const settingsData = {
      personalInfo,
      privacy,
      notifications,
      communication
    };

    // API call to save settings
    const apiClient = ApiClient.getInstance();
    const response = await apiClient.updatePatientSettings(settingsData);

    if (response.status === 'success') {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      throw new Error(response.error?.message || 'Failed to save settings');
    }
  };

  // Create a wrapped version of the function with error handling
  const handleSave = () => withErrorHandling(saveFn, {
    showToast: true,
    successMessage: 'Settings saved successfully'
  });

  // Create a proper event handler for the retry button
  const handleRetry = async (e: React.MouseEvent) => {
    e.preventDefault();
    clearErrors();
    try {
      await handleSave();
    } catch (error: unknown) {
      // Error is already handled by withErrorHandling
      console.error("Error in retry:", error);
    }
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await handleSave();
    } catch (error: unknown) {
      // Error is already handled by withErrorHandling
      console.error("Error in save:", error);
    }
  };

  const handleCloseSuccess = () => {
    setSaveSuccess(false);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Patient Settings
      </Typography>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRetry}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={handleCloseSuccess}
        message="Settings saved successfully"
      />

      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={personalInfo.firstName}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={personalInfo.lastName}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  type="date"
                  value={personalInfo.dateOfBirth}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={personalInfo.email}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Emergency Contact
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Emergency Contact Name"
                  value={personalInfo.emergencyContact.name}
                  onChange={(e) => setPersonalInfo({
                    ...personalInfo,
                    emergencyContact: { ...personalInfo.emergencyContact, name: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Relationship"
                  value={personalInfo.emergencyContact.relationship}
                  onChange={(e) => setPersonalInfo({
                    ...personalInfo,
                    emergencyContact: { ...personalInfo.emergencyContact, relationship: e.target.value }
                  })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Emergency Contact Phone"
                  value={personalInfo.emergencyContact.phone}
                  onChange={(e) => setPersonalInfo({
                    ...personalInfo,
                    emergencyContact: { ...personalInfo.emergencyContact, phone: e.target.value }
                  })}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Privacy Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Privacy Settings
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Share Data with Providers"
                  secondary="Allow your healthcare providers to access your medical data"
                />
                <Switch
                  checked={privacy.shareDataWithProviders}
                  onChange={(e) => setPrivacy({ ...privacy, shareDataWithProviders: e.target.checked })}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Allow Image Sharing"
                  secondary="Allow providers to share your medical images with other healthcare professionals"
                />
                <Switch
                  checked={privacy.allowImageSharing}
                  onChange={(e) => setPrivacy({ ...privacy, allowImageSharing: e.target.checked })}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Show Profile to Other Patients"
                  secondary="Make your profile visible to other patients in support groups"
                />
                <Switch
                  checked={privacy.showProfileToOtherPatients}
                  onChange={(e) => setPrivacy({ ...privacy, showProfileToOtherPatients: e.target.checked })}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Notification Preferences
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="Email Notifications" />
                <Switch
                  checked={notifications.emailNotifications}
                  onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="SMS Notifications" />
                <Switch
                  checked={notifications.smsNotifications}
                  onChange={(e) => setNotifications({ ...notifications, smsNotifications: e.target.checked })}
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="Appointment Reminders" />
                <Switch
                  checked={notifications.appointmentReminders}
                  onChange={(e) => setNotifications({ ...notifications, appointmentReminders: e.target.checked })}
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="Image Share Notifications" />
                <Switch
                  checked={notifications.imageShareNotifications}
                  onChange={(e) => setNotifications({ ...notifications, imageShareNotifications: e.target.checked })}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Communication Preferences */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Communication Preferences
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Preferred Language</InputLabel>
                  <Select
                    value={communication.preferredLanguage}
                    label="Preferred Language"
                    onChange={(e) => setCommunication({ ...communication, preferredLanguage: e.target.value as string })}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Preferred Contact Method</InputLabel>
                  <Select
                    value={communication.preferredContactMethod}
                    label="Preferred Contact Method"
                    onChange={(e) => setCommunication({ ...communication, preferredContactMethod: e.target.value as string })}
                  >
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                    <MenuItem value="phone">Phone Call</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Appointment Reminder Time</InputLabel>
                  <Select
                    value={communication.preferredAppointmentReminder}
                    label="Appointment Reminder Time"
                    onChange={(e) => setCommunication({ ...communication, preferredAppointmentReminder: e.target.value as string })}
                  >
                    <MenuItem value="1h">1 hour before</MenuItem>
                    <MenuItem value="24h">24 hours before</MenuItem>
                    <MenuItem value="48h">48 hours before</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSaveClick}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
} 