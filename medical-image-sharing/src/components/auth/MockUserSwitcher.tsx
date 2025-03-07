'use client';

import React, { useState } from 'react';
import { Button, Box, Typography, Paper, Grid, useTheme } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { mockUsers } from '@/lib/mockAuth';
import { User } from '@/lib/api/types';
import { UserRole } from '@/types';

export const MockUserSwitcher: React.FC = () => {
  const theme = useTheme();
  const { state, dispatch } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Development only component
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleUserSelect = (role: UserRole) => {
    setIsOpen(false);
    const mockUser = createMockUser(role);
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user: mockUser, token: 'mock-token' } });
    // Save in local storage to persist the mock state
    localStorage.setItem('mockUser', JSON.stringify(mockUser));
  };

  const createMockUser = (role: UserRole): User => {
    const userId = `mock-${role.toLowerCase()}-${Date.now()}`;
    const user: User = {
      id: userId,
      name: `Mock ${role}`,
      email: `mock${role.toLowerCase()}@example.com`,
      role,
    };
    return user;
  };

  // Log warning in development console
  console.warn(
    'WARNING: MockUserSwitcher is a development tool and should not be used in production. ' +
    'Please ensure it is removed or disabled before deploying to production.'
  );

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        m: 2, 
        maxWidth: 400, 
        mx: 'auto',
        border: '2px solid',
        borderColor: 'warning.main'
      }}
    >
      <Typography variant="h6" component="h2" color="warning.main" sx={{ mb: 1 }}>
        ⚠️ DEVELOPMENT MODE ONLY ⚠️
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Current user: {state.user?.name || 'None'} ({state.user?.role || 'Not logged in'})
      </Typography>
      
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth
            onClick={() => handleUserSelect('Admin')}
            sx={{ mb: 1 }}
          >
            Log in as Admin
          </Button>
        </Grid>
        
        <Grid item xs={12}>
          <Button 
            variant="contained" 
            color="secondary" 
            fullWidth
            onClick={() => handleUserSelect('Provider')}
            sx={{ mb: 1 }}
          >
            Log in as Provider
          </Button>
        </Grid>
        
        <Grid item xs={12}>
          <Button 
            variant="contained" 
            color="success" 
            fullWidth
            onClick={() => handleUserSelect('Patient')}
            sx={{ mb: 1 }}
          >
            Log in as Patient
          </Button>
        </Grid>
        
        <Grid item xs={12}>
          <Button 
            variant="outlined" 
            color="error" 
            fullWidth
            onClick={() => dispatch({ type: 'LOGOUT' })}
          >
            Log Out
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default MockUserSwitcher; 