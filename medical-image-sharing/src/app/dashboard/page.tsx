'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import { withProtectedRoute } from '@/components/ProtectedRoute';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/components/Toast';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { ApiClient } from '@/lib/api/client';
import { ApiResponse } from '@/lib/api/types';
import StatCard from '@/components/dashboard/StatCard';
import HealthMetricsChart from '@/components/dashboard/HealthMetricsChart';
import RecentActivity, { Activity } from '@/components/dashboard/RecentActivity';
import ImageIcon from '@mui/icons-material/Image';
import EventIcon from '@mui/icons-material/Event';
import MailIcon from '@mui/icons-material/Mail';

interface DashboardStats {
  totalImages: number;
  pendingAppointments: number;
  unreadMessages: number;
  recentActivities: Activity[];
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const toast = useToast();
  const { onMessage } = useWebSocket();
  const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    loadDashboardData();

    // Subscribe to real-time updates
    const unsubscribeActivity = onMessage('activity_update', handleActivityUpdate);
    const unsubscribeStats = onMessage('stats_update', handleStatsUpdate);

    return () => {
      unsubscribeActivity();
      unsubscribeStats();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Use ApiClient instead of direct fetch
      const apiClient = ApiClient.getInstance();
      
      // Get dashboard stats
      const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats');
      
      if (response.status === 'success' && response.data) {
        setStats(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Dashboard data error:', error);
      toast.showError('Failed to load dashboard data. Please try again later.');
      
      // Initialize with empty data instead of mock data
      setStats({
        totalImages: 0,
        pendingAppointments: 0,
        unreadMessages: 0,
        recentActivities: [], 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivityUpdate = (payload: Activity) => {
    setStats(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        recentActivities: [payload, ...prev.recentActivities].slice(0, 10),
      };
    });
  };

  const handleStatsUpdate = (payload: Partial<DashboardStats>) => {
    setStats(prev => prev ? { ...prev, ...payload } : prev);
  };

  if (loading) {
    return <LoadingState fullScreen message="Loading dashboard..." />;
  }

  if (!stats) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{ 
          fontWeight: 600, 
          color: theme.palette.primary.main,
          mb: 4
        }}
      >
        Patient Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards Row */}
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total Images"
            value={stats.totalImages.toString()}
            icon={<ImageIcon color="primary" />}
            color="primary"
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <StatCard
            title="Pending Appointments"
            value={stats.pendingAppointments.toString()}
            icon={<EventIcon color="warning" />}
            color="warning"
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <StatCard
            title="Unread Messages"
            value={stats.unreadMessages.toString()}
            icon={<MailIcon color="info" />}
            color="info"
          />
        </Grid>

        {/* Health Metrics Chart */}
        <Grid item xs={12}>
          <HealthMetricsChart
            title="Health Metrics History"
            patientId={user?.id || ''}
          />
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12}>
          <RecentActivity
            title="Recent Activities"
            activities={stats.recentActivities}
            loading={loading}
          />
        </Grid>
      </Grid>
    </Container>
  );
}

export default withProtectedRoute(Dashboard, {
  allowedRoles: ['PROVIDER', 'PATIENT', 'ADMIN'],
  requireAuth: true,
}); 