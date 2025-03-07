'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  TextField,
  Button,
  MenuItem,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  SelectChangeEvent,
  Switch,
  Divider,
  Alert,
  CircularProgress, 
  Skeleton,
  Snackbar
} from '@mui/material';
import { ArrowBack, Save, Person } from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { format, parse } from 'date-fns';
import { ApiClient } from '@/lib/api/client';
import { PatientStatus } from '@prisma/client';
import { useAuth } from '@/contexts/AuthContext';

// Define the form state interface
interface PatientFormState {
  name: string;
  dateOfBirth: string;
  gender: string;
  status: PatientStatus;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  insuranceProvider: string;
  insuranceId: string;
  notes: string;
}

// Initial empty form state
const initialFormState: PatientFormState = {
  name: '',
  dateOfBirth: '',
  gender: '',
  status: PatientStatus.ACTIVE,
  email: '',
  phone: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  insuranceProvider: '',
  insuranceId: '',
  notes: ''
};

// Define validation errors interface
interface ValidationErrors {
  [key: string]: string;
}

export default function EditPatientPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id as string;
  const { user } = useAuth();

  const [formState, setFormState] = useState<PatientFormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch patient data on component mount
  useEffect(() => {
    if (!patientId || !user?.id) return;
    fetchPatientDetails();
  }, [patientId, user?.id]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiClient = ApiClient.getInstance();
      
      const response = await apiClient.getPatientDetails(patientId);
      if (response.status === 'success' && response.data) {
        // Map API response to form state
        const patient = response.data;
        setFormState({
          name: patient.name,
          dateOfBirth: patient.dateOfBirth || '',
          gender: patient.gender || '',
          status: patient.status,
          email: patient.contact.email,
          phone: patient.contact.phone || '',
          emergencyContactName: patient.contact.emergencyContact?.name || '',
          emergencyContactRelationship: patient.contact.emergencyContact?.relationship || '',
          emergencyContactPhone: patient.contact.emergencyContact?.phone || '',
          street: patient.address?.street || '',
          city: patient.address?.city || '',
          state: patient.address?.state || '',
          zipCode: patient.address?.zipCode || '',
          country: patient.address?.country || '',
          insuranceProvider: patient.insuranceProvider || '',
          insuranceId: patient.insuranceId || '',
          notes: patient.notes || ''
        });
      } else {
        setError('Failed to fetch patient details');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching patient details:', error);
      setError('An error occurred while fetching patient details');
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Clear validation error when field is modified
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const name = e.target.name as string;
    const value = e.target.value;
    
    // Clear validation error when field is modified
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    // Required fields validation
    if (!formState.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formState.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formState.email)) {
      errors.email = 'Email is invalid';
    }
    
    // Date of birth validation
    if (formState.dateOfBirth) {
      try {
        const date = new Date(formState.dateOfBirth);
        if (isNaN(date.getTime())) {
          errors.dateOfBirth = 'Invalid date format (YYYY-MM-DD)';
        } else if (date > new Date()) {
          errors.dateOfBirth = 'Date of birth cannot be in the future';
        }
      } catch (error) {
        errors.dateOfBirth = 'Invalid date format (YYYY-MM-DD)';
      }
    }
    
    // Phone number format validation (simple version)
    if (formState.phone && !/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im.test(formState.phone)) {
      errors.phone = 'Phone number format is invalid';
    }
    
    // Emergency contact phone validation (if name is provided)
    if (formState.emergencyContactName && !formState.emergencyContactPhone) {
      errors.emergencyContactPhone = 'Phone is required if contact name is provided';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorField = Object.keys(validationErrors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const apiClient = ApiClient.getInstance();
      
      // Format the data for the API
      const patientData = {
        name: formState.name,
        dateOfBirth: formState.dateOfBirth,
        gender: formState.gender,
        status: formState.status,
        contact: {
          email: formState.email,
          phone: formState.phone,
          emergencyContact: {
            name: formState.emergencyContactName,
            relationship: formState.emergencyContactRelationship,
            phone: formState.emergencyContactPhone
          }
        },
        address: {
          street: formState.street,
          city: formState.city,
          state: formState.state,
          zipCode: formState.zipCode,
          country: formState.country
        },
        insuranceProvider: formState.insuranceProvider,
        insuranceId: formState.insuranceId,
        notes: formState.notes
      };
      
      // Call the API to update patient details
      const response = await apiClient.updateUser(patientId, patientData);
      
      if (response.status === 'success') {
        setSuccessMessage('Patient information updated successfully');
        // Redirect to patient details page after a short delay
        setTimeout(() => {
          router.push(`/provider/patients/${patientId}`);
        }, 2000);
      } else {
        throw new Error('Failed to update patient information');
      }
      
    } catch (error) {
      console.error('Error updating patient:', error);
      setError('An error occurred while updating the patient information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 1 }} />
          <Skeleton variant="text" width={200} height={40} />
        </Box>
        
        <Paper sx={{ p: 3 }}>
          <Skeleton variant="text" width="60%" height={40} sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            {Array.from(new Array(8)).map((_, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Skeleton variant="text" width="100%" height={60} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>
    );
  }

  if (error && !formState.name) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={handleGoBack}
          sx={{ mb: 3 }}
        >
          Back to Patient Details
        </Button>
        
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={handleGoBack}
        >
          Back to Patient Details
        </Button>
      </Box>
      
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Person sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Edit Patient
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
            Personal Information
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Full Name"
                fullWidth
                required
                value={formState.name}
                onChange={handleInputChange}
                error={!!validationErrors.name}
                helperText={validationErrors.name}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="dateOfBirth"
                label="Date of Birth"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formatDateForInput(formState.dateOfBirth)}
                onChange={handleInputChange}
                error={!!validationErrors.dateOfBirth}
                helperText={validationErrors.dateOfBirth}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="gender-label">Gender</InputLabel>
                <Select
                  labelId="gender-label"
                  name="gender"
                  label="Gender"
                  value={formState.gender}
                  onChange={handleSelectChange}
                >
                  <MenuItem value="">Not specified</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  label="Status"
                  value={formState.status}
                  onChange={handleSelectChange}
                >
                  {Object.values(PatientStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
            Contact Information
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="email"
                label="Email"
                fullWidth
                required
                value={formState.email}
                onChange={handleInputChange}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="phone"
                label="Phone Number"
                fullWidth
                value={formState.phone}
                onChange={handleInputChange}
                error={!!validationErrors.phone}
                helperText={validationErrors.phone}
              />
            </Grid>
          </Grid>
          
          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
            Address
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                name="street"
                label="Street Address"
                fullWidth
                value={formState.street}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="city"
                label="City"
                fullWidth
                value={formState.city}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="state"
                label="State/Province"
                fullWidth
                value={formState.state}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="zipCode"
                label="ZIP / Postal Code"
                fullWidth
                value={formState.zipCode}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="country"
                label="Country"
                fullWidth
                value={formState.country}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
          
          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
            Emergency Contact
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="emergencyContactName"
                label="Contact Name"
                fullWidth
                value={formState.emergencyContactName}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="emergencyContactRelationship"
                label="Relationship"
                fullWidth
                value={formState.emergencyContactRelationship}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="emergencyContactPhone"
                label="Contact Phone"
                fullWidth
                value={formState.emergencyContactPhone}
                onChange={handleInputChange}
                error={!!validationErrors.emergencyContactPhone}
                helperText={validationErrors.emergencyContactPhone}
              />
            </Grid>
          </Grid>
          
          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
            Insurance Information
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="insuranceProvider"
                label="Insurance Provider"
                fullWidth
                value={formState.insuranceProvider}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="insuranceId"
                label="Insurance ID"
                fullWidth
                value={formState.insuranceId}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
          
          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
            Medical Notes
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Notes"
                multiline
                rows={4}
                fullWidth
                value={formState.notes}
                onChange={handleInputChange}
                placeholder="Enter any important medical notes, allergies, or other information"
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleGoBack}
              sx={{ mr: 2 }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
} 