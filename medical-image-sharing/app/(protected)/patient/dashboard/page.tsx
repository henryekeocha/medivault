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
import { patientClient } from '@/lib/api/patientClient';
import { sharedClient } from '@/lib/api/sharedClient';
import { useUser } from '@clerk/nextjs';
import { withProtectedRoute } from '@/components/ProtectedRoute';

// Define the Activity interface to match ActivityTimeline component
interface Activity {
  id: string;
  user: string; 
  action: string;
  time: string;
  avatar: string;
}

function PatientDashboard() {
  const { user, isLoaded } = useUser();
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
  const [recentActivity, setRecentActivity] = useState<Array<{
    name: string;
    value: number;
  }>>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        console.log('Fetching metrics for user:', user.id);
        const response = await sharedClient.getUserMetrics(user.id);
        
        console.log('Received response:', response);
        
        if (response?.status === 'success' && response?.data) {
          const metrics = response.data;
          console.log('Processing metrics:', metrics);
          
          // Update stats with real data
          setPatientStats({
            appointments: {
              upcoming: metrics.appointments?.upcoming || 0,
              past: metrics.appointments?.completed || 0,
              nextAppointment: null,
            },
            images: {
              total: metrics.images?.total || 0,
              recentlyUploaded: metrics.images?.recentUploads || 0,
              recentlyViewed: 0,
            },
            messages: {
              unread: metrics.messages?.unread || 0,
              total: metrics.messages?.total || 0,
            },
            records: {
              total: 0,
              recentlyUpdated: 0,
            },
          });
          
          // Set activities if available
          if (metrics.recentActivity && metrics.recentActivity.length > 0) {
            console.log('Processing activities:', metrics.recentActivity);
            setActivities(metrics.recentActivity.map((activity: any) => ({
              id: activity.id,
              user: activity.user,
              action: activity.action,
              time: activity.time,
              avatar: activity.avatar,
            })));
          } else {
            console.log('No activities found');
            setActivities([]);
          }

          // Set recent activity data for the chart
          const recentActivityData = [
            { name: 'Image Uploads', value: metrics.images?.recentUploads || 0 },
            { name: 'Downloads', value: metrics.images?.total || 0 },
            { name: 'Messages', value: metrics.messages?.total || 0 },
            { name: 'Appointments', value: metrics.appointments?.total || 0 }
          ];
          setRecentActivity(recentActivityData);
        } else {
          console.error('Invalid response format:', response);
          setRecentActivity([
            { name: 'Image Uploads', value: 0 },
            { name: 'Downloads', value: 0 },
            { name: 'Messages', value: 0 },
            { name: 'Appointments', value: 0 }
          ]);
        }
      } catch (error) {
        console.error('Error fetching user metrics:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }
        setRecentActivity([
          { name: 'Image Uploads', value: 0 },
          { name: 'Downloads', value: 0 },
          { name: 'Messages', value: 0 },
          { name: 'Appointments', value: 0 }
        ]);
      } finally {
        setLoading(false);
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
  const getRecentActivityData = () => {
    if (recentActivity && recentActivity.length > 0) {
      return recentActivity;
    }
    
    // Return placeholder data if no real activity is available
    return [
      { name: 'Image Uploads', value: 0 },
      { name: 'Downloads', value: 0 },
      { name: 'Messages', value: 0 },
      { name: 'Appointments', value: 0 }
    ];
  };

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Patient Dashboard
        </Typography>
        {user && (
          <Typography variant="subtitle1">
            Welcome back, {user.firstName || 'Patient'}
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

        {/* Recent Activity Chart */}
        <Grid item xs={12} md={8}>
          <UsageChart 
            title="Recent Activity"
            data={getRecentActivityData()}
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

export default withProtectedRoute(PatientDashboard, {
  allowedRoles: ['PATIENT'],
  requireAuth: true,
}); 