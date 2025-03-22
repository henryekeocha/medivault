'use client';

import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

export default function ProviderAppointmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container maxWidth="xl">
      <Box
        py={8}
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={3}
      >
        <ErrorIcon color="error" sx={{ fontSize: 64 }} />
        <Typography variant="h4" color="error" gutterBottom>
          Something went wrong!
        </Typography>
        <Typography color="text.secondary" align="center" sx={{ maxWidth: 600 }}>
          {error.message || 'An error occurred while loading appointments. Please try again.'}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => reset()}
          size="large"
        >
          Try Again
        </Button>
      </Box>
    </Container>
  );
} 