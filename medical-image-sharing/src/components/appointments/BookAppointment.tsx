import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel, 
  Dialog
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfDay } from 'date-fns';
import { patientClient } from '@/lib/api/patientClient';
import { ProviderSpecialty, Role } from '@prisma/client';
import { User, CreateAppointmentRequest, PaginatedResponse, Appointment } from '@/lib/api/types';
import { toast } from 'react-hot-toast';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookAppointmentProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ExtendedUser extends User {
  specialty?: string;
  avatar?: string;
}

const steps = ['Select Provider', 'Choose Date', 'Select Time', 'Confirm'];

export const BookAppointment: React.FC<BookAppointmentProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<ExtendedUser | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [specialty, setSpecialty] = useState<ProviderSpecialty | ''>('');
  const queryClient = useQueryClient();

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => patientClient.getUserProfile()
  });

  // Fetch providers
  const { data: providersResponse, isLoading: loadingProviders } = useQuery({
    queryKey: ['providers', specialty],
    queryFn: async () => {
      const response = await patientClient.getProviders();
      return { data: response.data };
    }
  });

  // Fetch provider availability
  const { data: availabilityResponse, isLoading: loadingSlots } = useQuery({
    queryKey: ['availability', selectedProvider?.id, selectedDate],
    queryFn: async () => {
      if (!selectedProvider?.id || !selectedDate) return { data: { availableSlots: [] } };
      const response = await patientClient.getAppointment(selectedProvider.id);
      // Transform booked slots into available slots
      const appointments = response.data;
      const bookedSlots = appointments.map((apt: Appointment) => {
        return format(new Date(apt.scheduledFor), 'HH:mm');
      });
      const allSlots = generateTimeSlots();
      return {
        data: {
          availableSlots: allSlots.map(time => ({
            time,
            available: !bookedSlots.includes(time)
          }))
        }
      };
    },
    enabled: !!selectedProvider && !!selectedDate
  });

  // Book appointment mutation
  const bookAppointment = useMutation({
    mutationFn: (data: CreateAppointmentRequest) => {
      const appointmentDate = new Date(data.scheduledFor);
      return patientClient.createAppointment({
        providerId: data.providerId,
        datetime: appointmentDate.toISOString(),
        notes: data.notes,
        type: 'CONSULTATION'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment booked successfully');
      onSuccess?.();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to book appointment');
    }
  });

  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      if (!selectedProvider?.id || !selectedDate || !selectedTime || !currentUser?.data.id) return;

      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      appointmentDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      bookAppointment.mutate({
        providerId: selectedProvider.id,
        patientId: currentUser.data.id,
        scheduledFor: appointmentDateTime,
        reason: 'Medical consultation',
        notes: notes || undefined
      });
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const isNextDisabled = () => {
    switch (activeStep) {
      case 0:
        return !selectedProvider;
      case 1:
        return !selectedDate;
      case 2:
        return !selectedTime;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Specialty</InputLabel>
              <Select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value as ProviderSpecialty | '')}
                label="Specialty"
              >
                <MenuItem value="">All Specialties</MenuItem>
                {Object.values(ProviderSpecialty).map((spec) => (
                  <MenuItem key={spec} value={spec}>
                    {spec.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {loadingProviders ? (
              <Box display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2} mt={2}>
                {providersResponse?.data.map((provider: ExtendedUser) => (
                  <Grid item xs={12} sm={6} md={4} key={provider.id}>
                    <Paper
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: selectedProvider?.id === provider.id ? '2px solid primary.main' : 'none',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onClick={() => setSelectedProvider(provider)}
                    >
                      <Box display="flex" alignItems="center" gap={2} width="100%">
                        {provider.avatar && (
                          <Box
                            component="img"
                            src={provider.avatar}
                            alt={provider.name}
                            sx={{ width: { xs: 40, sm: 50 }, height: { xs: 40, sm: 50 }, borderRadius: '50%' }}
                          />
                        )}
                        <Box flex={1}>
                          <Typography variant="h6" sx={{ fontSize: { xs: '0.9rem', sm: '1.25rem' } }}>{provider.name}</Typography>
                          <Typography color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{provider.specialty}</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        );

      case 1:
        return (
          <Box mt={2}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue as Date | null)}
              disablePast
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: "normal",
                  sx: { width: '100%' }
                }
              }}
            />
          </Box>
        );

      case 2:
        return (
          <Box mt={2}>
            {loadingSlots ? (
              <Box display="flex" justifyContent="center">
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={1}>
                {availabilityResponse?.data.availableSlots.map((slot: TimeSlot) => (
                  <Grid item xs={4} sm={3} md={2} key={slot.time}>
                    <Button
                      variant={selectedTime === slot.time ? 'contained' : 'outlined'}
                      fullWidth
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      sx={{ 
                        py: { xs: 1, sm: 1.5 }, 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        minWidth: { xs: '60px', sm: '80px' }
                      }}
                    >
                      {slot.time}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );

      case 3:
        return (
          <Box mt={2}>
            <Typography variant="h6" gutterBottom>
              Appointment Summary
            </Typography>
            <Typography>
              <strong>Provider:</strong> {selectedProvider?.name}
            </Typography>
            <Typography>
              <strong>Date:</strong> {selectedDate?.toLocaleDateString()}
            </Typography>
            <Typography>
              <strong>Time:</strong> {selectedTime}
            </Typography>
            <TextField
              label="Notes"
              multiline
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              margin="normal"
            />
          </Box>
        );
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          width: '100%',
          maxWidth: { xs: '95%', sm: '600px', md: '900px' },
          margin: { xs: '10px', sm: '24px' }
        }
      }}
    >
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Stepper 
          activeStep={activeStep} 
          sx={{ 
            mb: { xs: 2, sm: 4 },
            '& .MuiStepLabel-label': {
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }
          }}
          alternativeLabel={true}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStep()}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1, flexWrap: 'wrap' }}>
          {activeStep > 0 && (
            <Button onClick={handleBack} size="medium">
              Back
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isNextDisabled()}
            size="medium"
          >
            {activeStep === steps.length - 1 ? 'Book Appointment' : 'Next'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}; 