import React from 'react';
import { Container, Box } from '@mui/material';
import { SkeletonPage } from '@/components/SkeletonLoader';

export default function PatientAppointmentsLoading() {
  return (
    <Container maxWidth="xl">
      <Box py={4}>
        <SkeletonPage />
      </Box>
    </Container>
  );
} 