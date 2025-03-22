'use client';

import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Box } from '@mui/material';
import { 
  MedicalInformation as MedicalIcon, 
  CalendarMonth as CalendarIcon, 
  Image as ImageIcon, 
  Message as MessageIcon 
} from '@mui/icons-material';
import StatCard from '@/components/dashboard/StatCard';
import UsageChart from '@/components/dashboard/UsageChart';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import { ApiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

// Define the Activity interface to match ActivityTimeline component
interface Activity {
  id: string;
  user: string; 
  action: string;
  time: string;
  avatar: string;
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patientStats, setPatientStats] = useState({
    appointments: {
      upcoming: 0,
      past: 0,
      nextAppointment: null,
    },
    images: {
      total: 0,
      recentlyUploaded: 0,
      recentlyViewed: 0,
    },
    messages: {
      unread: 0,
      total: 0,
    },
    records: {
      total: 0,
      recentlyUpdated: 0,
    },
  });
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [healthMetrics, setHealthMetrics] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const apiClient = ApiClient.getInstance();
        const response = await apiClient.getUserMetrics(user.id);
        
        if (response.data) {
          const metrics = response.data;
          
          // Update stats with real data
          setPatientStats({
            appointments: {
              upcoming: metrics.upcomingAppointments || 0,
              past: metrics.pastAppointments || 0,
              nextAppointment: metrics.nextAppointment || null,
            },
            images: {
              total: metrics.totalImages || 0,
              recentlyUploaded: metrics.recentlyUploadedImages || 0,
              recentlyViewed: metrics.recentlyViewedImages || 0,
            },
            messages: {
              unread: metrics.unreadMessages || 0,
              total: metrics.totalMessages || 0,
            },
            records: {
              total: metrics.totalRecords || 0,
              recentlyUpdated: metrics.recentlyUpdatedRecords || 0,
            },
          });
          
          // Set activities if available
          if (metrics.recentActivities && metrics.recentActivities.length > 0) {
            setActivities(metrics.recentActivities.map((activity: any, index: number) => ({
              id: activity.id || `activity-${index}`,
              user: activity.user || 'System',
              action: activity.action || 'performed an action',
              time: activity.time || 'recently',
              avatar: activity.avatar || '/avatars/system.jpg',
            })));
          } else {
            // Initialize with empty array instead of mock data
            setActivities([]);
          }
        }
        
        // Fetch health metrics
        await fetchHealthMetrics();
      } catch (error) {
        console.error('Error fetching user metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchHealthMetrics = async () => {
      try {
        const apiClient = ApiClient.getInstance();
        if (!user?.id) {
          console.error('User ID is not available');
          return;
        }
        
        const response = await apiClient.getHealthMetrics({ 
          patientId: user.id,
          // Get last 9 months of data
          startDate: new Date(new Date().setMonth(new Date().getMonth() - 9)).toISOString().split('T')[0]
        });
        
        if (response.status === 'success' && response.data) {
          // Format the data for the chart
          // Assuming we're displaying a blood pressure trend or another primary metric
          const formattedData = response.data.map((metric: { date: string; systolic?: number; value?: number }) => ({
            name: new Date(metric.date).toLocaleString('default', { month: 'short' }),
            value: metric.systolic || metric.value || 0 // Adjust based on actual API response
          }));
          
          setHealthMetrics(formattedData);
        } else {
          setHealthMetrics([]);
        }
      } catch (error) {
        console.error('Error fetching health metrics:', error);
        setHealthMetrics([]);
      }
    };

    if (user?.id) {
      fetchStats();
      
      // Refresh stats every 60 seconds
      const interval = setInterval(fetchStats, 60000);
      
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Generate placeholder data when real data is not available
  const getHealthMetricsData = () => {
    if (healthMetrics.length > 0) {
      return healthMetrics;
    }
    
    // Return placeholder data if no real metrics are available
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    return months.map(month => ({
      name: month,
      value: 120 + Math.floor(Math.random() * 15)
    }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Patient Dashboard
        </Typography>
        {user && (
          <Typography variant="subtitle1">
            Welcome back, {user.name?.split(' ')[0] || 'Patient'}
          </Typography>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Appointments Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Appointments"
            value={patientStats.appointments.upcoming}
            subtitle={`${patientStats.appointments.past} past appointments`}
            icon={<CalendarIcon color="primary" />}
            loading={loading}
          />
        </Grid>

        {/* Medical Records Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Medical Records"
            value={patientStats.records.total}
            subtitle={`${patientStats.records.recentlyUpdated} recently updated`}
            icon={<MedicalIcon color="primary" />}
            loading={loading}
          />
        </Grid>

        {/* Images Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Images"
            value={patientStats.images.total}
            subtitle={`${patientStats.images.recentlyUploaded} recently uploaded`}
            icon={<ImageIcon color="primary" />}
            loading={loading}
          />
        </Grid>

        {/* Messages Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Messages"
            value={patientStats.messages.unread}
            subtitle={`${patientStats.messages.total} total messages`}
            icon={<MessageIcon color="primary" />}
            loading={loading}
          />
        </Grid>

        {/* Health Metrics Chart */}
        <Grid item xs={12} md={8}>
          <UsageChart 
            title="Health Metrics Trend"
            data={getHealthMetricsData()}
            loading={loading}
          />
        </Grid>

        {/* Activity Timeline */}
        <Grid item xs={12} md={4}>
          <ActivityTimeline 
            title="Recent Activity"
            activities={activities}
            loading={loading}
          />
        </Grid>
      </Grid>
    </Container>
  );
} 