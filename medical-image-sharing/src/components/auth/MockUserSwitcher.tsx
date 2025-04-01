'use client';

import React, { useState } from 'react';
import { Button, Box, Typography, Paper, Grid, useTheme } from '@mui/material';
import { useClerk, useUser } from '@clerk/nextjs';
import { Role } from '@prisma/client';

export const MockUserSwitcher: React.FC = () => {
  const theme = useTheme();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  
  // Development only component
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleUserSelect = async (role: Role) => {
    setIsOpen(false);
    try {
      // Sign out current user
      await signOut();
      
      // Create a new user with the selected role
      const mockUser = createMockUser(role);
      
      // Sign in with the mock user
      // Note: In a real application, you would use Clerk's API to create and sign in users
      // This is just a mock implementation for development purposes
      console.log('Mock user created:', mockUser);
      
      // Redirect to sign-in page
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Error switching users:', error);
    }
  };

  const createMockUser = (role: Role) => {
    const userId = `mock-${role.toLowerCase()}-${Date.now()}`;
    return {
      id: userId,
      name: `Mock ${role}`,
      email: `mock${role.toLowerCase()}@example.com`,
      role,
      emailVerified: new Date(),
      isActive: true,
    };
  };

  // Log warning in development console
  console.warn(
    'WARNING: MockUserSwitcher is a development tool and should not be used in production. ' +
    'Please ensure it is removed or disabled before deploying to production.'
  );

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
      <Button
        variant="contained"
        color="secondary"
        onClick={handleToggle}
        sx={{ mb: 1 }}
      >
        Switch User
      </Button>

      {isOpen && (
        <Paper
          elevation={3}
          sx={{
            p: 2,
            maxWidth: 300,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Current User: {user?.fullName || 'Not signed in'}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Role: {(user?.publicMetadata?.role as string) || 'Unknown'}
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleUserSelect(Role.PATIENT)}
              >
                Switch to Patient
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleUserSelect(Role.PROVIDER)}
              >
                Switch to Provider
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => handleUserSelect(Role.ADMIN)}
              >
                Switch to Admin
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default MockUserSwitcher; 