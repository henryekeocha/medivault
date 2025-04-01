'use client';

import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Grid, Paper, TextField, Typography } from '@mui/material';
import { patientClient } from '@/lib/api/patientClient';
import { Patient } from '@/lib/api/types';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const { handleError, clearError, error } = useErrorHandler();

  const fetchProfile = async () => {
    try {
      clearError();
      setLoading(true);
      const response = await patientClient.getUserProfile();
      // Convert User to Patient type
      const userData = response.data;
      const patientData: Patient = {
        id: userData.id,
        name: userData.name,
        dateOfBirth: userData.birthdate || '',
        gender: userData.gender || '',
        status: 'ACTIVE',
        contact: {
          email: userData.email,
          phone: userData.phoneNumber,
        },
        address: userData.address ? {
          street: userData.address,
          city: '',
          state: '',
          zipCode: '',
          country: '',
        } : undefined,
        insuranceProvider: '',
        insuranceId: '',
        notes: '',
      };
      setProfile(patientData);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    
    try {
      clearError();
      setLoading(true);
      // Convert Patient back to User type for update
      const userData = {
        name: profile.name,
        email: profile.contact.email,
        phoneNumber: profile.contact.phone,
        birthdate: profile.dateOfBirth,
        gender: profile.gender,
        address: profile.address ? `${profile.address.street}, ${profile.address.city}, ${profile.address.state} ${profile.address.zipCode}` : undefined,
      };
      await patientClient.updateUserProfile(userData);
      await fetchProfile(); // Refresh profile data after update
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={fetchProfile} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box p={3}>
        <Typography>No profile data available</Typography>
      </Box>
    );
  }

  // Split name into first and last name
  const [firstName = '', lastName = ''] = profile.name.split(' ');

  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Profile Information
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={firstName}
              onChange={(e) => setProfile({ ...profile, name: `${e.target.value} ${lastName}`.trim() })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={lastName}
              onChange={(e) => setProfile({ ...profile, name: `${firstName} ${e.target.value}`.trim() })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              value={profile.contact.email}
              disabled
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              value={profile.contact.phone || ''}
              onChange={(e) => setProfile({ 
                ...profile, 
                contact: { ...profile.contact, phone: e.target.value }
              })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date of Birth"
              type="date"
              value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : ''}
              onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Insurance Provider"
              value={profile.insuranceProvider || ''}
              onChange={(e) => setProfile({ ...profile, insuranceProvider: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Street Address"
              value={profile.address?.street || ''}
              onChange={(e) => setProfile({ 
                ...profile, 
                address: { 
                  street: e.target.value,
                  city: profile.address?.city || '',
                  state: profile.address?.state || '',
                  zipCode: profile.address?.zipCode || '',
                  country: profile.address?.country || ''
                } 
              })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City"
              value={profile.address?.city || ''}
              onChange={(e) => setProfile({ 
                ...profile, 
                address: { 
                  street: profile.address?.street || '',
                  city: e.target.value,
                  state: profile.address?.state || '',
                  zipCode: profile.address?.zipCode || '',
                  country: profile.address?.country || ''
                } 
              })}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="State"
              value={profile.address?.state || ''}
              onChange={(e) => setProfile({ 
                ...profile, 
                address: { 
                  street: profile.address?.street || '',
                  city: profile.address?.city || '',
                  state: e.target.value,
                  zipCode: profile.address?.zipCode || '',
                  country: profile.address?.country || ''
                } 
              })}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="ZIP Code"
              value={profile.address?.zipCode || ''}
              onChange={(e) => setProfile({ 
                ...profile, 
                address: { 
                  street: profile.address?.street || '',
                  city: profile.address?.city || '',
                  state: profile.address?.state || '',
                  zipCode: e.target.value,
                  country: profile.address?.country || ''
                } 
              })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Medical Notes"
              value={profile.notes || ''}
              onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
              multiline
              rows={4}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
} 