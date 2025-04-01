import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel, 
  FormHelperText,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  Snackbar,
  Autocomplete
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  Event as EventIcon,
  CalendarViewMonth as CalendarViewMonthIcon,
  CalendarViewWeek as CalendarViewWeekIcon,
  CalendarViewDay as CalendarViewDayIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfWeek, startOfDay, endOfDay, addDays, addWeeks, subWeeks, isSameDay, parseISO, formatISO } from 'date-fns';
import { providerClient } from '@/lib/api/providerClient';
import { AppointmentStatus } from '@prisma/client';
import { Appointment, AppointmentResponse, UpdateAppointmentRequest, CreateAppointmentRequest, User } from '@/lib/api/types';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';

interface TimeSlot {
  time: Date;
  appointment?: Appointment;
}

interface PatientOption {
  id: string;
  name: string;
}

type CalendarView = 'day' | 'week' | 'month';

const WORKING_HOURS = {
  start: 9, // 9 AM
  end: 17, // 5 PM
  slotDuration: 30 // 30 minutes
};

export const ProviderCalendar: React.FC = () => {
  // State for views and selections
  const [view, setView] = useState<CalendarView>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state for new appointment
  const [newAppointment, setNewAppointment] = useState({
    patientId: '',
    reason: '',
    notes: '',
    type: 'consultation'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // State for follow-up notes
  const [followUpNotes, setFollowUpNotes] = useState('');
  
  // State for patient search
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);

  const { data: session } = useSession();
  // Safely access provider ID, accounting for different session structures
  const providerId = session?.user && ('id' in session.user) 
    ? (session.user as any).id 
    : '';
  const queryClient = useQueryClient();
  
  // Initialize error handler
  const { 
    error: errorHandler, 
    handleError, 
    clearError,
    withErrorHandling
  } = useErrorHandler({
    context: 'Calendar',
    showToastByDefault: true
  });

  // Determine date range based on view
  const getDateRange = () => {
    if (view === 'day') {
      return {
        start: startOfDay(selectedDate),
        end: endOfDay(selectedDate)
      };
    } else if (view === 'week') {
      const start = startOfWeek(selectedDate);
      return {
        start,
        end: addDays(start, 6)
      };
    } else {
      // Month view (simplified - just showing 4 weeks)
      const start = startOfWeek(selectedDate);
      return {
        start,
        end: addWeeks(start, 3)
      };
    }
  };

  const dateRange = getDateRange();

  // Fetch appointments for the current view
  const { data: appointmentsResponse, isLoading, error: appointmentsError, refetch: refetchAppointments } = useQuery({
    queryKey: ['appointments', dateRange.start.toISOString(), dateRange.end.toISOString(), providerId],
    queryFn: async () => {
      if (!providerId) return { data: { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } } };
      
      const response = await providerClient.getAppointments({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      
      return response;
    },
    enabled: !!providerId
  });

  // Update appointment mutation
  const updateAppointment = useMutation({
    mutationFn: (data: { id: string; updates: UpdateAppointmentRequest }) =>
      providerClient.updateAppointment(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment updated successfully');
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      handleError(error);
    }
  });
  
  // Create new appointment mutation
  const createAppointment = useMutation({
    mutationFn: (data: CreateAppointmentRequest) => {
      // Ensure scheduledFor is a string
      const appointmentData = {
        ...data,
        scheduledFor: data.scheduledFor instanceof Date ? formatISO(data.scheduledFor) : data.scheduledFor
      };
      return providerClient.createAppointment(appointmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment created successfully');
      setIsDialogOpen(false);
      resetNewAppointmentForm();
    },
    onError: (error: any) => {
      handleError(error);
    }
  });

  // Fetch patients for autocomplete
  const searchPatients = async (query: string) => {
    if (query.length < 2) return;
    
    setIsLoadingPatients(true);
    setPatientSearchError(null);
    
    try {
      const response = await providerClient.searchPatients({ 
        query
      });
      
      if (response.data?.items) {
        // Map the response to the format expected by the component
        const mappedPatients = response.data.items.map((patient: User) => ({
          id: patient.id,
          name: patient.name || patient.id,
        }));
        setPatientOptions(mappedPatients);
      }
    } catch (error) {
      console.error('Failed to search patients:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to search for patients';
      
      setPatientSearchError(errorMessage);
      toast.error(errorMessage);
      setPatientOptions([]);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const generateTimeSlots = (date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = WORKING_HOURS.start;
    const endHour = WORKING_HOURS.end;
    const slotDuration = WORKING_HOURS.slotDuration;

    const appointments = appointmentsResponse?.data?.data || [];

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = new Date(date);
        time.setHours(hour, minute, 0, 0);
        
        const appointment = appointments.find(
          (apt: Appointment) => {
            const aptDate = new Date(apt.scheduledFor);
            return isSameDay(aptDate, date) &&
                   aptDate.getHours() === hour &&
                   aptDate.getMinutes() === minute;
          }
        );

        slots.push({ time, appointment });
      }
    }

    return slots;
  };

  const handleSlotClick = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setIsDialogOpen(true);
    
    if (slot.appointment && slot.appointment.notes) {
      setFollowUpNotes(slot.appointment.notes);
    } else {
      setFollowUpNotes('');
    }
    
    // Reset new appointment form
    resetNewAppointmentForm();
  };

  const resetNewAppointmentForm = () => {
    setNewAppointment({
      patientId: '',
      reason: '',
      notes: '',
      type: 'consultation'
    });
    setFormErrors({});
  };

  const handleStatusUpdate = (appointmentId: string, newStatus: AppointmentStatus) => {
    updateAppointment.mutate({
      id: appointmentId,
      updates: { status: newStatus }
    });
  };
  
  const handleFollowUpComplete = (appointmentId: string) => {
    updateAppointment.mutate({
      id: appointmentId,
      updates: {
        status: AppointmentStatus.COMPLETED,
        notes: followUpNotes
      }
    });
  };
  
  const validateAppointmentForm = () => {
    const errors: Record<string, string> = {};
    
    if (!newAppointment.patientId) {
      errors.patientId = 'Patient is required';
    }
    
    if (!newAppointment.reason) {
      errors.reason = 'Reason is required';
    }
    
    if (!newAppointment.type) {
      errors.type = 'Appointment type is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleCreateAppointment = () => {
    if (!selectedSlot || !validateAppointmentForm()) return;
    
    createAppointment.mutate({
      patientId: newAppointment.patientId,
      providerId: providerId,
      scheduledFor: formatISO(selectedSlot.time),
      reason: newAppointment.reason,
      notes: newAppointment.notes,
      type: newAppointment.type,
      status: AppointmentStatus.SCHEDULED
    });
  };

  const renderTimeSlot = (slot: TimeSlot) => {
    const { time, appointment } = slot;

    return (
      <Paper
        key={time.toISOString()}
        elevation={1}
        sx={{
          p: 1,
          mb: 1,
          cursor: 'pointer',
          bgcolor: appointment ? getAppointmentColor(appointment.status) : 'background.paper',
          '&:hover': {
            bgcolor: 'action.hover'
          }
        }}
        onClick={() => handleSlotClick(slot)}
      >
        <Typography variant="body2">
          {format(time, 'HH:mm')}
        </Typography>
        {appointment && (
          <Box mt={1}>
            <Typography variant="subtitle2" noWrap>
              {appointment.patientName || 'Patient'}
            </Typography>
            <Chip
              size="small"
              label={appointment.status}
              color={getStatusColor(appointment.status)}
            />
          </Box>
        )}
      </Paper>
    );
  };
  
  const getAppointmentColor = (status?: string) => {
    if (!status) return 'background.paper';
    
    switch (status) {
      case AppointmentStatus.COMPLETED:
        return 'success.light';
      case AppointmentStatus.CANCELLED:
        return 'error.light';
      case AppointmentStatus.NO_SHOW:
        return 'warning.light';
      default:
        return 'primary.light';
    }
  };
  
  const getStatusColor = (status?: string): 'success' | 'error' | 'warning' | 'primary' => {
    if (!status) return 'primary';
    
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

  const renderAppointmentDialog = () => {
    if (!selectedSlot) return null;

    const { appointment } = selectedSlot;
    const isCreating = !appointment;
    const isCompleted = appointment?.status === AppointmentStatus.COMPLETED;

    return (
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="appointment-dialog-title"
        disableEnforceFocus
      >
        <DialogTitle id="appointment-dialog-title">
          {isCreating ? 'New Appointment' : 'Appointment Details'}
        </DialogTitle>
        <DialogContent>
          <Box py={2}>
            {isCreating ? (
              // New appointment form
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Autocomplete
                    id="patient-select"
                    options={patientOptions}
                    getOptionLabel={(option) => option.name}
                    loading={isLoadingPatients}
                    onInputChange={(_, value) => searchPatients(value)}
                    onChange={(_, newValue) => {
                      setNewAppointment({
                        ...newAppointment,
                        patientId: newValue?.id || ''
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Patient"
                        variant="outlined"
                        error={!!formErrors.patientId}
                        helperText={formErrors.patientId}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isLoadingPatients ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Appointment Time"
                    value={format(selectedSlot.time, 'PPpp')}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth error={!!formErrors.type}>
                    <InputLabel>Appointment Type</InputLabel>
                    <Select
                      value={newAppointment.type}
                      onChange={(e) => setNewAppointment({
                        ...newAppointment,
                        type: e.target.value
                      })}
                      label="Appointment Type"
                    >
                      <MenuItem value="consultation">Consultation</MenuItem>
                      <MenuItem value="followup">Follow-up</MenuItem>
                      <MenuItem value="checkup">Check-up</MenuItem>
                      <MenuItem value="imaging">Imaging</MenuItem>
                      <MenuItem value="procedure">Procedure</MenuItem>
                    </Select>
                    {formErrors.type && <FormHelperText>{formErrors.type}</FormHelperText>}
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Reason"
                    value={newAppointment.reason}
                    onChange={(e) => setNewAppointment({
                      ...newAppointment,
                      reason: e.target.value
                    })}
                    error={!!formErrors.reason}
                    helperText={formErrors.reason}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment({
                      ...newAppointment,
                      notes: e.target.value
                    })}
                    multiline
                    rows={4}
                  />
                </Grid>
              </Grid>
            ) : (
              // Existing appointment details
              <>
                <Typography variant="subtitle1">
                  Patient: {appointment.patientName || 'Unknown'}
                </Typography>
                <Typography variant="body2" mt={2}>
                  Time: {format(new Date(appointment.scheduledFor), 'PPpp')}
                </Typography>
                <Typography variant="body2" mt={1}>
                  Type: {appointment.type}
                </Typography>
                <Typography variant="body2" mt={1}>
                  Reason: {appointment.reason}
                </Typography>
                
                <Box mt={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Appointment Status
                  </Typography>
                  <FormControl fullWidth margin="normal">
                    <Select
                      value={appointment.status}
                      onChange={(e) => handleStatusUpdate(appointment.id, e.target.value as AppointmentStatus)}
                      disabled={updateAppointment.isPending}
                    >
                      {Object.values(AppointmentStatus).map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.replace(/_/g, ' ')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                <Box mt={3}>
                  <Typography variant="subtitle2" gutterBottom>
                    Follow-up Notes
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Enter follow-up notes, observations, and next steps..."
                    disabled={isCompleted || updateAppointment.isPending}
                  />
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          {isCreating ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateAppointment}
              disabled={createAppointment.isPending}
            >
              {createAppointment.isPending ? 'Creating...' : 'Create Appointment'}
            </Button>
          ) : (
            !isCompleted && (
              <>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<SaveIcon />}
                  onClick={() => handleFollowUpComplete(appointment.id)}
                  disabled={updateAppointment.isPending}
                >
                  {updateAppointment.isPending ? 'Saving...' : 'Save Notes'}
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    setIsDialogOpen(false);
                    window.location.href = `/provider/appointments/complete/${appointment.id}`;
                  }}
                >
                  Complete & Document
                </Button>
              </>
            )
          )}
        </DialogActions>
      </Dialog>
    );
  };

  const renderMonthView = () => {
    const startDate = startOfWeek(selectedDate);
    const dates = Array.from({ length: 28 }, (_, i) => addDays(startDate, i));

    return (
      <Grid container spacing={1}>
        {dates.map((date) => (
          <Grid item xs={12 / 7} key={date.toISOString()}>
            <Paper
              elevation={1}
              sx={{
                p: 1,
                height: '100%',
                bgcolor: isSameDay(date, new Date()) ? 'primary.light' : 'background.paper',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
              onClick={() => {
                setSelectedDate(date);
                setView('day');
              }}
            >
              <Typography variant="subtitle2" align="center">
                {format(date, 'EEE')}
              </Typography>
              <Typography variant="h6" align="center">
                {format(date, 'd')}
              </Typography>
              <Box>
                {appointmentsResponse?.data?.data && appointmentsResponse.data.data.filter((apt: Appointment) => 
                  isSameDay(new Date(apt.scheduledFor), date)
                ).slice(0, 2).map((apt: Appointment) => (
                  <Typography key={apt.id} variant="caption" noWrap>
                    {format(new Date(apt.scheduledFor), 'HH:mm')} - {apt.patientName}
                  </Typography>
                ))}
                {appointmentsResponse?.data?.data && appointmentsResponse.data.data.filter((apt: Appointment) => 
                  isSameDay(new Date(apt.scheduledFor), date)
                ).length > 2 && (
                  <Typography variant="caption" color="text.secondary">
                    + {appointmentsResponse?.data?.data && appointmentsResponse.data.data.filter((apt: Appointment) => 
                      isSameDay(new Date(apt.scheduledFor), date)
                    ).length - 2} more
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  if (isLoading) {
    return <LoadingState message="Loading appointments..." fullScreen />;
  }
  
  if (appointmentsError && !appointmentsResponse) {
    return (
      <LoadingState 
        error={appointmentsError instanceof Error ? appointmentsError.message : 'Failed to load appointments'} 
        onRetry={refetchAppointments}
        fullScreen
      />
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" component="h2">
          Appointments Calendar
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* View toggle buttons */}
          <Box sx={{ 
            border: 1, 
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex' 
          }}>
            <IconButton 
              onClick={() => setView('day')} 
              color={view === 'day' ? 'primary' : 'default'}
            >
              <CalendarViewDayIcon />
            </IconButton>
            <IconButton 
              onClick={() => setView('week')} 
              color={view === 'week' ? 'primary' : 'default'}
            >
              <CalendarViewWeekIcon />
            </IconButton>
            <IconButton 
              onClick={() => setView('month')} 
              color={view === 'month' ? 'primary' : 'default'}
            >
              <CalendarViewMonthIcon />
            </IconButton>
          </Box>
          
          {/* Navigation controls */}
          <Box display="flex" alignItems="center">
            <IconButton onClick={() => {
              if (view === 'day') setSelectedDate(addDays(selectedDate, -1));
              else if (view === 'week') setSelectedDate(subWeeks(selectedDate, 1));
              else setSelectedDate(subWeeks(selectedDate, 4));
            }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography sx={{ minWidth: 120, textAlign: 'center' }}>
              {view === 'day' 
                ? format(selectedDate, 'MMM d, yyyy')
                : view === 'week'
                  ? `Week of ${format(dateRange.start, 'MMM d')}`
                  : `${format(dateRange.start, 'MMM yyyy')}`
              }
            </Typography>
            <IconButton onClick={() => {
              if (view === 'day') setSelectedDate(addDays(selectedDate, 1));
              else if (view === 'week') setSelectedDate(addWeeks(selectedDate, 1));
              else setSelectedDate(addWeeks(selectedDate, 4));
            }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
          
          {/* Action buttons */}
          <Button 
            variant="outlined"
            onClick={() => window.location.href = '/provider/availability'}
          >
            Manage Availability
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {view === 'day' ? (
          // Day view - single column
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              {format(selectedDate, 'EEEE, MMM d')}
            </Typography>
            {generateTimeSlots(selectedDate).map(slot => renderTimeSlot(slot))}
          </Grid>
        ) : view === 'week' ? (
          // Week view - 7 columns
          [...Array(7)].map((_, index) => {
            const date = addDays(dateRange.start, index);
            const slots = generateTimeSlots(date);

            return (
              <Grid item xs={12} sm={6} md={12 / 7} key={date.toISOString()}>
                <Typography variant="subtitle1" gutterBottom>
                  {format(date, 'EEE, MMM d')}
                </Typography>
                {slots.map(slot => renderTimeSlot(slot))}
              </Grid>
            );
          })
        ) : (
          renderMonthView()
        )}
      </Grid>

      {patientSearchError && (
        <Alert 
          severity="error" 
          onClose={() => setPatientSearchError(null)}
          sx={{ mb: 2 }}
        >
          {patientSearchError}
        </Alert>
      )}

      {renderAppointmentDialog()}
    </Box>
  );
}; 