'use client';

import React from 'react';
import { Container, Typography, Box, TextField, Grid } from '@mui/material';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default function AdminProfilePage() {
  const adminFields = (
    <>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Department"
          defaultValue="System Administration"
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Access Level"
          defaultValue="Full System Access"
          disabled
        />
      </Grid>
    </>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Profile
        </Typography>
        <ProfileForm additionalFields={adminFields} />
      </Box>
    </Container>
  );
} 