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
  Select,
  TextField,
  Typography,
  Alert,
  Snackbar, 
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { ApiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';
import { AppointmentStatus } from '@prisma/client';

interface Provider {
  id: string;
  name: string;
  specialty: string;
}

interface Patient {
  id: string;
  name: string;
}

export interface AppointmentFormProps {
  onSuccess?: (appointmentId: string) => void;
  editMode?: boolean;
  initialData?: {
    id?: string;
    providerId?: string;
    patientId?: string;
    scheduledFor?: Date | string;
    reason?: string;
    notes?: string;
    type?: string;
    status?: string;
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
  const { user } = useAuth();
  
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
  
  // Providers and patients list
  const [providers, setProviders] = useState<Provider[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fetchingProviders, setFetchingProviders] = useState(false);
  const [fetchingPatients, setFetchingPatients] = useState(false);
  
  // Fetch providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      if (user?.role === 'PATIENT' || (user?.role === 'ADMIN' && !providerId)) {
        try {
          setFetchingProviders(true);
          const apiClient = ApiClient.getInstance();
          const response = await apiClient.getProviders();
          
          if (response.data?.data) {
            const mappedProviders = response.data.data.map((provider: any) => ({
              id: provider.id,
              name: provider.name || `${provider.firstName || ''} ${provider.lastName || ''}`.trim(),
              specialty: provider.specialty || 'General',
            }));
            setProviders(mappedProviders);
          }
        } catch (error) {
          console.error('Error fetching providers:', error);
          setError('Failed to load providers. Please try again.');
        } finally {
          setFetchingProviders(false);
        }
      }
    };
    
    fetchProviders();
  }, [user?.role, providerId]);
  
  // Fetch patients if needed (for provider or admin)
  useEffect(() => {
    const fetchPatients = async () => {
      if ((user?.role === 'PROVIDER' || user?.role === 'ADMIN') && !patientId) {
        try {
          setFetchingPatients(true);
          const apiClient = ApiClient.getInstance();
          const response = await apiClient.getUsers({ role: 'PATIENT' });
          
          if (response.data) {
            const responseData = response.data.data || [];
            const mappedPatients = responseData.map((patient: any) => ({
              id: patient.id,
              name: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
            }));
            setPatients(mappedPatients);
          }
        } catch (error) {
          console.error('Error fetching patients:', error);
          setError('Failed to load patients. Please try again.');
        } finally {
          setFetchingPatients(false);
        }
      }
    };
    
    fetchPatients();
  }, [user?.role, patientId]);
  
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
      
      const apiClient = ApiClient.getInstance();
      
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
        providerId: formData.providerId,
        patientId: formData.patientId,
        scheduledFor: formattedDate,
        reason: formData.reason,
        notes: formData.notes,
        type: formData.type,
        status: formData.status,
      };
      
      let response;
      
      if (editMode && initialData?.id) {
        response = await apiClient.updateAppointment(initialData.id, appointmentData);
      } else {
        response = await apiClient.createAppointment(appointmentData);
      }
      
      if (response.data) {
        setSuccess(true);
        setFormData({
          providerId: providerId || '',
          patientId: patientId || '',
          date: new Date(),
          time: new Date(),
          reason: '',
          notes: '',
          type: 'checkup',
          status: AppointmentStatus.SCHEDULED,
        });
        
        if (onSuccess) {
          onSuccess(response.data.id);
        }
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
      setError('Failed to save appointment. Please try again.');
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
              {(user?.role === 'PATIENT' || (user?.role === 'ADMIN' && !providerId)) && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!validationErrors.providerId}>
                    <InputLabel id="provider-label">Provider</InputLabel>
                    <Select
                      labelId="provider-label"
                      id="providerId"
                      name="providerId"
                      value={formData.providerId}
                      label="Provider"
                      onChange={handleChange}
                      disabled={loading || !!providerId}
                    >
                      {fetchingProviders ? (
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
                    </Select>
                    {validationErrors.providerId && (
                      <FormHelperText>{validationErrors.providerId}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              )}
              
              {/* Patient Selection */}
              {(user?.role === 'PROVIDER' || (user?.role === 'ADMIN' && !patientId)) && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!validationErrors.patientId}>
                    <InputLabel id="patient-label">Patient</InputLabel>
                    <Select
                      labelId="patient-label"
                      id="patientId"
                      name="patientId"
                      value={formData.patientId}
                      label="Patient"
                      onChange={handleChange}
                      disabled={loading || !!patientId}
                    >
                      {fetchingPatients ? (
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
                    </Select>
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
                  <Select
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
                  </Select>
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
                    <Select
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
                    </Select>
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
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      error={!!validationErrors.date}
                      helperText={validationErrors.date}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
              
              {/* Time Picker */}
              <Grid item xs={12} md={6}>
                <TimePicker
                  label="Appointment Time"
                  value={formData.time}
                  onChange={(time: unknown) => handleTimeChange(time)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      error={!!validationErrors.time}
                      helperText={validationErrors.time}
                      disabled={loading}
                    />
                  )}
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