'use client';

import React, { useState, useEffect } from 'react';
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
  Divider,
  Slider,
  Tabs,
  Tab,
  Snackbar,
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { ApiClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { Role } from '@prisma/client';


// Interface for system settings
interface SystemSettings {
  system: {
    maintenanceMode: boolean;
    debugMode: boolean;
    maxUploadSize: number; // MB
    maxStoragePerUser: number; // MB
    autoDeleteInactiveAccounts: number; // days
    maxConcurrentUploads: number;
  };
  security: {
    requireTwoFactor: boolean;
    passwordExpiryDays: number;
    maxLoginAttempts: number;
    sessionTimeout: number; // minutes
    allowedIpRanges: string[];
    enforceStrongPasswords: boolean;
    minPasswordLength: number;
  };
  email: {
    smtpServer: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    defaultFromEmail: string;
    defaultFromName: string;
  };
  storage: {
    provider: string;
    region: string;
    bucket: string;
    cdnEnabled: boolean;
    compressionEnabled: boolean;
    backupEnabled: boolean;
    backupFrequency: string;
    retentionPeriod: number; // days
  };
  compliance: {
    hipaaLoggingEnabled: boolean;
    auditTrailRetention: number; // days
    dataEncryptionLevel: string;
    requireConsentForSharing: boolean;
    requireReasonForAccess: boolean;
    automaticLogout: boolean;
  };
  api: {
    rateLimit: number;
    rateLimitInterval: string;
    maxRequestSize: number; // MB
    enableCaching: boolean;
    cacheDuration: number; // seconds
    enableCors: boolean;
  };
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { state } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<SystemSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize error handler
  const { 
    error, 
    handleError, 
    clearError,
    withErrorHandling 
  } = useErrorHandler({ 
    context: 'Admin Settings', 
    showToastByDefault: true 
  });

  // Fetch system settings
  const fetchSettings = async () => {
    clearError();
    setLoading(true);
    
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getSystemSettings();
      
      if (response.status === 'success' && response.data) {
        setSettings(response.data);
        setOriginalSettings(JSON.parse(JSON.stringify(response.data))); // Deep copy for comparison
        setHasChanges(false);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch system settings');
      }
    } catch (err) {
      handleError(err as Error);
      // Initialize with empty settings if none exist
      if (!settings) {
        initializeEmptySettings();
      }
    } finally {
      setLoading(false);
    }
  };

  // Initialize empty settings structure if API fails
  const initializeEmptySettings = () => {
    const emptySettings: SystemSettings = {
      system: {
        maintenanceMode: false,
        debugMode: false,
        maxUploadSize: 10, // MB
        maxStoragePerUser: 1024, // MB
        autoDeleteInactiveAccounts: 365, // days
        maxConcurrentUploads: 3,
      },
      security: {
        requireTwoFactor: false,
        passwordExpiryDays: 90,
        maxLoginAttempts: 5,
        sessionTimeout: 30, // minutes
        allowedIpRanges: [],
        enforceStrongPasswords: true,
        minPasswordLength: 8,
      },
      email: {
        smtpServer: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        defaultFromEmail: '',
        defaultFromName: '',
      },
      storage: {
        provider: 'local',
        region: '',
        bucket: '',
        cdnEnabled: false,
        compressionEnabled: true,
        backupEnabled: true,
        backupFrequency: 'daily',
        retentionPeriod: 90, // days
      },
      compliance: {
        hipaaLoggingEnabled: true,
        auditTrailRetention: 365, // days
        dataEncryptionLevel: 'high',
        requireConsentForSharing: true,
        requireReasonForAccess: true,
        automaticLogout: true,
      },
      api: {
        rateLimit: 100,
        rateLimitInterval: 'minute',
        maxRequestSize: 10, // MB
        enableCaching: true,
        cacheDuration: 300, // seconds
        enableCors: true,
      },
    };
    
    setSettings(emptySettings);
    setOriginalSettings(JSON.parse(JSON.stringify(emptySettings)));
  };

  // Check if user is authorized and fetch settings
  useEffect(() => {
    if (!state.isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (state.user?.role !== Role.ADMIN) {
      router.push('/dashboard');
      return;
    }
    
    fetchSettings();
  }, [state.isAuthenticated, state.user?.role, router]);

  // Check for changes when settings are updated
  useEffect(() => {
    if (settings && originalSettings) {
      const currentStr = JSON.stringify(settings);
      const originalStr = JSON.stringify(originalSettings);
      setHasChanges(currentStr !== originalStr);
    }
  }, [settings, originalSettings]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  // Handle settings changes
  const handleSettingChange = (section: keyof SystemSettings, key: string, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value,
      },
    });
  };

  // Save settings
  const handleSave = async () => {
    clearError();
    setSaving(true);
    
    // Use the withErrorHandling wrapper
    try {
      await withErrorHandling(async () => {
        // Perform API request to update settings
        const apiClient = ApiClient.getInstance();
        const response = await apiClient.updateSystemSettings(settings);
        
        if (response.status === 'success') {
          // If successful, update the original settings to match current
          setOriginalSettings(JSON.parse(JSON.stringify(settings)));
          setHasChanges(false);
        } else {
          throw new Error(response.error?.message || 'Failed to save system settings');
        }
      }, {
        successMessage: 'Settings saved successfully',
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset changes
  const handleReset = () => {
    if (originalSettings) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)));
      setHasChanges(false);
      clearError();
    }
  };

  // Initial loading state
  if (loading && !settings) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingState size="large" message="Loading system settings..." />
      </Box>
    );
  }

  if (!settings) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error"
          action={
            <Button 
              color="inherit" 
              size="small" 
              startIcon={<RefreshIcon />}
              onClick={fetchSettings}
            >
              Retry
            </Button>
          }
        >
          Failed to load settings. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            System Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              disabled={saving || !hasChanges}
            >
              Reset Changes
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? undefined : <SaveIcon />}
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? <LoadingState size="small" /> : 'Save Settings'}
            </Button>
          </Box>
        </Box>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }} 
            onClose={clearError}
            action={
              error.toString().includes('fetch') && (
                <Button
                  color="inherit"
                  size="small"
                  onClick={fetchSettings}
                >
                  Retry
                </Button>
              )
            }
          >
            {error.toString()}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Paper sx={{ mb: 4 }}>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="System" />
            <Tab label="Security" />
            <Tab label="Email" />
            <Tab label="Storage" />
            <Tab label="Compliance" />
            <Tab label="API" />
          </Tabs>
          
          {/* System Tab */}
          {tabIndex === 0 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                System Configuration
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.system.maintenanceMode}
                        onChange={(e) => handleSettingChange('system', 'maintenanceMode', e.target.checked)}
                      />
                    }
                    label="Maintenance Mode"
                  />
                  <Typography variant="body2" color="text.secondary">
                    When enabled, only administrators can access the system
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.system.debugMode}
                        onChange={(e) => handleSettingChange('system', 'debugMode', e.target.checked)}
                      />
                    }
                    label="Debug Mode"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Enable detailed error messages and logging
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>Max Upload Size (MB)</Typography>
                  <Slider
                    value={settings.system.maxUploadSize}
                    onChange={(e, newValue) => handleSettingChange('system', 'maxUploadSize', newValue as number)}
                    min={1}
                    max={1000}
                    valueLabelDisplay="auto"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>Max Storage Per User (MB)</Typography>
                  <Slider
                    value={settings.system.maxStoragePerUser}
                    onChange={(e, newValue) => handleSettingChange('system', 'maxStoragePerUser', newValue as number)}
                    min={100}
                    max={10000}
                    valueLabelDisplay="auto"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Auto-Delete Inactive Accounts (days)"
                    type="number"
                    fullWidth
                    value={settings.system.autoDeleteInactiveAccounts}
                    onChange={(e) => handleSettingChange('system', 'autoDeleteInactiveAccounts', parseInt(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Max Concurrent Uploads"
                    type="number"
                    fullWidth
                    value={settings.system.maxConcurrentUploads}
                    onChange={(e) => handleSettingChange('system', 'maxConcurrentUploads', parseInt(e.target.value) || 1)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Security Tab */}
          {tabIndex === 1 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Security Configuration
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.requireTwoFactor}
                        onChange={(e) => handleSettingChange('security', 'requireTwoFactor', e.target.checked)}
                      />
                    }
                    label="Require Two-Factor Authentication"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.security.enforceStrongPasswords}
                        onChange={(e) => handleSettingChange('security', 'enforceStrongPasswords', e.target.checked)}
                      />
                    }
                    label="Enforce Strong Passwords"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Password Expiry</InputLabel>
                    <Select
                      value={settings.security.passwordExpiryDays}
                      label="Password Expiry"
                      onChange={(e) => handleSettingChange('security', 'passwordExpiryDays', e.target.value as number)}
                    >
                      <MenuItem value={30}>30 days</MenuItem>
                      <MenuItem value={60}>60 days</MenuItem>
                      <MenuItem value={90}>90 days</MenuItem>
                      <MenuItem value={180}>180 days</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Session Timeout</InputLabel>
                    <Select
                      value={settings.security.sessionTimeout}
                      label="Session Timeout"
                      onChange={(e) => handleSettingChange('security', 'sessionTimeout', e.target.value as number)}
                    >
                      <MenuItem value={15}>15 minutes</MenuItem>
                      <MenuItem value={30}>30 minutes</MenuItem>
                      <MenuItem value={60}>60 minutes</MenuItem>
                      <MenuItem value={120}>120 minutes</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Max Login Attempts"
                    type="number"
                    fullWidth
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value) || 3)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Minimum Password Length"
                    type="number"
                    fullWidth
                    value={settings.security.minPasswordLength}
                    onChange={(e) => handleSettingChange('security', 'minPasswordLength', parseInt(e.target.value) || 8)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Email Tab */}
          {tabIndex === 2 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Email Configuration
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SMTP Server"
                    fullWidth
                    value={settings.email.smtpServer}
                    onChange={(e) => handleSettingChange('email', 'smtpServer', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SMTP Port"
                    type="number"
                    fullWidth
                    value={settings.email.smtpPort}
                    onChange={(e) => handleSettingChange('email', 'smtpPort', parseInt(e.target.value) || 587)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SMTP Username"
                    fullWidth
                    value={settings.email.smtpUsername}
                    onChange={(e) => handleSettingChange('email', 'smtpUsername', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SMTP Password"
                    type="password"
                    fullWidth
                    value={settings.email.smtpPassword}
                    onChange={(e) => handleSettingChange('email', 'smtpPassword', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Default From Email"
                    fullWidth
                    value={settings.email.defaultFromEmail}
                    onChange={(e) => handleSettingChange('email', 'defaultFromEmail', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Default From Name"
                    fullWidth
                    value={settings.email.defaultFromName}
                    onChange={(e) => handleSettingChange('email', 'defaultFromName', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Storage Tab */}
          {tabIndex === 3 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Storage Configuration
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Storage Provider</InputLabel>
                    <Select
                      value={settings.storage.provider}
                      label="Storage Provider"
                      onChange={(e) => handleSettingChange('storage', 'provider', e.target.value as string)}
                    >
                      <MenuItem value="s3">Amazon S3</MenuItem>
                      <MenuItem value="azure">Azure Blob Storage</MenuItem>
                      <MenuItem value="gcs">Google Cloud Storage</MenuItem>
                      <MenuItem value="local">Local Storage</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Storage Region"
                    fullWidth
                    value={settings.storage.region}
                    onChange={(e) => handleSettingChange('storage', 'region', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Bucket Name"
                    fullWidth
                    value={settings.storage.bucket}
                    onChange={(e) => handleSettingChange('storage', 'bucket', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Backup Frequency</InputLabel>
                    <Select
                      value={settings.storage.backupFrequency}
                      label="Backup Frequency"
                      onChange={(e) => handleSettingChange('storage', 'backupFrequency', e.target.value as string)}
                    >
                      <MenuItem value="hourly">Hourly</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.storage.cdnEnabled}
                        onChange={(e) => handleSettingChange('storage', 'cdnEnabled', e.target.checked)}
                      />
                    }
                    label="Enable CDN"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.storage.compressionEnabled}
                        onChange={(e) => handleSettingChange('storage', 'compressionEnabled', e.target.checked)}
                      />
                    }
                    label="Enable Compression"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.storage.backupEnabled}
                        onChange={(e) => handleSettingChange('storage', 'backupEnabled', e.target.checked)}
                      />
                    }
                    label="Enable Backups"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Retention Period (days)"
                    type="number"
                    fullWidth
                    value={settings.storage.retentionPeriod}
                    onChange={(e) => handleSettingChange('storage', 'retentionPeriod', parseInt(e.target.value) || 30)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* Compliance Tab */}
          {tabIndex === 4 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Compliance Configuration
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.compliance.hipaaLoggingEnabled}
                        onChange={(e) => handleSettingChange('compliance', 'hipaaLoggingEnabled', e.target.checked)}
                      />
                    }
                    label="HIPAA Compliant Logging"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.compliance.requireConsentForSharing}
                        onChange={(e) => handleSettingChange('compliance', 'requireConsentForSharing', e.target.checked)}
                      />
                    }
                    label="Require Consent for Sharing"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.compliance.requireReasonForAccess}
                        onChange={(e) => handleSettingChange('compliance', 'requireReasonForAccess', e.target.checked)}
                      />
                    }
                    label="Require Reason for Access"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.compliance.automaticLogout}
                        onChange={(e) => handleSettingChange('compliance', 'automaticLogout', e.target.checked)}
                      />
                    }
                    label="Automatic Logout on Inactivity"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Data Encryption Level</InputLabel>
                    <Select
                      value={settings.compliance.dataEncryptionLevel}
                      label="Data Encryption Level"
                      onChange={(e) => handleSettingChange('compliance', 'dataEncryptionLevel', e.target.value as string)}
                    >
                      <MenuItem value="AES-128">AES-128</MenuItem>
                      <MenuItem value="AES-256">AES-256</MenuItem>
                      <MenuItem value="AES-512">AES-512</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Audit Trail Retention (days)"
                    type="number"
                    fullWidth
                    value={settings.compliance.auditTrailRetention}
                    onChange={(e) => handleSettingChange('compliance', 'auditTrailRetention', parseInt(e.target.value) || 365)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          {/* API Tab */}
          {tabIndex === 5 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                API Configuration
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Rate Limit"
                    type="number"
                    fullWidth
                    value={settings.api.rateLimit}
                    onChange={(e) => handleSettingChange('api', 'rateLimit', parseInt(e.target.value) || 100)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rate Limit Interval</InputLabel>
                    <Select
                      value={settings.api.rateLimitInterval}
                      label="Rate Limit Interval"
                      onChange={(e) => handleSettingChange('api', 'rateLimitInterval', e.target.value as string)}
                    >
                      <MenuItem value="minute">Per Minute</MenuItem>
                      <MenuItem value="hour">Per Hour</MenuItem>
                      <MenuItem value="day">Per Day</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Max Request Size (MB)"
                    type="number"
                    fullWidth
                    value={settings.api.maxRequestSize}
                    onChange={(e) => handleSettingChange('api', 'maxRequestSize', parseInt(e.target.value) || 10)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Cache Duration (seconds)"
                    type="number"
                    fullWidth
                    value={settings.api.cacheDuration}
                    onChange={(e) => handleSettingChange('api', 'cacheDuration', parseInt(e.target.value) || 3600)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.api.enableCaching}
                        onChange={(e) => handleSettingChange('api', 'enableCaching', e.target.checked)}
                      />
                    }
                    label="Enable API Response Caching"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.api.enableCors}
                        onChange={(e) => handleSettingChange('api', 'enableCors', e.target.checked)}
                      />
                    }
                    label="Enable CORS"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
} 