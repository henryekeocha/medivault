import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useUser } from '@clerk/nextjs';
import { UserProfile } from '@clerk/nextjs';

export default function DeviceManagement() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Alert severity="error">User not authenticated</Alert>;
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Account Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage your account settings, devices, and security preferences
      </Typography>
      
      <UserProfile 
        path="/user-profile"
        routing="path"
        appearance={{
          elements: {
            rootBox: {
              boxShadow: 'none',
              width: '100%',
            },
            card: {
              boxShadow: 'none',
            },
          },
        }}
      />
    </Paper>
  );
} 