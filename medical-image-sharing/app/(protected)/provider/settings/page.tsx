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
  Divider,
  Box,
  Card,
  CardContent,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText, 
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

export default function ProviderSettingsPage() {
  // Practice Information
  const [practiceInfo, setPracticeInfo] = useState({
    practiceName: 'Medical Clinic',
    address: '123 Medical Dr',
    phone: '(555) 123-4567',
    email: 'info@clinic.com',
    website: 'www.clinic.com',
    licenseNumber: 'MC123456',
  });

  // Notification Settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    newPatientAlerts: true,
    imageUploadAlerts: true,
    appointmentReminders: true,
    systemUpdates: true,
  });

  // Security Settings
  const [security, setSecurity] = useState({
    twoFactorAuth: true,
    requirePatientVerification: true,
    autoLogoutMinutes: 30,
    ipWhitelist: ['192.168.1.*'],
  });

  // Image Sharing Settings
  const [imageSharing, setImageSharing] = useState({
    defaultLinkExpiry: 7,
    requirePatientConsent: true,
    watermarkImages: true,
    allowDownloads: true,
    compressionQuality: 'high',
  });

  // Availability Settings
  const [availability, setAvailability] = useState({
    workingHours: {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: '10:00', end: '14:00', available: false },
      sunday: { start: '10:00', end: '14:00', available: false },
    },
    appointmentDuration: 30,
    bufferTime: 15,
  });

  const handleSave = () => {
    // TODO: Implement settings save
    console.log('Saving settings...');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Provider Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Practice Information */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Practice Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Practice Name"
                  value={practiceInfo.practiceName}
                  onChange={(e) => setPracticeInfo({ ...practiceInfo, practiceName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="License Number"
                  value={practiceInfo.licenseNumber}
                  onChange={(e) => setPracticeInfo({ ...practiceInfo, licenseNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={practiceInfo.address}
                  onChange={(e) => setPracticeInfo({ ...practiceInfo, address: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={practiceInfo.phone}
                  onChange={(e) => setPracticeInfo({ ...practiceInfo, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Email"
                  value={practiceInfo.email}
                  onChange={(e) => setPracticeInfo({ ...practiceInfo, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Website"
                  value={practiceInfo.website}
                  onChange={(e) => setPracticeInfo({ ...practiceInfo, website: e.target.value })}
                />
              </Grid>
            </Grid>
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
                <ListItemText primary="New Patient Alerts" />
                <Switch
                  checked={notifications.newPatientAlerts}
                  onChange={(e) => setNotifications({ ...notifications, newPatientAlerts: e.target.checked })}
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="Image Upload Alerts" />
                <Switch
                  checked={notifications.imageUploadAlerts}
                  onChange={(e) => setNotifications({ ...notifications, imageUploadAlerts: e.target.checked })}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Two-Factor Authentication"
                  secondary="Require 2FA for account access"
                />
                <Switch
                  checked={security.twoFactorAuth}
                  onChange={(e) => setSecurity({ ...security, twoFactorAuth: e.target.checked })}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Patient Verification"
                  secondary="Require verification for new patients"
                />
                <Switch
                  checked={security.requirePatientVerification}
                  onChange={(e) => setSecurity({ ...security, requirePatientVerification: e.target.checked })}
                />
              </ListItem>
              <ListItem>
                <FormControl fullWidth>
                  <InputLabel>Auto Logout</InputLabel>
                  <Select
                    value={security.autoLogoutMinutes}
                    label="Auto Logout"
                    onChange={(e) => setSecurity({ ...security, autoLogoutMinutes: e.target.value as number })}
                  >
                    <MenuItem value={15}>15 minutes</MenuItem>
                    <MenuItem value={30}>30 minutes</MenuItem>
                    <MenuItem value={60}>1 hour</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Image Sharing Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Image Sharing Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Default Link Expiry</InputLabel>
                  <Select
                    value={imageSharing.defaultLinkExpiry}
                    label="Default Link Expiry"
                    onChange={(e) => setImageSharing({ ...imageSharing, defaultLinkExpiry: e.target.value as number })}
                  >
                    <MenuItem value={1}>1 day</MenuItem>
                    <MenuItem value={7}>7 days</MenuItem>
                    <MenuItem value={30}>30 days</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Compression Quality</InputLabel>
                  <Select
                    value={imageSharing.compressionQuality}
                    label="Compression Quality"
                    onChange={(e) => setImageSharing({ ...imageSharing, compressionQuality: e.target.value as string })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={imageSharing.requirePatientConsent}
                      onChange={(e) => setImageSharing({ ...imageSharing, requirePatientConsent: e.target.checked })}
                    />
                  }
                  label="Require Patient Consent for Sharing"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={imageSharing.watermarkImages}
                      onChange={(e) => setImageSharing({ ...imageSharing, watermarkImages: e.target.checked })}
                    />
                  }
                  label="Apply Watermark to Shared Images"
                />
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
              onClick={handleSave}
            >
              Save Settings
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
} 