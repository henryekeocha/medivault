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
import { useToast } from '@/contexts/ToastContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useUser } from '@clerk/nextjs';
import { patientClient } from '@/lib/api/patientClient';
import { providerClient } from '@/lib/api/providerClient';
import { adminClient } from '@/lib/api/adminClient';
import { ApiResponse } from '@/lib/api/types';
import StatCard from '@/components/dashboard/StatCard';
import HealthMetricsChart from '@/components/dashboard/HealthMetricsChart';
import RecentActivity, { Activity } from '@/components/dashboard/RecentActivity';
import ImageIcon from '@mui/icons-material/Image';
import EventIcon from '@mui/icons-material/Event';
import MailIcon from '@mui/icons-material/Mail';
import { Role } from '@prisma/client';

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
  const { user } = useUser();
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
      
      // Get dashboard stats based on role
      let response;
      if (user?.publicMetadata?.role === Role.PATIENT) {
        response = await patientClient.getPatientStats();
      } else if (user?.publicMetadata?.role === Role.PROVIDER) {
        response = await providerClient.getProviderStatistics();
      } else {
        response = await adminClient.getStatistics();
      }
      
      if (response.status === 'success' && response.data) {
        setStats({
          totalImages: response.data.totalImages || 0,
          pendingAppointments: response.data.pendingAppointments || 0,
          unreadMessages: response.data.unreadMessages || 0,
          recentActivities: response.data.recentActivities || []
        });
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
        {user?.publicMetadata?.role === Role.PATIENT ? 'Patient Dashboard' :
         user?.publicMetadata?.role === Role.PROVIDER ? 'Provider Dashboard' : 'Admin Dashboard'}
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards Row */}
        <Grid item xs={12} sm={4}>
          <StatCard
            title="Total Images"
            value={stats?.totalImages?.toString() || '0'}
            icon={<ImageIcon color="primary" />}
            color={theme.palette.primary.main}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <StatCard
            title="Pending Appointments"
            value={stats?.pendingAppointments?.toString() || '0'}
            icon={<EventIcon color="warning" />}
            color={theme.palette.warning.main}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <StatCard
            title="Unread Messages"
            value={stats?.unreadMessages?.toString() || '0'}
            icon={<MailIcon color="info" />}
            color={theme.palette.info.main}
            loading={loading}
          />
        </Grid>

        {/* Health Metrics Chart */}
        <Grid item xs={12}>
          <HealthMetricsChart
            title="Health Metrics History"
            patientId={user?.id || ''}
            loading={loading}
          />
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12}>
          <RecentActivity
            title="Recent Activities"
            activities={stats?.recentActivities || []}
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