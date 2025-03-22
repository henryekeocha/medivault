'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { withProtectedRoute } from '@/components/ProtectedRoute';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api/api'; 

interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  activeConnections: number;
  responseTime: number;
  errorRate: number;
  performanceHistory: Array<{
    timestamp: string;
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
    responseTime: number;
  }>;
  errorDistribution: Array<{
    timestamp: string;
    count: number;
    type: string;
  }>;
  storageGrowth: Array<{
    date: string;
    totalStorage: number;
    usedStorage: number;
  }>;
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function SystemPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [timeRange, setTimeRange] = useState('1h');
  const toast = useToast();

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.get<SystemStats>('/api/analytics/system', {
        params: { timeRange },
      });
      setStats(response);
    } catch (error) {
      toast.showError('Failed to load system performance data');
      console.error('Error loading system performance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Set up polling for real-time updates
    const interval = setInterval(loadStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  if (loading || !stats) {
    return <LoadingState fullScreen message="Loading system performance..." />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          System Performance
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small">
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="6h">Last 6 Hours</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={loadStats}>
            Refresh
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Current System Status */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                CPU Usage
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Box sx={{ flex: 1, mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={stats.cpuUsage}
                    color={stats.cpuUsage > 80 ? 'error' : 'primary'}
                  />
                </Box>
                <Typography variant="body2">{stats.cpuUsage}%</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Memory Usage
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Box sx={{ flex: 1, mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={stats.memoryUsage}
                    color={stats.memoryUsage > 80 ? 'error' : 'primary'}
                  />
                </Box>
                <Typography variant="body2">{stats.memoryUsage}%</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Storage Usage
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Box sx={{ flex: 1, mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={stats.storageUsage}
                    color={stats.storageUsage > 80 ? 'error' : 'primary'}
                  />
                </Box>
                <Typography variant="body2">{stats.storageUsage}%</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Active Connections
              </Typography>
              <Typography variant="h4">{stats.activeConnections}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Average Response Time
              </Typography>
              <Typography variant="h4">{stats.responseTime}ms</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Error Rate
              </Typography>
              <Typography variant="h4">{stats.errorRate}%</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Performance History
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.performanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cpuUsage"
                      name="CPU Usage (%)"
                      stroke="#8884d8"
                    />
                    <Line 
                      type="monotone"
                      dataKey="memoryUsage"
                      name="Memory Usage (%)"
                      stroke="#82ca9d"
                    />
                    <Line
                      type="monotone"
                      dataKey="responseTime"
                      name="Response Time (ms)"
                      stroke="#ffc658"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Error Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.errorDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Error Count"
                      stroke="#ff4444"
                      fill="#ff4444"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Storage Growth */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Growth
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.storageGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="usedStorage"
                      name="Used Storage"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalStorage"
                      name="Total Storage"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default withProtectedRoute(SystemPerformancePage, {
  allowedRoles: ['ADMIN'],
  requireAuth: true,
}); 