'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  CircularProgress,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Switch,
  FormGroup,
  FormControlLabel,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Schedule as ScheduleIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  CloudDownload as CloudDownloadIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { adminClient } from '@/lib/api/adminClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { format, parseISO, isAfter } from 'date-fns';
import { Role } from '@prisma/client';
import { routes } from '@/config/routes';
import type { Route } from 'next';
import { ClerkAuthService } from '@/lib/clerk/auth-service';

interface Backup {
  id: string;
  createdAt: string;
  size: number;
  status: 'completed' | 'failed' | 'in_progress';
  type: 'automatic' | 'manual';
  metadata: {
    version: string;
    files: number;
    compressionRatio: number;
  };
}

interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retention: number;
  nextScheduled: string;
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

interface SystemMaintenanceStatus {
  enabled: boolean;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  message: string;
}

enum TabType {
  BACKUPS = 0,
  SCHEDULING = 1,
  MAINTENANCE = 2,
}

export default function BackupAndRecoveryPage() {
  const { isLoaded, userId, sessionId } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentTab, setCurrentTab] = useState<TabType>(TabType.BACKUPS);
  
  // Backup state
  const [backups, setBackups] = useState<Backup[]>([]);
  const [newBackupInProgress, setNewBackupInProgress] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  
  // Backup schedule state
  const [backupSchedule, setBackupSchedule] = useState<BackupSchedule>({
    enabled: false,
    frequency: 'daily',
    retention: 30,
    nextScheduled: new Date().toISOString(),
    time: '02:00',
    dayOfWeek: 1,
    dayOfMonth: 1,
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  
  // System maintenance state
  const [maintenanceStatus, setMaintenanceStatus] = useState<SystemMaintenanceStatus>({
    enabled: false,
    scheduledStart: null,
    scheduledEnd: null,
    message: '',
  });
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [scheduledMaintenanceStart, setScheduledMaintenanceStart] = useState<Date | null>(null);
  const [scheduledMaintenanceEnd, setScheduledMaintenanceEnd] = useState<Date | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  
  // Dialog states
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  
  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      router.push('/auth/login');
      return;
    }

    // Check user role
    const checkRole = async () => {
      const userRole = await ClerkAuthService.getUserRole();
      if (userRole !== Role.ADMIN) {
        router.push('/dashboard');
        return;
      }
      fetchBackups();
    };

    checkRole();
  }, [isLoaded, userId, router]);
  
  // Fetch backup data
  const fetchBackups = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await adminClient.getBackups();
      
      if (response.status === 'success') {
        setBackups(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch backups');
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
      setError('Failed to load backups. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch backup schedule
  const fetchBackupSchedule = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await adminClient.getBackupSchedule();
      
      if (response.status === 'success') {
        setBackupSchedule(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch backup schedule');
      }
    } catch (err) {
      console.error('Error fetching backup schedule:', err);
      setError('Failed to load backup schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch maintenance status
  const fetchMaintenanceStatus = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await adminClient.getMaintenanceStatus();
      
      if (response.status === 'success') {
        setMaintenanceStatus(response.data);
        if (response.data.scheduledStart) {
          setScheduledMaintenanceStart(new Date(response.data.scheduledStart));
        }
        if (response.data.scheduledEnd) {
          setScheduledMaintenanceEnd(new Date(response.data.scheduledEnd));
        }
        setMaintenanceMessage(response.data.message || '');
      } else {
        setError(response.error?.message || 'Failed to fetch maintenance status');
      }
    } catch (err) {
      console.error('Error fetching maintenance status:', err);
      setError('Failed to load maintenance status. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Create new backup
  const handleCreateBackup = async () => {
    setNewBackupInProgress(true);
    setError('');
    
    try {
      const response = await adminClient.createBackup();
      
      if (response.status === 'success') {
        setSuccess('Backup creation initiated successfully');
        fetchBackups(); // Refresh the list
      } else {
        setError(response.error?.message || 'Failed to create backup');
      }
    } catch (err) {
      console.error('Error creating backup:', err);
      setError('Failed to create backup. Please try again.');
    } finally {
      setNewBackupInProgress(false);
    }
  };
  
  // Restore backup
  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await adminClient.restoreBackup(selectedBackup.id);
      
      if (response.status === 'success') {
        setSuccess('Backup restoration initiated successfully');
        setShowRestoreDialog(false);
      } else {
        setError(response.error?.message || 'Failed to restore backup');
      }
    } catch (err) {
      console.error('Error restoring backup:', err);
      setError('Failed to restore backup. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete backup
  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await adminClient.deleteBackup(selectedBackup.id);
      
      if (response.status === 'success') {
        setSuccess('Backup deleted successfully');
        setShowDeleteDialog(false);
        fetchBackups(); // Refresh the list
      } else {
        setError(response.error?.message || 'Failed to delete backup');
      }
    } catch (err) {
      console.error('Error deleting backup:', err);
      setError('Failed to delete backup. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Download backup
  const handleDownloadBackup = async (backup: Backup) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await adminClient.downloadBackup(backup.id);
      
      if (response.status === 'success') {
        // Create a blob from the response data
        const blob = new Blob([response.data], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${backup.id}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError(response.error?.message || 'Failed to download backup');
      }
    } catch (err) {
      console.error('Error downloading backup:', err);
      setError('Failed to download backup. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Save backup schedule
  const handleSaveSchedule = async () => {
    setScheduleSaving(true);
    setError('');
    
    try {
      const response = await adminClient.updateBackupSchedule(backupSchedule);
      
      if (response.status === 'success') {
        setSuccess('Backup schedule updated successfully');
      } else {
        setError(response.error?.message || 'Failed to update backup schedule');
      }
    } catch (err) {
      console.error('Error updating backup schedule:', err);
      setError('Failed to update backup schedule. Please try again.');
    } finally {
      setScheduleSaving(false);
    }
  };
  
  // Toggle maintenance mode
  const handleToggleMaintenance = async (enabled: boolean) => {
    setMaintenanceSaving(true);
    setError('');
    
    try {
      const response = await adminClient.updateMaintenanceStatus({
        ...maintenanceStatus,
        enabled,
      });
      
      if (response.status === 'success') {
        setSuccess(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`);
        setMaintenanceStatus(response.data);
      } else {
        setError(response.error?.message || 'Failed to update maintenance status');
      }
    } catch (err) {
      console.error('Error updating maintenance status:', err);
      setError('Failed to update maintenance status. Please try again.');
    } finally {
      setMaintenanceSaving(false);
    }
  };
  
  // Save scheduled maintenance
  const handleSaveScheduledMaintenance = async () => {
    if (!scheduledMaintenanceStart || !scheduledMaintenanceEnd) {
      setError('Please select both start and end times');
      return;
    }
    
    if (isAfter(scheduledMaintenanceStart, scheduledMaintenanceEnd)) {
      setError('End time must be after start time');
      return;
    }
    
    setMaintenanceSaving(true);
    setError('');
    
    try {
      const response = await adminClient.updateMaintenanceStatus({
        ...maintenanceStatus,
        scheduledStart: scheduledMaintenanceStart.toISOString(),
        scheduledEnd: scheduledMaintenanceEnd.toISOString(),
        message: maintenanceMessage,
      });
      
      if (response.status === 'success') {
        setSuccess('Scheduled maintenance updated successfully');
        setShowMaintenanceDialog(false);
        setMaintenanceStatus(response.data);
      } else {
        setError(response.error?.message || 'Failed to update scheduled maintenance');
      }
    } catch (err) {
      console.error('Error updating scheduled maintenance:', err);
      setError('Failed to update scheduled maintenance. Please try again.');
    } finally {
      setMaintenanceSaving(false);
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };
  
  // Update backup schedule
  const handleScheduleChange = (field: keyof BackupSchedule, value: any) => {
    setBackupSchedule(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange}
              aria-label="backup and maintenance tabs"
            >
              <Tab label="Backups" />
              <Tab label="Backup Scheduling" />
              <Tab label="System Maintenance" />
            </Tabs>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}
          
          {/* Loading indicator */}
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          
          {/* Backups Tab */}
          {currentTab === TabType.BACKUPS && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                  System Backups
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<BackupIcon />}
                    onClick={handleCreateBackup}
                    disabled={newBackupInProgress}
                  >
                    {newBackupInProgress ? (
                      <>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        Creating...
                      </>
                    ) : (
                      'Create Backup'
                    )}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchBackups}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                </Box>
              </Box>
              
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Created At</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Files</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                          {loading ? (
                            <CircularProgress size={24} />
                          ) : (
                            'No backups found'
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell>
                            {format(parseISO(backup.createdAt), 'PPpp')}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={backup.type === 'automatic' ? 'Scheduled' : 'Manual'}
                              color={backup.type === 'automatic' ? 'info' : 'primary'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatFileSize(backup.size)}</TableCell>
                          <TableCell>
                            <Chip
                              label={backup.status}
                              color={
                                backup.status === 'completed'
                                  ? 'success'
                                  : backup.status === 'failed'
                                  ? 'error'
                                  : 'warning'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{backup.metadata.files.toLocaleString()}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Download Backup">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadBackup(backup)}
                                  disabled={backup.status !== 'completed'}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Restore from Backup">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedBackup(backup);
                                    setShowRestoreDialog(true);
                                  }}
                                  disabled={backup.status !== 'completed'}
                                >
                                  <RestoreIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Backup">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedBackup(backup);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
          
          {/* Backup Scheduling Tab */}
          {currentTab === TabType.SCHEDULING && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                  Backup Scheduling
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchBackupSchedule}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Box>
              
              <Paper sx={{ p: 3, mb: 3 }}>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={backupSchedule.enabled}
                        onChange={(e) => handleScheduleChange('enabled', e.target.checked)}
                      />
                    }
                    label="Enable automatic backups"
                  />
                </FormGroup>
                
                <Divider sx={{ my: 3 }} />
                
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth disabled={!backupSchedule.enabled}>
                      <InputLabel>Backup Frequency</InputLabel>
                      <Select
                        value={backupSchedule.frequency}
                        label="Backup Frequency"
                        onChange={(e) => handleScheduleChange('frequency', e.target.value)}
                      >
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Backup Time (24h)"
                      type="time"
                      value={backupSchedule.time}
                      onChange={(e) => handleScheduleChange('time', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 60 }}
                      fullWidth
                      disabled={!backupSchedule.enabled}
                    />
                  </Grid>
                  
                  {backupSchedule.frequency === 'weekly' && (
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth disabled={!backupSchedule.enabled}>
                        <InputLabel>Day of Week</InputLabel>
                        <Select
                          value={backupSchedule.dayOfWeek}
                          label="Day of Week"
                          onChange={(e) => handleScheduleChange('dayOfWeek', e.target.value)}
                        >
                          <MenuItem value={1}>Monday</MenuItem>
                          <MenuItem value={2}>Tuesday</MenuItem>
                          <MenuItem value={3}>Wednesday</MenuItem>
                          <MenuItem value={4}>Thursday</MenuItem>
                          <MenuItem value={5}>Friday</MenuItem>
                          <MenuItem value={6}>Saturday</MenuItem>
                          <MenuItem value={0}>Sunday</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  
                  {backupSchedule.frequency === 'monthly' && (
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Day of Month"
                        type="number"
                        value={backupSchedule.dayOfMonth}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= 1 && value <= 31) {
                            handleScheduleChange('dayOfMonth', value);
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: 1, max: 31 }}
                        fullWidth
                        disabled={!backupSchedule.enabled}
                      />
                    </Grid>
                  )}
                </Grid>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Backup Retention (days)"
                      type="number"
                      value={backupSchedule.retention}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1) {
                          handleScheduleChange('retention', value);
                        }
                      }}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ min: 1 }}
                      fullWidth
                      helperText="Automatic backups older than this will be deleted"
                      disabled={!backupSchedule.enabled}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'background.default', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <ScheduleIcon sx={{ mr: 1 }} color="primary" />
                        <Typography variant="subtitle2">Next Scheduled Backup</Typography>
                      </Box>
                      <Typography>
                        {backupSchedule.enabled 
                          ? format(parseISO(backupSchedule.nextScheduled), 'PPpp')
                          : 'Automatic backups are disabled'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveSchedule}
                    disabled={scheduleSaving}
                    startIcon={scheduleSaving ? <CircularProgress size={20} /> : null}
                  >
                    {scheduleSaving ? 'Saving...' : 'Save Schedule'}
                  </Button>
                </Box>
              </Paper>
            </>
          )}
          
          {/* System Maintenance Tab */}
          {currentTab === TabType.MAINTENANCE && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                  System Maintenance
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchMaintenanceStatus}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Box>
              
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Maintenance Mode</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                  When maintenance mode is enabled, only administrators can access the system. All other users will see a maintenance page with a message.
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={maintenanceStatus.enabled}
                          onChange={(e) => handleToggleMaintenance(e.target.checked)}
                          disabled={maintenanceSaving}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography>
                            {maintenanceStatus.enabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled'}
                          </Typography>
                          {maintenanceSaving && <CircularProgress size={20} sx={{ ml: 1 }} />}
                        </Box>
                      }
                    />
                  </FormGroup>
                  
                  <Button
                    variant="outlined"
                    startIcon={<ScheduleIcon />}
                    onClick={() => setShowMaintenanceDialog(true)}
                  >
                    Schedule Maintenance
                  </Button>
                </Box>
                
                {maintenanceStatus.scheduledStart && maintenanceStatus.scheduledEnd && (
                  <Alert 
                    severity="info" 
                    icon={<InfoIcon />}
                    sx={{ mt: 3 }}
                  >
                    <AlertTitle>Scheduled Maintenance</AlertTitle>
                    <Typography variant="body2">
                      Maintenance is scheduled from{' '}
                      <strong>{format(parseISO(maintenanceStatus.scheduledStart), 'PPpp')}</strong>{' '}
                      to{' '}
                      <strong>{format(parseISO(maintenanceStatus.scheduledEnd), 'PPpp')}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Message: {maintenanceStatus.message}
                    </Typography>
                  </Alert>
                )}
              </Paper>
              
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>System Operations</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                  Perform system maintenance operations. Use these options with caution as they may affect system availability.
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        height: '100%',
                      }}
                    >
                      <SettingsIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                      <Typography variant="h6" gutterBottom>
                        Clear Cache
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Clear system cache to free up memory and improve performance
                      </Typography>
                      <Button variant="outlined" fullWidth>
                        Clear Cache
                      </Button>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        height: '100%',
                      }}
                    >
                      <CloudDownloadIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
                      <Typography variant="h6" gutterBottom>
                        Update System
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Check for and install system updates and security patches
                      </Typography>
                      <Button variant="outlined" fullWidth>
                        Check for Updates
                      </Button>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        height: '100%',
                        bgcolor: 'error.light',
                      }}
                    >
                      <WarningIcon sx={{ fontSize: 40, mb: 1, color: 'error.main' }} />
                      <Typography variant="h6" gutterBottom>
                        Restart System
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        Restart the entire system. All users will be disconnected.
                      </Typography>
                      <Button variant="contained" color="error" fullWidth>
                        Restart System
                      </Button>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </>
          )}
          
          {/* Restore Dialog */}
          <Dialog
            open={showRestoreDialog}
            onClose={() => setShowRestoreDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Restore System from Backup</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Are you sure you want to restore the system from this backup? This action will:
              </DialogContentText>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li">Put the system in maintenance mode</Typography>
                <Typography component="li">Restore all data from the backup</Typography>
                <Typography component="li">Potentially overwrite current data</Typography>
                <Typography component="li">Restart all services after restoration</Typography>
              </Box>
              <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
                This process cannot be interrupted once started.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowRestoreDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleRestoreBackup} 
                variant="contained" 
                color="warning" 
                startIcon={<RestoreIcon />}
                disabled={loading}
              >
                Restore System
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Delete Dialog */}
          <Dialog
            open={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
          >
            <DialogTitle>Delete Backup</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete this backup? This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleDeleteBackup} 
                variant="contained" 
                color="error" 
                startIcon={<DeleteIcon />}
                disabled={loading}
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Schedule Maintenance Dialog */}
          <Dialog
            open={showMaintenanceDialog}
            onClose={() => setShowMaintenanceDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Schedule System Maintenance</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Schedule a maintenance window during which the system will automatically enter maintenance mode.
              </DialogContentText>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <Box sx={{ width: '100%' }}>
                    <DateTimePicker
                      label="Start Time"
                      value={scheduledMaintenanceStart}
                      onChange={(newValue: Date | null) => setScheduledMaintenanceStart(newValue)}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ width: '100%' }}>
                    <DateTimePicker
                      label="End Time"
                      value={scheduledMaintenanceEnd}
                      onChange={(newValue: Date | null) => setScheduledMaintenanceEnd(newValue)}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Maintenance Message"
                    fullWidth
                    multiline
                    rows={3}
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="Explain to users why the system is in maintenance mode and when it will be back"
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowMaintenanceDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleSaveScheduledMaintenance} 
                variant="contained" 
                disabled={maintenanceSaving || !scheduledMaintenanceStart || !scheduledMaintenanceEnd || !maintenanceMessage}
                startIcon={maintenanceSaving ? <CircularProgress size={20} /> : <ScheduleIcon />}
              >
                {maintenanceSaving ? 'Saving...' : 'Schedule'}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </LocalizationProvider>
  );
} 