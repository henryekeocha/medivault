'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { withProtectedRoute } from '@/components/ProtectedRoute';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Image as ImageIcon,
  Storage as StorageIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Assessment as AssessmentIcon,
  ChevronRight as ChevronRightIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';
import { adminClient } from '@/lib/api/adminClient';

// Data interfaces
interface SystemStatus {
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  lastBackup: string;
  storageUsed: number;
  totalStorage: number;
  activeUsers: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  maxConcurrentUsers: number;
}

interface UserStats {
  total: number;
  active: number;
  newToday: number;
  providers: number;
  patients: number;
  admins: number;
}

interface ImageStats {
  total: number;
  uploadedToday: number;
  processingQueue: number;
  storageUsed: string;
  failedUploads: number;
}

interface RecentActivity {
  id: string;
  type: 'upload' | 'login' | 'share' | 'delete';
  user: string;
  action: string;
  timestamp: string;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: 'warning',
    uptime: 'Unknown',
    lastBackup: 'Unknown',
    storageUsed: 0,
    totalStorage: 100,
    activeUsers: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    maxConcurrentUsers: 0,
  });

  // Data states
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [imageStats, setImageStats] = useState<ImageStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<Alert[]>([]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch statistics
      const statsResponse = await adminClient.getStatistics();
      if (statsResponse.status === 'success') {
        const { userStats, imageStats } = statsResponse.data;
        setUserStats(userStats);
        setImageStats(imageStats);
      } else {
        console.error('Failed to fetch admin statistics:', statsResponse.error);
      }
      
      // Fetch system health
      const healthResponse = await adminClient.getSystemHealth();
      if (healthResponse.status === 'success') {
        setSystemStatus(healthResponse.data);
      } else {
        console.error('Failed to fetch system health:', healthResponse.error);
      }
      
      // Fetch activity logs
      const logsResponse = await adminClient.getActivityLogs({ 
        limit: 10, 
        page: 1 
      });
      if (logsResponse.status === 'success') {
        setRecentActivity(logsResponse.data.data.map(item => ({
          id: item.id,
          type: item.action,
          user: item.user?.name || 'Unknown',
          action: item.details?.description || item.action,
          timestamp: new Date(item.timestamp).toLocaleString()
        })));
      } else {
        console.error('Failed to fetch activity logs:', logsResponse.error);
      }

      // Fetch system alerts
      const alertsResponse = await adminClient.getSystemAlerts();
      if (alertsResponse.status === 'success') {
        setSystemAlerts(alertsResponse.data.alerts || []);
      } else {
        console.error('Failed to fetch system alerts:', alertsResponse.error);
      }
      
      // Set last updated time
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
      
      // Set fallback data only if no real data was fetched
      if (!systemStatus) {
        setSystemStatus({
          status: 'warning',
          uptime: 'Unknown',
          lastBackup: 'Unknown',
          storageUsed: 0,
          totalStorage: 100,
          activeUsers: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0,
          maxConcurrentUsers: 0,
        });
      }
      
      if (!userStats) {
        setUserStats({
          total: 0,
          active: 0,
          newToday: 0,
          providers: 0,
          patients: 0,
          admins: 0,
        });
      }
      
      if (!imageStats) {
        setImageStats({
          total: 0,
          uploadedToday: 0,
          processingQueue: 0,
          storageUsed: '0 GB',
          failedUploads: 0,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Check if user has admin role in metadata
    const userRole = user.publicMetadata.role;
    if (userRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    
    fetchDashboardData();
  }, [isLoaded, user, router]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (isLoading && (!systemStatus || !userStats || !imageStats)) {
    return (
      <Box sx={{ width: '100%', mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ px: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DashboardIcon sx={{ fontSize: 32, mr: 2 }} />
            <Typography variant="h4" component="h1">
              Admin Dashboard
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              Last updated: {lastUpdated?.toLocaleTimeString() || 'N/A'}
            </Typography>
            <IconButton onClick={handleRefresh} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isLoading && (
          <LinearProgress sx={{ mb: 3 }} />
        )}

        <Grid container spacing={3}>
          {/* System Status */}
          {systemStatus && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <SecurityIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">System Status</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Status
                        </Typography>
                        <Chip
                          label={systemStatus.status.toUpperCase()}
                          color={
                            systemStatus.status === 'healthy'
                              ? 'success'
                              : systemStatus.status === 'warning'
                              ? 'warning'
                              : 'error'
                          }
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Uptime
                        </Typography>
                        <Typography variant="h6">{systemStatus.uptime}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          CPU Usage
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={systemStatus.cpuUsage}
                            sx={{ width: '80%', mr: 1 }}
                          />
                          <Typography variant="body2">{systemStatus.cpuUsage}%</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Memory Usage
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={systemStatus.memoryUsage}
                            sx={{ width: '80%', mr: 1 }}
                          />
                          <Typography variant="body2">{systemStatus.memoryUsage}%</Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Quick Stats */}
          {userStats && (
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <GroupIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">User Statistics</Typography>
                  </Box>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Total Users"
                        secondary={userStats.total.toLocaleString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Active Users"
                        secondary={userStats.active.toLocaleString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="New Users Today"
                        secondary={userStats.newToday.toLocaleString()}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}

          {imageStats && (
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ImageIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Image Statistics</Typography>
                  </Box>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Total Images"
                        secondary={imageStats.total.toLocaleString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Uploaded Today"
                        secondary={imageStats.uploadedToday.toLocaleString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Processing Queue"
                        secondary={imageStats.processingQueue.toLocaleString()}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}

          {systemStatus && (
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <StorageIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Storage Usage</Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {systemStatus.storageUsed} GB / {systemStatus.totalStorage} GB
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(systemStatus.storageUsed / systemStatus.totalStorage) * 100}
                      sx={{ mb: 2 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Last Backup: {systemStatus.lastBackup}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => router.push('/admin/storage')}
                        startIcon={<StorageIcon />}
                      >
                        Manage Storage
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Recent Activity */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccessTimeIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Recent Activity</Typography>
                  </Box>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => router.push('/admin/audit')}
                  >
                    View All
                  </Button>
                </Box>
                {recentActivity.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>User</TableCell>
                          <TableCell>Action</TableCell>
                          <TableCell>Time</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentActivity.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell>{activity.user}</TableCell>
                            <TableCell>{activity.action}</TableCell>
                            <TableCell>{activity.timestamp}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No recent activity to display
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* System Alerts */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WarningIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">System Alerts</Typography>
                </Box>
                {systemAlerts.length > 0 ? (
                  <List>
                    {systemAlerts.map((alert) => (
                      <ListItem key={alert.id}>
                        <Alert severity={alert.type as any} sx={{ width: '100%' }}>
                          <Typography variant="body2">{alert.message}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {alert.timestamp}
                          </Typography>
                        </Alert>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No alerts to display
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* System Health Monitoring */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SecurityIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">System Health Monitoring</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={systemStatus.status === 'healthy' ? 'Healthy' : systemStatus.status === 'warning' ? 'Warning' : 'Error'}
                      color={systemStatus.status === 'healthy' ? 'success' : systemStatus.status === 'warning' ? 'warning' : 'error'}
                      size="small"
                      icon={systemStatus.status === 'healthy' ? <CheckIcon fontSize="small" /> : systemStatus.status === 'warning' ? <WarningIcon fontSize="small" /> : <ErrorIcon fontSize="small" />}
                    />
                    <Tooltip title="Refresh system health data">
                      <IconButton size="small" onClick={fetchDashboardData} sx={{ ml: 1 }}>
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2" gutterBottom>CPU Usage</Typography>
                      <Box sx={{ width: '100%', mb: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={systemStatus.cpuUsage}
                          color={systemStatus.cpuUsage > 80 ? 'error' : systemStatus.cpuUsage > 60 ? 'warning' : 'success'}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">{systemStatus.cpuUsage}%</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2" gutterBottom>Memory Usage</Typography>
                      <Box sx={{ width: '100%', mb: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={systemStatus.memoryUsage}
                          color={systemStatus.memoryUsage > 80 ? 'error' : systemStatus.memoryUsage > 60 ? 'warning' : 'success'}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">{systemStatus.memoryUsage}%</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2" gutterBottom>Disk Usage</Typography>
                      <Box sx={{ width: '100%', mb: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={systemStatus.diskUsage}
                          color={systemStatus.diskUsage > 80 ? 'error' : systemStatus.diskUsage > 60 ? 'warning' : 'success'}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">{systemStatus.diskUsage}%</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2" gutterBottom>Active Users</Typography>
                      <Box sx={{ width: '100%', mb: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={(systemStatus.activeUsers / systemStatus.maxConcurrentUsers) * 100}
                          color="primary"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {systemStatus.activeUsers}/{systemStatus.maxConcurrentUsers}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">System Uptime</Typography>
                    <Typography variant="body1">{systemStatus.uptime}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Last Backup</Typography>
                    <Typography variant="body1">
                      {typeof systemStatus.lastBackup === 'string' 
                        ? systemStatus.lastBackup 
                        : new Date(systemStatus.lastBackup).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Audit Logs */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="div" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Audit Logs
                  <AssessmentIcon fontSize="small" color="primary" />
                </Typography>
                
                <Box sx={{ mt: 2, mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Monitor user activity and system events with detailed audit logs. Track logins, file operations, system changes, and other critical events.
                  </Typography>
                  
                  <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Recent Activities</Typography>
                        <Typography variant="h5">247</Typography>
                        <Typography variant="body2" color="text.secondary">(Last 24 hours)</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Security Events</Typography>
                        <Typography variant="h5">18</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip size="small" label="3 critical" color="error" sx={{ mr: 1 }} />
                          <Chip size="small" label="15 warnings" color="warning" />
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                  
                  <Typography variant="body2" paragraph>
                    View complete audit history with filtering options for users, dates, and event types. Export logs for compliance and reporting.
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    endIcon={<ChevronRightIcon />}
                    onClick={() => router.push('/admin/audit')}
                  >
                    View Audit Logs
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Backup & Recovery */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="div" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Backup & Recovery
                  <BackupIcon fontSize="small" color="primary" />
                </Typography>
                
                <Box sx={{ mt: 2, mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Manage system backups, schedule automatic backups, and restore from previous backups if needed. Ensure data integrity and business continuity.
                  </Typography>
                  
                  <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Last Backup</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          Today, 2:30 AM
                        </Typography>
                        <Box>
                          <Chip size="small" label="Successful" color="success" />
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Next Scheduled</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          Tomorrow, 2:30 AM
                        </Typography>
                        <Box>
                          <Chip size="small" label="Daily backup" color="info" />
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                  
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', bgcolor: 'background.default' }}>
                        <RestoreIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
                        <Typography variant="body2">
                          System Maintenance: <strong>Disabled</strong>
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', bgcolor: 'background.default' }}>
                        <BackupIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                        <Typography variant="body2">
                          Total Backups: <strong>12</strong>
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    endIcon={<ChevronRightIcon />}
                    onClick={() => router.push('/admin/backups')}
                  >
                    Manage Backups
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default withProtectedRoute(AdminDashboardPage, {
  allowedRoles: ['ADMIN'],
  requireAuth: true,
}); 