'use client';

import React from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import DeviceManagement from '@/components/auth/DeviceManagement';
import { useRouter } from 'next/navigation';
import { useCognitoAuthContext } from '@/contexts/CognitoAuthContext';
import type { Route } from 'next';
import { routes } from '@/config/routes';

export default function DevicesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useCognitoAuthContext();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`${routes.root.login}?from=cognito` as Route);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, mt: 3 }}>
        <DeviceManagement />
      </Paper>
    </Container>
  );
} 