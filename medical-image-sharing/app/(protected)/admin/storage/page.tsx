'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Box,
  Button,
  LinearProgress,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Alert,
  Divider,
  Chip, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Storage as StorageIcon,
  DeleteSweep as DeleteSweepIcon,
  Refresh as RefreshIcon,
  CloudDownload as CloudDownloadIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Info as InfoIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { ApiClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@prisma/client';

// Define interfaces for storage data
interface StorageStats {
  totalStorage: number; // MB
  usedStorage: number; // MB
  availableStorage: number; // MB
  filesCount: number;
  imagesByType: Record<string, number>;
  storageByUser: Array<{
    userId: string;
    userName: string;
    storageUsed: number; // MB
    filesCount: number;
  }>;
  storageByAge: {
    lessThan30Days: number; // MB
    between30And90Days: number; // MB
    between90And180Days: number; // MB
    moreThan180Days: number; // MB
  };
  storageByStatus: Record<string, number>; // MB
}

// Interface for cleanup options
interface CleanupOptions {
  olderThan: string;
  types: string[];
  status: string[];
}

export default function AdminStoragePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [openCleanupDialog, setOpenCleanupDialog] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupOptions, setCleanupOptions] = useState<CleanupOptions>({
    olderThan: '180',
    types: [],
    status: [],
  });
  const [confirmCleanupText, setConfirmCleanupText] = useState('');

  // Fetch storage statistics
  const fetchStorageStats = async () => {
    setLoading(true);
    setError('');
    
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getStorageStats();
      
      if (response.status === 'success') {
        setStorageStats(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch storage statistics');
      }
    } catch (err) {
      console.error('Error fetching storage statistics:', err);
      setError('Failed to load storage statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if user is authorized and fetch storage statistics
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.role !== Role.ADMIN) {
      router.push('/dashboard');
      return;
    }
    
    fetchStorageStats();
  }, [isAuthenticated, user?.role, router]);

  // Handle opening cleanup dialog
  const handleOpenCleanupDialog = () => {
    if (!storageStats) return;
    
    // Set default options
    setCleanupOptions({
      olderThan: '180',
      types: Object.keys(storageStats.imagesByType),
      status: Object.keys(storageStats.storageByStatus),
    });
    setConfirmCleanupText('');
    setOpenCleanupDialog(true);
  };

  // Handle closing cleanup dialog
  const handleCloseCleanupDialog = () => {
    setOpenCleanupDialog(false);
  };

  // Handle cleanup options changes
  const handleCleanupOptionChange = (key: keyof CleanupOptions, value: any) => {
    setCleanupOptions({
      ...cleanupOptions,
      [key]: value,
    });
  };

  // Handle checkbox change for type selection
  const handleTypeCheckboxChange = (type: string, checked: boolean) => {
    if (checked) {
      setCleanupOptions({
        ...cleanupOptions,
        types: [...cleanupOptions.types, type],
      });
    } else {
      setCleanupOptions({
        ...cleanupOptions,
        types: cleanupOptions.types.filter(t => t !== type),
      });
    }
  };

  // Handle checkbox change for status selection
  const handleStatusCheckboxChange = (status: string, checked: boolean) => {
    if (checked) {
      setCleanupOptions({
        ...cleanupOptions,
        status: [...cleanupOptions.status, status],
      });
    } else {
      setCleanupOptions({
        ...cleanupOptions,
        status: cleanupOptions.status.filter(s => s !== status),
      });
    }
  };

  // Execute cleanup
  const handleExecuteCleanup = async () => {
    if (confirmCleanupText !== 'CONFIRM') {
      setError('Please type CONFIRM to proceed with cleanup');
      return;
    }
    
    setCleaningUp(true);
    setError('');
    setSuccess('');
    
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.cleanupStorage(cleanupOptions);
      
      if (response.status === 'success') {
        setSuccess(`Cleanup completed. ${response.data.deletedCount} files removed, freeing ${response.data.freedSpace} MB of storage.`);
        fetchStorageStats(); // Refresh stats
        handleCloseCleanupDialog();
      } else {
        setError(response.error?.message || 'Failed to execute cleanup');
      }
    } catch (err) {
      console.error('Error executing cleanup:', err);
      setError('Failed to execute cleanup. Please try again.');
    } finally {
      setCleaningUp(false);
    }
  };

  // Format bytes to human-readable format
  const formatStorage = (mb: number) => {
    if (mb < 1024) {
      return `${mb.toFixed(2)} MB`;
    } else {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
  };

  // Calculate percentage
  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? (value / total) * 100 : 0;
  };

  // Initial loading state
  if (loading && !storageStats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <StorageIcon sx={{ fontSize: 32, mr: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0 }}>
              Storage Management
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchStorageStats}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={handleOpenCleanupDialog}
              disabled={loading || !storageStats}
            >
              Cleanup Storage
            </Button>
          </Box>
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
        
        {loading && (
          <LinearProgress sx={{ mb: 3 }} />
        )}
        
        {storageStats && (
          <>
            {/* Storage Overview Card */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Storage Overview
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Total Storage Usage
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={calculatePercentage(storageStats.usedStorage, storageStats.totalStorage)}
                              color={
                                calculatePercentage(storageStats.usedStorage, storageStats.totalStorage) > 90
                                  ? 'error'
                                  : calculatePercentage(storageStats.usedStorage, storageStats.totalStorage) > 75
                                  ? 'warning'
                                  : 'primary'
                              }
                              sx={{ height: 10, borderRadius: 5 }}
                            />
                          </Box>
                          <Typography variant="body2">
                            {calculatePercentage(storageStats.usedStorage, storageStats.totalStorage).toFixed(1)}%
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          {formatStorage(storageStats.usedStorage)} / {formatStorage(storageStats.totalStorage)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Storage Statistics
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                              <Typography variant="h6">{storageStats.filesCount.toLocaleString()}</Typography>
                              <Typography variant="body2">Total Files</Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={6}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                              <Typography variant="h6">{formatStorage(storageStats.availableStorage)}</Typography>
                              <Typography variant="body2">Available Space</Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
            
            {/* Storage by Type Card */}
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Storage by File Type
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>File Type</TableCell>
                            <TableCell>Count</TableCell>
                            <TableCell>Percentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(storageStats.imagesByType).map(([type, count]) => (
                            <TableRow key={type}>
                              <TableCell>
                                <Chip
                                  label={type}
                                  size="small"
                                  color={
                                    type === 'X-RAY' ? 'primary' :
                                    type === 'MRI' ? 'secondary' :
                                    type === 'CT' ? 'success' :
                                    type === 'ULTRASOUND' ? 'info' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell>{count.toLocaleString()}</TableCell>
                              <TableCell>
                                {((count / storageStats.filesCount) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Storage by Age Card */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Storage by Age
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Age Range</TableCell>
                            <TableCell>Storage Used</TableCell>
                            <TableCell>Percentage</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>Less than 30 days</TableCell>
                            <TableCell>{formatStorage(storageStats.storageByAge.lessThan30Days)}</TableCell>
                            <TableCell>
                              {calculatePercentage(
                                storageStats.storageByAge.lessThan30Days,
                                storageStats.usedStorage
                              ).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>30-90 days</TableCell>
                            <TableCell>{formatStorage(storageStats.storageByAge.between30And90Days)}</TableCell>
                            <TableCell>
                              {calculatePercentage(
                                storageStats.storageByAge.between30And90Days,
                                storageStats.usedStorage
                              ).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>90-180 days</TableCell>
                            <TableCell>{formatStorage(storageStats.storageByAge.between90And180Days)}</TableCell>
                            <TableCell>
                              {calculatePercentage(
                                storageStats.storageByAge.between90And180Days,
                                storageStats.usedStorage
                              ).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>More than 180 days</TableCell>
                            <TableCell>{formatStorage(storageStats.storageByAge.moreThan180Days)}</TableCell>
                            <TableCell>
                              {calculatePercentage(
                                storageStats.storageByAge.moreThan180Days,
                                storageStats.usedStorage
                              ).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Storage by User Table */}
            <Paper sx={{ mt: 4, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Storage Usage by User
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Files Count</TableCell>
                      <TableCell>Storage Used</TableCell>
                      <TableCell>Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {storageStats.storageByUser.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>{user.userName}</TableCell>
                        <TableCell>{user.filesCount.toLocaleString()}</TableCell>
                        <TableCell>{formatStorage(user.storageUsed)}</TableCell>
                        <TableCell>
                          {calculatePercentage(user.storageUsed, storageStats.usedStorage).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}
      </Container>
      
      {/* Cleanup Dialog */}
      <Dialog
        open={openCleanupDialog}
        onClose={handleCloseCleanupDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DeleteSweepIcon sx={{ mr: 1 }} />
            Storage Cleanup
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body1">
              <strong>Caution:</strong> This operation will permanently delete files matching the selected criteria.
              This action cannot be undone.
            </Typography>
          </Alert>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Files Older Than</InputLabel>
                <Select
                  value={cleanupOptions.olderThan}
                  label="Files Older Than"
                  onChange={(e) => handleCleanupOptionChange('olderThan', e.target.value)}
                >
                  <MenuItem value="30">30 days</MenuItem>
                  <MenuItem value="90">90 days</MenuItem>
                  <MenuItem value="180">180 days</MenuItem>
                  <MenuItem value="365">365 days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  File Status to Include
                </Typography>
                <FormGroup row>
                  {storageStats && Object.keys(storageStats.storageByStatus).map((status) => (
                    <FormControlLabel
                      key={status}
                      control={
                        <Checkbox
                          checked={cleanupOptions.status.includes(status)}
                          onChange={(e) => handleStatusCheckboxChange(status, e.target.checked)}
                        />
                      }
                      label={status}
                    />
                  ))}
                </FormGroup>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  File Types to Include
                </Typography>
                <FormGroup row>
                  {storageStats && Object.keys(storageStats.imagesByType).map((type) => (
                    <FormControlLabel
                      key={type}
                      control={
                        <Checkbox
                          checked={cleanupOptions.types.includes(type)}
                          onChange={(e) => handleTypeCheckboxChange(type, e.target.checked)}
                        />
                      }
                      label={type}
                    />
                  ))}
                </FormGroup>
              </Box>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Box>
            <Typography variant="subtitle1" gutterBottom color="error">
              Confirm Cleanup
            </Typography>
            <Typography variant="body2" gutterBottom>
              To confirm, please type "CONFIRM" in the field below.
            </Typography>
            <TextField
              fullWidth
              value={confirmCleanupText}
              onChange={(e) => setConfirmCleanupText(e.target.value)}
              placeholder="Type CONFIRM to proceed"
              error={error.includes('CONFIRM')}
              helperText={error.includes('CONFIRM') ? error : ''}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCleanupDialog} disabled={cleaningUp}>
            Cancel
          </Button>
          <Button
            onClick={handleExecuteCleanup}
            variant="contained"
            color="error"
            disabled={cleaningUp || confirmCleanupText !== 'CONFIRM'}
            startIcon={cleaningUp ? <CircularProgress size={20} /> : <DeleteSweepIcon />}
          >
            {cleaningUp ? 'Cleaning Up...' : 'Execute Cleanup'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 