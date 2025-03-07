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
import { ProviderCalendar } from '@/components/appointments/ProviderCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { ApiClient } from '@/lib/api/client';
import StatCard from '@/components/dashboard/StatCard';
import { 
  CalendarMonth as CalendarIcon,
  Today as TodayIcon,
  CheckCircle as CompletedIcon,
  Cancel as CancelledIcon,
  ViewComfy as GridViewIcon,
  ViewAgenda as ListViewIcon
} from '@mui/icons-material';

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
  total?: number;
  patients?: number;
}

export default function ProviderAppointmentsPage() {
  const { user } = useAuth();
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
  });
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // View type state (list or calendar)
  const [viewType, setViewType] = useState<'list' | 'calendar'>('list');
  
  // Fetch appointment stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const apiClient = ApiClient.getInstance();
        const todayResponse = await apiClient.getDoctorAppointments(user.id, { status: 'SCHEDULED,CONFIRMED', startDate: new Date().toISOString().split('T')[0] });
        const upcomingResponse = await apiClient.getDoctorAppointments(user.id, { status: 'SCHEDULED,CONFIRMED' });
        const completedResponse = await apiClient.getDoctorAppointments(user.id, { status: 'COMPLETED' });
        const cancelledResponse = await apiClient.getDoctorAppointments(user.id, { status: 'CANCELLED' });
        
        setStats({
          today: todayResponse.data?.totalCount || 0,
          upcoming: upcomingResponse.data?.totalCount || 0,
          completed: completedResponse.data?.totalCount || 0,
          cancelled: cancelledResponse.data?.totalCount || 0,
        });
      } catch (error) {
        console.error('Error fetching appointment stats:', error);
        setError('Failed to load appointment statistics.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [user?.id, refreshTrigger]);
  
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
        <Typography variant="h4">Patient Appointments</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={viewType === 'list' ? <CalendarIcon /> : <ListViewIcon />}
            onClick={() => setViewType(viewType === 'list' ? 'calendar' : 'list')}
          >
            {viewType === 'list' ? 'Calendar View' : 'List View'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setNewAppointmentOpen(true)}
          >
            Schedule Appointment
          </Button>
        </Box>
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
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Today's Appointments"
                value={stats.today.toString()}
                icon={<TodayIcon />}
                color={theme.palette.primary.main}
                subtitle={`${stats.today === 1 ? '1 appointment' : `${stats.today} appointments`} today`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Upcoming Appointments"
                value={stats.upcoming.toString()}
                icon={<CalendarIcon />}
                color={theme.palette.info.main}
                subtitle={`Future scheduled appointments`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Completed Appointments"
                value={stats.completed.toString()}
                icon={<CompletedIcon />}
                color={theme.palette.success.main}
                subtitle={`Successfully completed appointments`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Cancelled Appointments"
                value={stats.cancelled.toString()}
                icon={<CancelledIcon />}
                color={theme.palette.error.main}
                subtitle={`Appointments that were cancelled`}
              />
            </Grid>
          </Grid>
          
          {viewType === 'list' ? (
            // List view with tabs
            <>
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
                  userRole="PROVIDER"
                  onView={handleViewAppointment}
                  onEdit={handleEditAppointment}
                  refreshTrigger={refreshTrigger}
                />
              )}
              
              {tabValue === 1 && (
                <AppointmentList
                  userRole="PROVIDER"
                  onView={handleViewAppointment}
                  onEdit={handleEditAppointment}
                  refreshTrigger={refreshTrigger}
                />
              )}
              
              {tabValue === 2 && (
                <AppointmentList
                  userRole="PROVIDER"
                  onView={handleViewAppointment}
                  onEdit={handleEditAppointment}
                  refreshTrigger={refreshTrigger}
                />
              )}
              
              {tabValue === 3 && (
                <AppointmentList
                  userRole="PROVIDER"
                  onView={handleViewAppointment}
                  onEdit={handleEditAppointment}
                  refreshTrigger={refreshTrigger}
                />
              )}
              
              {tabValue === 4 && (
                <AppointmentList
                  userRole="PROVIDER"
                  onView={handleViewAppointment}
                  onEdit={handleEditAppointment}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </>
          ) : (
            // Calendar view
            <Box sx={{ mt: 2 }}>
              <Paper sx={{ p: 2 }}>
                <ProviderCalendar />
              </Paper>
            </Box>
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
            Schedule New Appointment
            <IconButton edge="end" onClick={() => setNewAppointmentOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <AppointmentForm
            onSuccess={handleAppointmentSuccess}
            providerId={user?.id}
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
              providerId={user?.id}
              patientId={selectedAppointment.patientId}
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
              userRole="PROVIDER"
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