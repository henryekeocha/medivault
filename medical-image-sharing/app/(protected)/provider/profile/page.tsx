'use client';

import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, TextField, Grid, CircularProgress, Alert } from '@mui/material';
import ProfileForm from '@/components/profile/ProfileForm';
import { providerClient } from '@/lib/api/providerClient';
import type { User } from '@/lib/api/types';
import { ProviderSpecialty } from '@prisma/client';

export default function ProviderProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<User | null>(null);

  useEffect(() => {
    fetchProviderProfile();
  }, []);

  const fetchProviderProfile = async () => {
    try {
      setLoading(true);
      const response = await providerClient.getUserProfile();
      
      if (response.status === 'success') {
        setProvider(response.data);
      } else {
        setError('Failed to load provider profile');
        console.error('Failed to fetch provider profile:', response);
      }
    } catch (err) {
      setError('An error occurred while loading the profile');
      console.error('Error fetching provider profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const providerFields = (
    <>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Specialty"
          defaultValue={provider?.specialty || ProviderSpecialty.GENERAL}
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="License Number"
          defaultValue={provider?.licenseNumber || 'Not specified'}
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Hospital/Clinic"
          defaultValue={provider?.institution || 'Not specified'}
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Active Patients"
          defaultValue={provider?.activePatients || '0'}
          disabled
        />
      </Grid>
    </>
  );

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Provider Profile
        </Typography>
        <ProfileForm 
          additionalFields={providerFields}
          userData={provider ? {
            name: provider.name,
            phoneNumber: provider.phoneNumber
          } : undefined}
          onUpdate={fetchProviderProfile}
        />
      </Box>
    </Container>
  );
} 