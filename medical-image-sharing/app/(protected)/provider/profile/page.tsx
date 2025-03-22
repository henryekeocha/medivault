'use client';

import React from 'react';
import { Container, Typography, Box, TextField, Grid } from '@mui/material';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default function ProviderProfilePage() {
  const providerFields = (
    <>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Specialty"
          defaultValue="Radiology"
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="License Number"
          defaultValue="MD123456"
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Hospital/Clinic"
          defaultValue="Medical Center"
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Active Patients"
          defaultValue="32"
          disabled
        />
      </Grid>
    </>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Provider Profile
        </Typography>
        <ProfileForm additionalFields={providerFields} />
      </Box>
    </Container>
  );
} 