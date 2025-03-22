'use client';

import React from 'react';
import { Container, Typography, Box, TextField, Grid } from '@mui/material';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default function PatientProfilePage() {
  const patientFields = (
    <>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Full Name"
          defaultValue="John Doe"
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Date of Birth"
          defaultValue="1990-01-01"
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Medical Record Number"
          defaultValue="P123456"
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Primary Provider"
          defaultValue="Dr. Smith"
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Insurance Provider"
          defaultValue="Health Insurance Co."
          disabled
        />
      </Grid>
    </>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Patient Profile
        </Typography>
        <ProfileForm additionalFields={patientFields} />
      </Box>
    </Container>
  );
} 