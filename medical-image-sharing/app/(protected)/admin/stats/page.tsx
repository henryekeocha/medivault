'use client';

import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Alert } from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  Storage as StorageIcon, 
  Speed as PerformanceIcon, 
  People as UsersIcon, 
  CloudUpload as UploadIcon 
} from '@mui/icons-material';
import StatCard from '@/components/dashboard/StatCard';
import UsageChart from '@/components/dashboard/UsageChart';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import TopUsersTable from '@/components/dashboard/TopUsersTable';
import { adminClient } from '@/lib/api/adminClient';
import { sharedClient } from '@/lib/api/sharedClient';
import { useToast } from '@/hooks/useToast';
import { User, Role } from '@prisma/client';

// Add type definitions for the response types
interface StorageHistoryItem {
  month?: string;
  date?: string;
  storageUsed: number;
}

interface UserResponse extends User {
  stats?: {
    storageUsed: number;
    filesCount: number;
  };
}

interface ActivityLog {
  id: string;
  userName: string;
  action: string;
  createdAt: string;
  userAvatar?: string;
}

interface FormattedActivity {
  id: string;
  user: string;
  action: string;
  time: string;
  avatar: string;
}

export default function AdminStatsPage() {
  const { showError } = useToast();
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState({
    storage: {
      used: 0,
      total: 5, // Default 5TB total storage
      uploadRate: 0,
    },
    performance: {
      responseTime: 0,
      uptime: 0,
      errorRate: 0,
    },
    users: {
      total: 0,
      active: 0,
      newToday: 0,
    },
    uploads: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
    },
  });
  const [storageHistory, setStorageHistory] = useState<{name: string, value: number}[]>([]);
  const [recentActivity, setRecentActivity] = useState<FormattedActivity[]>([]);
  const [topUsers, setTopUsers] = useState<{id: string, name: string, department: string, storageUsed: string, filesUploaded: number, avatar: string}[]>([]);

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch system metrics
        await fetchSystemMetrics();
        
        // Fetch storage history
        await fetchStorageHistory();
        
        // Fetch recent activity
        await fetchRecentActivity();
        
        // Fetch top users
        await fetchTopUsers();
      } catch (error) {
        console.error('Error fetching admin statistics:', error);
        setError('Failed to load one or more statistics. Please try again later.');
        showError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
    
    // Refresh stats every 60 seconds
    const interval = setInterval(fetchAllStats, 60000);
    
    return () => clearInterval(interval);
  }, [showError]);

  const fetchSystemMetrics = async () => {
    try {
      const response = await adminClient.getSystemMetrics();
      
      if (response.status === 'success' && response.data) {
        const metrics = response.data;
        
        // Convert bytes to TB for storage metrics
        const usedStorageTB = metrics.usedStorage / (1024 * 1024 * 1024 * 1024);
        const totalStorageTB = metrics.totalStorage / (1024 * 1024 * 1024 * 1024) || 5; // Default 5TB if not provided
        
        // Update stats with real data
        setSystemStats({
          storage: {
            used: parseFloat(usedStorageTB.toFixed(2)),
            total: parseFloat(totalStorageTB.toFixed(2)),
            uploadRate: parseFloat((metrics.dailyUploadRate / (1024 * 1024 * 1024)).toFixed(2)) || 0, // Daily upload rate in GB
          },
          performance: {
            responseTime: metrics.performanceMetrics?.averageResponseTime || 0,
            uptime: metrics.performanceMetrics?.uptime || 99.9,
            errorRate: metrics.performanceMetrics?.errorRate || 0,
          },
          users: {
            total: metrics.totalUsers || 0,
            active: metrics.activeUsers || 0,
            newToday: metrics.newUsers || 0,
          },
          uploads: {
            today: metrics.dailyUploads || 0,
            thisWeek: metrics.weeklyUploads || 0,
            thisMonth: metrics.monthlyUploads || 0,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      throw error;
    }
  };

  const fetchStorageHistory = async () => {
    try {
      const response = await adminClient.getStorageStats();
      
      if (response.status === 'success' && response.data) {
        const storageData = response.data.history || [];
        
        // Convert the data to TB and format for the chart
        const formattedData = storageData.map((item: StorageHistoryItem) => ({
          name: item.month || item.date || '',
          value: parseFloat((item.storageUsed / (1024 * 1024 * 1024 * 1024)).toFixed(2))
        }));
        
        setStorageHistory(formattedData);
      }
    } catch (error) {
      console.error('Error fetching storage history:', error);
      // If this fails, we'll use an empty array
      setStorageHistory([]);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await adminClient.getActivityLogs({ limit: 5 });
      
      if (response.status === 'success' && response.data) {
        // Format the activity logs for the timeline component
        const formattedActivities = response.data.data.map((log: ActivityLog) => ({
          id: log.id,
          user: log.userName || 'System',
          action: log.action,
          time: log.createdAt, // The component will format this
          avatar: log.userAvatar || '/avatars/system.jpg'
        }));
        
        setRecentActivity(formattedActivities);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // If this fails, we'll use an empty array
      setRecentActivity([]);
    }
  };

  const fetchTopUsers = async () => {
    try {
      const response = await adminClient.getUsers({ 
        limit: 5,
        sortBy: 'createdAt',
        sortDirection: 'desc'
      });
      
      if (response.status === 'success' && response.data?.data) {
        // Format the user data for the table component
        const formattedUsers = response.data.data.map((user: any) => {
          const userWithStats = user as UserResponse;
          return {
            id: user.id,
            name: user.name || 'Unknown',
            department: user.role || Role.PATIENT,
            storageUsed: `${parseFloat(((userWithStats.stats?.storageUsed || 0) / (1024 * 1024)).toFixed(2))} MB`,
            filesUploaded: userWithStats.stats?.filesCount || 0,
            avatar: user.image || `/avatars/default.jpg`
          };
        });
        
        setTopUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Error fetching top users:', error);
      // If this fails, we'll use an empty array
      setTopUsers([]);
    }
  };

  // Helper function to generate placeholder data when real data is not available
  const generatePlaceholderData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    return months.map((month, index) => ({
      name: month,
      value: systemStats.storage.used * ((index + 5) / 10)
    }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        System Statistics
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Storage Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Storage"
            value={`${systemStats.storage.used}TB / ${systemStats.storage.total}TB`}
            subtitle={`${systemStats.storage.uploadRate}GB uploaded today`}
            icon={<StorageIcon color="primary" />}
            progress={(systemStats.storage.used / systemStats.storage.total) * 100}
            loading={loading}
          />
        </Grid>

        {/* Performance Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Performance"
            value={`${systemStats.performance.responseTime}ms`}
            subtitle={`${systemStats.performance.uptime}% uptime`}
            icon={<PerformanceIcon color="primary" />}
            loading={loading}
          />
        </Grid>

        {/* User Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Users"
            value={systemStats.users.total}
            subtitle={`${systemStats.users.active} active users`}
            icon={<UsersIcon color="primary" />}
            progress={(systemStats.users.active / systemStats.users.total) * 100}
            loading={loading}
          />
        </Grid>

        {/* Upload Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Uploads"
            value={systemStats.uploads.today}
            subtitle={`${systemStats.uploads.thisWeek} this week`}
            icon={<UploadIcon color="primary" />}
            loading={loading}
          />
        </Grid>

        {/* Storage Usage Chart */}
        <Grid item xs={12} md={8}>
          <UsageChart 
            title="Storage Usage Trend"
            data={storageHistory.length > 0 ? storageHistory : generatePlaceholderData()}
            loading={loading}
          />
        </Grid>

        {/* Activity Timeline */}
        <Grid item xs={12} md={4}>
          <ActivityTimeline 
            title="Recent Activity"
            activities={recentActivity}
            loading={loading}
          />
        </Grid>

        {/* Top Users Table */}
        <Grid item xs={12}>
          <TopUsersTable 
            title="Top Users by Storage Usage"
            users={topUsers}
            loading={loading}
          />
        </Grid>
      </Grid>
    </Container>
  );
} 