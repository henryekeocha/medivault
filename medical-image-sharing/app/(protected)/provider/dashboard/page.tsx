'use client';

import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Box } from '@mui/material';
import { 
  Person as PatientIcon, 
  CalendarMonth as CalendarIcon, 
  Image as ImageIcon, 
  Message as MessageIcon 
} from '@mui/icons-material';
import StatCard from '@/components/dashboard/StatCard';
import UsageChart from '@/components/dashboard/UsageChart';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import TopUsersTable from '@/components/dashboard/TopUsersTable';
import UpcomingAppointments from '@/components/dashboard/UpcomingAppointments';
import { providerClient } from '@/lib/api/providerClient';
import { useUser } from '@clerk/nextjs';
import { formatBytes } from '@/utils/formatBytes'; 
import '@/utils/dateUtils'; // Import to enable Date.prototype.toRelativeTime

// Define interfaces to match the dashboard component props
interface Activity {
  id: string;
  user: string;
  action: string;
  time: string;
  avatar: string;
}

interface Patient {
  id: string;
  name: string;
  department: string;
  storageUsed: string;
  filesUploaded: number;
  avatar: string;
}

interface ActivityTrend {
  name: string;
  value: number;
}

function ProviderDashboard() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [providerStats, setProviderStats] = useState({
    patients: {
      total: 0,
      new: 0,
      active: 0,
    },
    appointments: {
      today: 0,
      upcoming: 0,
      completed: 0,
    },
    images: {
      total: 0,
      recentlyUploaded: 0,
      pendingReview: 0,
    },
    messages: {
      unread: 0,
      total: 0,
    },
  });
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [topPatients, setTopPatients] = useState<Patient[]>([]);
  const [activityTrend, setActivityTrend] = useState<ActivityTrend[]>([]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      return;
    }

    // Check if user has provider role in metadata
    const userRole = user.publicMetadata.role;
    if (userRole !== 'PROVIDER') {
      return;
    }
    
    async function fetchStats() {
      try {
        setLoading(true);
        
        // Use providerClient to fetch statistics
        const response = await providerClient.getProviderStatistics();
        
        if (response.status === 'success' && response.data) {
          const metrics = response.data;
          
          // Update stats with real data
          setProviderStats({
            patients: {
              total: metrics.patients?.total || 0,
              new: metrics.patients?.new || 0,
              active: metrics.patients?.active || 0,
            },
            appointments: {
              today: metrics.appointments?.today || 0,
              upcoming: metrics.appointments?.upcoming || 0,
              completed: metrics.appointments?.completed || 0,
            },
            images: {
              total: metrics.images?.total || 0,
              recentlyUploaded: metrics.images?.recentlyUploaded || 0,
              pendingReview: metrics.images?.pendingReview || 0,
            },
            messages: {
              unread: metrics.messages?.unread || 0,
              total: metrics.messages?.total || 0,
            },
          });
          
          // Set activity trend data if available
          if (metrics.activityTrend && metrics.activityTrend.length > 0) {
            setActivityTrend(metrics.activityTrend.map((point: any) => ({
              name: point.period || '',
              value: point.count || 0
            })));
          } else {
            // Initialize with empty array instead of mock data
            setActivityTrend([]);
          }
          
          // Set activities if available
          if (metrics.recentActivities && metrics.recentActivities.length > 0) {
            setActivities(metrics.recentActivities.map((activity: any) => ({
              id: activity.id || `activity-${activity.timestamp || Date.now()}`,
              user: activity.user?.name || 'System',
              action: activity.description || 'performed an action',
              time: activity.timestamp ? new Date(activity.timestamp).toRelativeTime() : 'recently',
              avatar: activity.user?.profileImage || '/avatars/system.jpg',
            })));
          } else {
            // Initialize with empty array instead of mock data
            setActivities([]);
          }
          
          // Set top patients if available
          if (metrics.topPatients && metrics.topPatients.length > 0) {
            setTopPatients(metrics.topPatients.map((patient: any) => ({
              id: patient.id || `patient-${Date.now()}`,
              name: patient.name || 'Unknown Patient',
              department: patient.department || 'General',
              storageUsed: formatBytes(patient.storageUsed) || '0 MB',
              filesUploaded: patient.filesUploaded || 0,
              avatar: patient.profileImage || '/avatars/patient1.jpg',
            })));
          } else {
            // Initialize with empty array instead of mock data
            setTopPatients([]);
          }
        } else {
          console.error('Failed to fetch provider statistics:', response.error?.message || 'Unknown error');
          // Initialize with empty data
          setActivityTrend([]);
          setActivities([]);
          setTopPatients([]);
        }
      } catch (error) {
        console.error('Error fetching provider statistics:', error);
        // Initialize with empty data on error
        setActivityTrend([]);
        setActivities([]);
        setTopPatients([]);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    
    // Refresh stats every 5 minutes instead of every minute to reduce API load
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isLoaded, user]);

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
          Provider Dashboard
        </Typography>
        {user && (
          <Typography variant="subtitle1">
            Welcome back, Dr. {user.firstName || 'Provider'}
          </Typography>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Patients Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Patients"
            value={providerStats.patients.total}
            subtitle={`${providerStats.patients.new} new patients`}
            icon={<PatientIcon color="primary" />}
            loading={loading}
          />
        </Grid>

        {/* Appointments Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Appointments"
            value={providerStats.appointments.today}
            subtitle={`${providerStats.appointments.upcoming} upcoming`}
            icon={<CalendarIcon color="primary" />}
            loading={loading}
          />
        </Grid>

        {/* Images Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Images"
            value={providerStats.images.total}
            subtitle={`${providerStats.images.pendingReview} pending review`}
            icon={<ImageIcon color="primary" />}
            loading={loading}
          />
        </Grid>

        {/* Messages Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Messages"
            value={providerStats.messages.unread}
            subtitle={`${providerStats.messages.total} total messages`}
            icon={<MessageIcon color="primary" />}
            loading={loading}
          />
        </Grid>

        {/* Patient Activity Chart and Recent Activity side by side */}
        <Grid item xs={12} md={8}>
          <UsageChart 
            title="Patient Activity Trend"
            data={activityTrend}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <ActivityTimeline 
            title="Recent Activity"
            activities={activities}
            loading={loading}
          />
        </Grid>

        {/* Upcoming Appointments section */}
        <Grid item xs={12} md={6}>
          <UpcomingAppointments 
            providerId={user.id}
            loading={loading}
          />
        </Grid>

        {/* Top Patients Table (half width to balance with appointments) */}
        <Grid item xs={12} md={6}>
          <TopUsersTable 
            title="Top Patients by Activity"
            users={topPatients}
            loading={loading}
          />
        </Grid>
      </Grid>
    </Container>
  );
}

export default ProviderDashboard; 