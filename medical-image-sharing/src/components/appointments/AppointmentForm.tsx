'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select as MuiSelect,
  TextField,
  Typography,
  Alert,
  Snackbar, 
  CircularProgress,
  SelectChangeEvent,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { patientClient, providerClient, adminClient } from '@/lib/api';
import { useUser, useAuth } from '@clerk/nextjs';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';
import { AppointmentStatus } from '@prisma/client';
import { toast } from 'react-hot-toast';
import { ApiResponse, PaginatedResponse, User, Appointment, CreateAppointmentRequest, UpdateAppointmentRequest } from '@/lib/api/types';
import { useProviders } from '@/hooks/useProviders';
import { usePatients } from '@/hooks/usePatients';
import { useRouter } from 'next/navigation';

interface SessionUser {
  id: string;
  email: string;
  role: string;
}

interface Provider {
  id: string;
  name: string;
  specialty?: string;
}

interface Patient {
  id: string;
  name: string;
}

interface AppointmentFormProps {
  onSuccess?: (appointmentId: string) => void;
  editMode?: boolean;
  initialData?: {
    id?: string;
    providerId?: string;
    patientId?: string;
    reason?: string;
    notes?: string;
    type?: string;
    status?: string;
    scheduledFor?: string;
  };
  patientId?: string;
  providerId?: string;
}

interface FormData {
  providerId: string;
  patientId: string;
  date: Date | null;
  time: Date | null;
  reason: string;
  notes: string;
  type: string;
  status: AppointmentStatus;
}

