import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Event as EventIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isAfter } from 'date-fns';
import { patientClient } from '@/lib/api/patientClient';
import { providerClient } from '@/lib/api/providerClient';
import { AppointmentStatus, ProviderSpecialty } from '@prisma/client';
import { Appointment, AppointmentResponse, UpdateAppointmentRequest, User } from '@/lib/api/types';
import { toast } from 'react-hot-toast';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface PatientAppointmentsProps {
  onBookClick: () => void;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export const PatientAppointments: React.FC<PatientAppointmentsProps> = ({ onBookClick }) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch appointments
  const { data: appointmentsResponse, isLoading, error } = useQuery({
    queryKey: ['appointments'] as const,
    queryFn: async () => {
      // Get the user's profile to get their ID
      const profileResponse = await patientClient.getUserProfile();
      if (profileResponse.status !== 'success' || !profileResponse.data?.id) {
        throw new Error('Failed to get user profile');
      }

      // Get all appointments for the patient
      const response = await providerClient.getPatientAppointments(profileResponse.data.id, {
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString()
      });

      return response.data;
    }
  });

  // Cancel appointment mutation
  const cancelAppointment = useMutation({
    mutationFn: (appointmentId: string) => 
      patientClient.updateAppointment(appointmentId, { status: AppointmentStatus.CANCELLED }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment cancelled successfully');
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel appointment');
    }
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDialogOpen(true);
  };

  const handleCancelAppointment = () => {
    if (selectedAppointment) {
      cancelAppointment.mutate(selectedAppointment.id);
    }
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.COMPLETED:
        return 'success';
      case AppointmentStatus.CANCELLED:
        return 'error';
      case AppointmentStatus.NO_SHOW:
        return 'warning';
      default:
        return 'primary';
    }
  };

  const renderAppointmentList = (appointments: Appointment[]) => {
    if (!appointments || appointments.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No appointments found
        </Alert>
      );
    }

    return (
      <List>
        {appointments.map((appointment) => (
          <Paper
            key={appointment.id}
            sx={{
              mb: 2,
              '&:hover': {
                bgcolor: 'action.hover',
                cursor: 'pointer'
              }
            }}
            onClick={() => handleAppointmentClick(appointment)}
          >
            <ListItem>
              <Box width="100%">
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1">
                    Dr. {appointment.doctor?.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={appointment.status}
                    color={getStatusColor(appointment.status)}
                  />
                </Box>
                <Box display="flex" alignItems="center" mt={1} gap={2}>
                  <Box display="flex" alignItems="center">
                    <ScheduleIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="body2">
                      {format(new Date(appointment.scheduledFor), 'PPpp')}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography color="text.secondary" 
                      variant="body2"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      {(appointment.doctor as User & { specialty: ProviderSpecialty })?.specialty}
                    </Typography>
                  </Box>
                </Box>
                {appointment.notes && (
                  <Box display="flex" alignItems="center" mt={1}>
                    <NotesIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography color="text.secondary"
                      variant="body2"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      {appointment.notes}
                    </Typography>
                  </Box>
                )}
              </Box>
            </ListItem>
          </Paper>
        ))}
      </List>
    );
  };

  const renderAppointmentDialog = () => {
    if (!selectedAppointment) return null;

    const isPastAppointment = isAfter(new Date(), new Date(selectedAppointment.scheduledFor));
    const doctor = selectedAppointment.doctor as User & { specialty: ProviderSpecialty };

    return (
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Appointment Details</DialogTitle>
        <DialogContent>
          <Box py={2}>
            <Typography variant="h6">
              Dr. {doctor.name}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {doctor.specialty}
            </Typography>

            <Box display="flex" alignItems="center" mt={2}>
              <EventIcon sx={{ mr: 1 }} />
              <Typography>
                {format(new Date(selectedAppointment.scheduledFor), 'PPpp')}
              </Typography>
            </Box>

            {selectedAppointment.notes && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Notes:
                </Typography>
                <Typography color="text.secondary">
                  {selectedAppointment.notes}
                </Typography>
              </Box>
            )}

            {selectedAppointment.imageId && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Associated Image ID:
                </Typography>
                <Typography color="text.secondary">
                  {selectedAppointment.imageId}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>
            Close
          </Button>
          {!isPastAppointment && selectedAppointment.status === AppointmentStatus.SCHEDULED && (
            <Button 
              onClick={handleCancelAppointment}
              color="error"
              disabled={cancelAppointment.isPending}
            >
              {cancelAppointment.isPending ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load appointments
      </Alert>
    );
  }

  const appointments = appointmentsResponse?.data || [];
  const upcomingAppointments = appointments.filter(
    (apt: Appointment) => apt.status === AppointmentStatus.SCHEDULED && !isAfter(new Date(), new Date(apt.scheduledFor))
  );
  const pastAppointments = appointments.filter(
    (apt: Appointment) => apt.status !== AppointmentStatus.SCHEDULED || isAfter(new Date(), new Date(apt.scheduledFor))
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          My Appointments
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={onBookClick}
        >
          Book New Appointment
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={`Upcoming (${upcomingAppointments.length})`} />
          <Tab label={`Past (${pastAppointments.length})`} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {renderAppointmentList(upcomingAppointments)}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        {renderAppointmentList(pastAppointments)}
      </TabPanel>

      {renderAppointmentDialog()}
    </Box>
  );
}; 