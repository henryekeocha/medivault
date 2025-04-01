'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { format } from 'date-fns';
import { providerClient } from '@/lib/api/providerClient';
import { AppointmentStatus } from '@prisma/client';
import { Appointment, UpdateAppointmentRequest } from '@/lib/api/types';
import { toast } from 'react-hot-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

// This would typically be replaced with a real rich text editor
// like React Quill, TinyMCE, or Draft.js
const SimpleRichTextArea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  rows?: number;
}> = ({ value, onChange, placeholder, label, disabled, rows = 10 }) => {
  return (
    <TextField
      fullWidth
      multiline
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      sx={{ mt: 2 }}
    />
  );
};

// Mock data for the next appointment suggestion
const suggestedTimeSlots = [
  { date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), time: '10:00 AM' },
  { date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), time: '2:30 PM' },
  { date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), time: '9:00 AM' },
  { date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), time: '4:00 PM' },
];

export default function CompleteAppointmentPage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params?.id as string;
  const queryClient = useQueryClient();

  // Component state
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [appointmentData, setAppointmentData] = useState<Appointment | null>(null);
  
  // Form state
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [needsFollowUp, setNeedsFollowUp] = useState<boolean>(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null);
  const [suggestedTimeSlots, setSuggestedTimeSlots] = useState<{ date: Date, time: string }[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  // Fetch appointment data
  const { data: appointment, isLoading, error } = useQuery<Appointment>({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      if (!appointmentId) throw new Error('No appointment ID provided');
      // Get all appointments and find the one we want
      // This is a workaround since we don't have a direct getAppointment method
      const response = await providerClient.getAppointments({
        startDate: undefined,
        endDate: undefined
      });
      const foundAppointment = response.data?.data?.find(apt => apt.id === appointmentId);
      if (!foundAppointment) throw new Error('Failed to fetch appointment');
      return foundAppointment;
    },
    enabled: !!appointmentId,
  });

  // Update appointment mutation
  const updateAppointment = useMutation({
    mutationFn: (data: UpdateAppointmentRequest) =>
      providerClient.updateAppointment(appointmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSaveSuccess(true);
      setTimeout(() => {
        router.push('/provider/appointments');
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to complete appointment');
    },
  });

  // Initialize form with appointment data
  useEffect(() => {
    if (appointment) {
      setAppointmentData(appointment);
      
      // Pre-fill form if there are existing notes
      if (appointment.notes) {
        setFollowUpNotes(appointment.notes);
      }
      
      setLoading(false);
    }
  }, [appointment]);

  // Load suggested time slots
  useEffect(() => {
    if (needsFollowUp && appointmentData?.providerId) {
      fetchAvailableTimeSlots();
    }
  }, [needsFollowUp, appointmentData?.providerId]);

  const fetchAvailableTimeSlots = async () => {
    if (!appointmentData?.providerId) return;
    
    try {
      setLoadingTimeSlots(true);
      const response = await providerClient.getAvailabilityBlocks();
      
      if (response.status === 'success' && response.data) {
        // Transform the API response to our expected format
        const timeSlots = response.data.map((slot: any) => ({
          date: new Date(slot.date),
          time: slot.time
        }));
        
        setSuggestedTimeSlots(timeSlots);
      } else {
        console.error('Failed to fetch available time slots');
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const handleSubmit = (status: AppointmentStatus) => {
    // Combine all notes into a structured format
    const formattedNotes = `
FOLLOW-UP NOTES:
${followUpNotes}

DIAGNOSIS:
${diagnosis}

TREATMENT PLAN:
${treatmentPlan}

NEXT STEPS:
${nextSteps}

FOLLOW-UP REQUIRED: ${needsFollowUp ? 'Yes' : 'No'}
${needsFollowUp && selectedTimeSlot !== null ? 
  `SUGGESTED FOLLOW-UP: ${format(suggestedTimeSlots[selectedTimeSlot].date, 'PP')} at ${suggestedTimeSlots[selectedTimeSlot].time}` 
  : ''}
`;

    updateAppointment.mutate({
      status,
      notes: formattedNotes.trim(),
    });
  };

  if (isLoading || loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !appointmentData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading appointment details. Please try again.
        </Alert>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/provider/appointments')}
        >
          Back to Appointments
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Snackbar
        open={saveSuccess}
        autoHideDuration={2000}
        message="Appointment completed successfully!"
      />
      
      <Box mb={4}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link href="/provider/dashboard" passHref>
            <Typography color="inherit" sx={{ cursor: 'pointer' }}>Dashboard</Typography>
          </Link>
          <Link href="/provider/appointments" passHref>
            <Typography color="inherit" sx={{ cursor: 'pointer' }}>Appointments</Typography>
          </Link>
          <Typography color="text.primary">Complete Appointment</Typography>
        </Breadcrumbs>
        
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <IconButton 
            edge="start" 
            aria-label="back"
            onClick={() => router.push('/provider/appointments')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">
            Complete Appointment
          </Typography>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Appointment details */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Appointment Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Patient</Typography>
                <Typography variant="body1" gutterBottom>{appointmentData.patientName || 'Unknown'}</Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Reason</Typography>
                <Typography variant="body1" gutterBottom>{appointmentData.reason}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Date & Time</Typography>
                <Typography variant="body1" gutterBottom>
                  {format(new Date(appointmentData.scheduledFor), 'PPp')}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Status</Typography>
                <Chip 
                  label={appointmentData.status} 
                  color={
                    appointmentData.status === AppointmentStatus.COMPLETED ? 'success' :
                    appointmentData.status === AppointmentStatus.CANCELLED ? 'error' :
                    appointmentData.status === AppointmentStatus.NO_SHOW ? 'warning' :
                    'primary'
                  }
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Documentation form */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Appointment Documentation
            </Typography>
            
            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                Follow-up Notes
              </Typography>
              <SimpleRichTextArea
                value={followUpNotes}
                onChange={setFollowUpNotes}
                placeholder="Enter notes from the appointment..."
                rows={6}
              />
            </Box>
            
            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                Diagnosis
              </Typography>
              <SimpleRichTextArea
                value={diagnosis}
                onChange={setDiagnosis}
                placeholder="Enter diagnosis information..."
                rows={4}
              />
            </Box>
            
            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                Treatment Plan
              </Typography>
              <SimpleRichTextArea
                value={treatmentPlan}
                onChange={setTreatmentPlan}
                placeholder="Enter treatment plan details..."
                rows={4}
              />
            </Box>
            
            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                Next Steps
              </Typography>
              <SimpleRichTextArea
                value={nextSteps}
                onChange={setNextSteps}
                placeholder="Enter recommended next steps for the patient..."
                rows={3}
              />
            </Box>
            
            <Box mt={4}>
              <Typography variant="subtitle1" gutterBottom>
                Follow-up Appointment
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="follow-up-label">Is a follow-up appointment needed?</InputLabel>
                    <Select
                      labelId="follow-up-label"
                      value={needsFollowUp ? 'yes' : 'no'}
                      label="Is a follow-up appointment needed?"
                      onChange={(e) => setNeedsFollowUp(e.target.value === 'yes')}
                    >
                      <MenuItem value="yes">Yes</MenuItem>
                      <MenuItem value="no">No</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {needsFollowUp && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Suggested time slots
                    </Typography>
                    <Grid container spacing={2}>
                      {suggestedTimeSlots.map((slot, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                          <Card 
                            variant={selectedTimeSlot === index ? "elevation" : "outlined"}
                            sx={{ 
                              cursor: 'pointer',
                              bgcolor: selectedTimeSlot === index ? 'primary.light' : 'background.paper',
                            }}
                            onClick={() => setSelectedTimeSlot(index)}
                          >
                            <CardContent>
                              <Typography variant="subtitle2">
                                {format(slot.date, 'EEEE, MMMM d, yyyy')}
                              </Typography>
                              <Typography variant="h6">
                                {slot.time}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                    <Box mt={2}>
                      <Typography variant="body2">
                        This will suggest a follow-up time to the patient, but they will need to confirm.
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
            
            <Divider sx={{ my: 4 }} />
            
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button 
                startIcon={<CancelIcon />}
                onClick={() => router.push('/provider/appointments')}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ScheduleIcon />}
                onClick={() => handleSubmit(AppointmentStatus.SCHEDULED)}
                disabled={updateAppointment.isPending}
              >
                Save as Draft
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleSubmit(AppointmentStatus.COMPLETED)}
                disabled={updateAppointment.isPending}
              >
                {updateAppointment.isPending ? 'Saving...' : 'Complete Appointment'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 