export default function AppointmentForm({
  onSuccess,
  editMode = false,
  initialData,
  patientId,
  providerId,
}: AppointmentFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const userRole = user?.publicMetadata?.role as string || 'PATIENT';
  
  // Form data state
  const [formData, setFormData] = useState<FormData>({
    providerId: initialData?.providerId || providerId || '',
    patientId: initialData?.patientId || patientId || '',
    date: initialData?.scheduledFor ? new Date(initialData.scheduledFor) : new Date(),
    time: initialData?.scheduledFor ? new Date(initialData.scheduledFor) : new Date(),
    reason: initialData?.reason || '',
    notes: initialData?.notes || '',
    type: initialData?.type || 'checkup',
    status: (initialData?.status as AppointmentStatus) || AppointmentStatus.SCHEDULED,
  });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Provider and patient options for select inputs
  const [providersOptions, setProvidersOptions] = useState<Provider[]>([]);
  const [patientsOptions, setPatientsOptions] = useState<Patient[]>([]);
  
  // Hooks for fetching providers and patients
  const { providers, loading: loadingProviders } = useProviders();
  const { patients, loading: loadingPatients } = usePatients();
  
  // Remove these states since we get them from the hooks
  const [fetchingProviders, setFetchingProviders] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(false);
  
  // Remove the providers and patients fetch useEffects since we're using hooks now
  
  // Replace the existing setProviders and setPatients arrays with the ones from hooks
  useEffect(() => {
    if (providers.length > 0 && !loadingProviders) {
      setProvidersOptions(providers);
    }
  }, [providers, loadingProviders]);
  
  useEffect(() => {
    if (patients.length > 0 && !loadingPatients) {
      setPatientsOptions(patients);
    }
  }, [patients, loadingPatients]);
  
  // Form validation
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.providerId) {
      newErrors.providerId = 'Provider is required';
    }
    
    if (!formData.patientId) {
      newErrors.patientId = 'Patient is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.time) {
      newErrors.time = 'Time is required';
    }
    
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason for visit is required';
    }
    
    if (!formData.type) {
      newErrors.type = 'Appointment type is required';
    }
    
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Combine date and time for scheduledFor
      const dateObj = formData.date || new Date();
      const timeObj = formData.time || new Date();
      
      const hours = timeObj.getHours();
      const minutes = timeObj.getMinutes();
      
      const scheduledFor = new Date(dateObj);
      scheduledFor.setHours(hours);
      scheduledFor.setMinutes(minutes);
      
      // Format for API
      const formattedDate = format(scheduledFor, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
      
      const appointmentData = {
        patientId: formData.patientId,
        scheduledFor: formattedDate,
        reason: formData.reason,
        notes: formData.notes,
        type: formData.type,
      };
      
      let response: ApiResponse<Appointment>;
      
      if (editMode && initialData?.id) {
        // Update existing appointment
        const updateData: UpdateAppointmentRequest = {
          scheduledFor: formattedDate,
          reason: formData.reason,
          notes: formData.notes,
          type: formData.type,
          status: formData.status,
        };
        response = await providerClient.updateAppointment(initialData.id, updateData);
      } else {
        // Create new appointment
        if (userRole === 'PATIENT') {
          response = await patientClient.createAppointment({
            providerId: formData.providerId,
            datetime: formattedDate,
            notes: formData.notes,
            type: formData.type
          });
        } else if (userRole === 'PROVIDER') {
          response = await providerClient.createAppointment({
            patientId: formData.patientId,
            scheduledFor: formattedDate,
            reason: formData.reason,
            notes: formData.notes,
            type: formData.type
          });
        } else {
          // Admin uses provider client since adminClient doesn't have createAppointment
          response = await providerClient.createAppointment({
            patientId: formData.patientId,
            scheduledFor: formattedDate,
            reason: formData.reason,
            notes: formData.notes,
            type: formData.type
          });
        }
      }
      
      if (response.status === 'success') {
        toast.success(editMode ? 'Appointment updated successfully' : 'Appointment created successfully');
        onSuccess?.(response.data.id);
      } else {
        throw new Error(response.error?.message || 'Failed to save appointment');
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save appointment. Please try again.';
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Input change handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'status' ? value as AppointmentStatus : value,
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Date change handler
  const handleDateChange = (date: unknown) => {
    setFormData(prev => ({
      ...prev,
      date: date as Date | null,
    }));
    
    // Clear validation error for this field
    if (validationErrors.date) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.date;
        return newErrors;
      });
    }
  };
  
  // Time change handler
  const handleTimeChange = (time: unknown) => {
    setFormData(prev => ({
      ...prev,
      time: time as Date | null,
    }));
    
    // Clear validation error for this field
    if (validationErrors.time) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.time;
        return newErrors;
      });
    }
  };
  
  // Snackbar close handler
  const handleCloseSnackbar = () => {
    setSuccess(false);
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {editMode ? 'Edit Appointment' : 'Book an Appointment'}
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={2}>
              {/* Provider Selection */}
              {(userRole === 'PATIENT' || (userRole === 'ADMIN' && !providerId)) && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!validationErrors.providerId}>
                    <InputLabel id="provider-label">Provider</InputLabel>
                    <MuiSelect
                      labelId="provider-label"
                      id="providerId"
                      name="providerId"
                      value={formData.providerId}
                      label="Provider"
                      onChange={handleChange}
                      disabled={loading || !!providerId}
                    >
                      {loadingProviders ? (
                        <MenuItem value="">
                          <CircularProgress size={20} /> Loading...
                        </MenuItem>
                      ) : (
                        providers.map(provider => (
                          <MenuItem key={provider.id} value={provider.id}>
                            {provider.name} {provider.specialty ? `(${provider.specialty})` : ''}
                          </MenuItem>
                        ))
                      )}
                    </MuiSelect>
                    {validationErrors.providerId && (
                      <FormHelperText>{validationErrors.providerId}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              )}
              
              {/* Patient Selection */}
              {(userRole === 'PROVIDER' || (userRole === 'ADMIN' && !patientId)) && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!validationErrors.patientId}>
                    <InputLabel id="patient-label">Patient</InputLabel>
                    <MuiSelect
                      labelId="patient-label"
                      id="patientId"
                      name="patientId"
                      value={formData.patientId}
                      label="Patient"
                      onChange={handleChange}
                      disabled={loading || !!patientId}
                    >
                      {loadingPatients ? (
                        <MenuItem value="">
                          <CircularProgress size={20} /> Loading...
                        </MenuItem>
                      ) : (
                        patients.map(patient => (
                          <MenuItem key={patient.id} value={patient.id}>
                            {patient.name}
                          </MenuItem>
                        ))
                      )}
                    </MuiSelect>
                    {validationErrors.patientId && (
                      <FormHelperText>{validationErrors.patientId}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              )}
              
              {/* Appointment Type */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!validationErrors.type}>
                  <InputLabel id="type-label">Appointment Type</InputLabel>
                  <MuiSelect
                    labelId="type-label"
                    id="type"
                    name="type"
                    value={formData.type}
                    label="Appointment Type"
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <MenuItem value="checkup">Check-up</MenuItem>
                    <MenuItem value="consultation">Consultation</MenuItem>
                    <MenuItem value="followup">Follow-up</MenuItem>
                    <MenuItem value="imaging">Imaging</MenuItem>
                    <MenuItem value="procedure">Procedure</MenuItem>
                  </MuiSelect>
                  {validationErrors.type && (
                    <FormHelperText>{validationErrors.type}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              {/* Status - Only show in edit mode */}
              {editMode && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!validationErrors.status}>
                    <InputLabel id="status-label">Status</InputLabel>
                    <MuiSelect
                      labelId="status-label"
                      id="status"
                      name="status"
                      value={formData.status}
                      label="Status"
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <MenuItem value={AppointmentStatus.SCHEDULED}>Scheduled</MenuItem>
                      <MenuItem value={AppointmentStatus.COMPLETED}>Completed</MenuItem>
                      <MenuItem value={AppointmentStatus.CANCELLED}>Cancelled</MenuItem>
                      <MenuItem value={AppointmentStatus.NO_SHOW}>No Show</MenuItem>
                    </MuiSelect>
                    {validationErrors.status && (
                      <FormHelperText>{validationErrors.status}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              )}
              
              {/* Date Picker */}
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Appointment Date"
                  value={formData.date}
                  onChange={(date: unknown) => handleDateChange(date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!validationErrors.date,
                      helperText: validationErrors.date,
                      disabled: loading
                    }
                  }}
                />
              </Grid>
              
              {/* Time Picker */}
              <Grid item xs={12} md={6}>
                <TimePicker
                  label="Appointment Time"
                  value={formData.time}
                  onChange={(time: unknown) => handleTimeChange(time)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!validationErrors.time,
                      helperText: validationErrors.time,
                      disabled: loading
                    }
                  }}
                />
              </Grid>
              
              {/* Reason for Visit */}
              <Grid item xs={12}>
                <TextField
                  id="reason"
                  name="reason"
                  label="Reason for Visit"
                  value={formData.reason}
                  onChange={handleChange}
                  fullWidth
                  required
                  error={!!validationErrors.reason}
                  helperText={validationErrors.reason}
                  disabled={loading}
                />
              </Grid>
              
              {/* Additional Notes */}
              <Grid item xs={12}>
                <TextField
                  id="notes"
                  name="notes"
                  label="Additional Notes"
                  value={formData.notes}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={3}
                  disabled={loading}
                />
              </Grid>
              
              {/* Submit Button */}
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      {editMode ? 'Updating...' : 'Book Appointment'}
                    </>
                  ) : (
                    editMode ? 'Update Appointment' : 'Book Appointment'
                  )}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
      
      {/* Success Notification */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={editMode ? "Appointment updated successfully" : "Appointment booked successfully"}
      />
    </LocalizationProvider>
  );
} 