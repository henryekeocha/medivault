'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Grid,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import AppointmentList from '@/components/appointments/AppointmentList';
import AppointmentForm from '@/components/appointments/AppointmentForm';
import AppointmentDetail from '@/components/appointments/AppointmentDetail';
import { useUser } from '@clerk/nextjs';
import { adminClient } from '@/lib/api/adminClient';
import { sharedClient } from '@/lib/api/sharedClient';
import StatCard from '@/components/dashboard/StatCard';
import { 
  CalendarMonth as CalendarIcon,
  Today as TodayIcon,
  CheckCircle as CompletedIcon,
  Cancel as CancelledIcon,
  MedicalServices as DoctorIcon,
  Person as PatientIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  patientName?: string;
  providerName?: string;
  scheduledFor: string;
  reason: string;
  notes?: string;
  status: string;
  type: string;
}

interface AppointmentStats {
  today: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  providers: number;
  patients: number;
}

export default function AdminAppointmentsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for dialogs
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // State for selected appointment
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // State for refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // State for stats
  const [stats, setStats] = useState<AppointmentStats>({
    today: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    providers: 0,
    patients: 0
  });

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Fetch appointment stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get appointment statistics from admin client
      const statsResponse = await adminClient.getStatistics();
      if (statsResponse.status === 'success') {
        const { appointments, users } = statsResponse.data;
        
        setStats({
          today: appointments.today || 0,
          upcoming: appointments.upcoming || 0,
          completed: appointments.completed || 0,
          cancelled: appointments.cancelled || 0,
          providers: users.providers || 0,
          patients: users.patients || 0
        });
      }
    } catch (error) {
      console.error('Error fetching appointment stats:', error);
      setError('Failed to load appointment statistics.');
    } finally {
      setLoading(false);
    }
  };
  
  // Check if user is authorized and fetch stats
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
    
    fetchStats();
  }, [isLoaded, user, router]);
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle view appointment
  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailDialogOpen(true);
  };
  
  // Handle edit appointment
  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditDialogOpen(true);
    setDetailDialogOpen(false);
  };
  
  // Handle appointment creation/update success
  const handleAppointmentSuccess = () => {
    setNewAppointmentOpen(false);
    setEditDialogOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle status change
  const handleStatusChange = () => {
    setRefreshTrigger(prev => prev + 1);
    setDetailDialogOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Appointment Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setNewAppointmentOpen(true)}
        >
          Create Appointment
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Today's Appointments"
                value={stats.today.toString()}
                icon={<TodayIcon />}
                color={theme.palette.primary.main}
                subtitle={`${stats.today === 1 ? '1 appointment' : `${stats.today} appointments`} today`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Upcoming"
                value={stats.upcoming.toString()}
                icon={<CalendarIcon />}
                color={theme.palette.info.main}
                subtitle={`Future scheduled appointments`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Completed"
                value={stats.completed.toString()}
                icon={<CompletedIcon />}
                color={theme.palette.success.main}
                subtitle={`Successfully completed appointments`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Cancelled"
                value={stats.cancelled.toString()}
                icon={<CancelledIcon />}
                color={theme.palette.error.main}
                subtitle={`Appointments that were cancelled`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Providers"
                value={stats.providers.toString()}
                icon={<DoctorIcon />}
                color={theme.palette.secondary.main}
                subtitle={`Active healthcare providers`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Patients"
                value={stats.patients.toString()}
                icon={<PatientIcon />}
                color={theme.palette.warning.main}
                subtitle={`Registered patients`}
              />
            </Grid>
          </Grid>
          
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant={isMobile ? "scrollable" : "fullWidth"}
              scrollButtons={isMobile ? "auto" : undefined}
            >
              <Tab label="All Appointments" />
              <Tab label="Today" />
              <Tab label="Upcoming" />
              <Tab label="Completed" />
              <Tab label="Cancelled" />
            </Tabs>
          </Paper>
          
          {/* Appointment List with different filters based on tab */}
          {tabValue === 0 && (
            <AppointmentList
              userRole="ADMIN"
              onView={handleViewAppointment}
              onEdit={handleEditAppointment}
              refreshTrigger={refreshTrigger}
            />
          )}
          
          {tabValue === 1 && (
            <AppointmentList
              userRole="ADMIN"
              onView={handleViewAppointment}
              onEdit={handleEditAppointment}
              refreshTrigger={refreshTrigger}
            />
          )}
          
          {tabValue === 2 && (
            <AppointmentList
              userRole="ADMIN"
              onView={handleViewAppointment}
              onEdit={handleEditAppointment}
              refreshTrigger={refreshTrigger}
            />
          )}
          
          {tabValue === 3 && (
            <AppointmentList
              userRole="ADMIN"
              onView={handleViewAppointment}
              onEdit={handleEditAppointment}
              refreshTrigger={refreshTrigger}
            />
          )}
          
          {tabValue === 4 && (
            <AppointmentList
              userRole="ADMIN"
              onView={handleViewAppointment}
              onEdit={handleEditAppointment}
              refreshTrigger={refreshTrigger}
            />
          )}
        </>
      )}
      
      {/* New Appointment Dialog */}
      <Dialog
        open={newAppointmentOpen}
        onClose={() => setNewAppointmentOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Create New Appointment
            <IconButton edge="end" onClick={() => setNewAppointmentOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <AppointmentForm
            onSuccess={handleAppointmentSuccess}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Appointment Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Edit Appointment
            <IconButton edge="end" onClick={() => setEditDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAppointment && (
            <AppointmentForm
              editMode
              initialData={selectedAppointment}
              onSuccess={handleAppointmentSuccess}
              patientId={selectedAppointment.patientId}
              providerId={selectedAppointment.providerId}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Appointment Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogContent>
          {selectedAppointment && (
            <AppointmentDetail
              appointment={selectedAppointment}
              userRole="ADMIN"
              onEdit={handleEditAppointment}
              onClose={() => setDetailDialogOpen(false)}
              onStatusChange={handleStatusChange}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
} 