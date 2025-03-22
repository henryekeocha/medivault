'use client';

import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Box, Typography, Container, Paper, Grid, Button, Chip } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface Appointment {
  id: string;
  scheduledFor: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  doctor: {
    id: string;
    name: string;
    specialty: string;
    email: string;
  };
  image?: {
    id: string;
    url: string;
    type: string;
  };
}

export default function PatientAppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const { data: appointment, isLoading } = useQuery<Appointment>({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${appointmentId}`);
      if (!response.ok) throw new Error('Failed to fetch appointment');
      return response.json();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!response.ok) throw new Error('Failed to cancel appointment');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Appointment cancelled successfully');
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box py={4}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (!appointment) {
    return (
      <Container maxWidth="lg">
        <Box py={4}>
          <Typography>Appointment not found</Typography>
        </Box>
      </Container>
    );
  }

  const isUpcoming = new Date(appointment.scheduledFor) > new Date() &&
    appointment.status === 'scheduled';

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Paper elevation={3}>
          <Box p={4}>
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Typography variant="h4" gutterBottom>
                  Appointment Details
                </Typography>
                <Chip
                  label={appointment.status.toUpperCase()}
                  color={
                    appointment.status === 'scheduled'
                      ? 'primary'
                      : appointment.status === 'completed'
                      ? 'success'
                      : 'error'
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Doctor Information
                </Typography>
                <Typography>Name: Dr. {appointment.doctor.name}</Typography>
                <Typography>Specialty: {appointment.doctor.specialty}</Typography>
                <Typography>Email: {appointment.doctor.email}</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Appointment Information
                </Typography>
                <Typography>
                  Date: {new Date(appointment.scheduledFor).toLocaleDateString()}
                </Typography>
                <Typography>
                  Time: {new Date(appointment.scheduledFor).toLocaleTimeString()}
                </Typography>
                <Typography>Notes: {appointment.notes}</Typography>
              </Grid>

              {appointment.image && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Associated Image
                  </Typography>
                  <Typography>Type: {appointment.image.type}</Typography>
                  {/* Add image viewer component here */}
                </Grid>
              )}

              {isUpcoming && (
                <Grid item xs={12}>
                  <Box display="flex" gap={2}>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this appointment?')) {
                          cancelMutation.mutate();
                        }
                      }}
                    >
                      Cancel Appointment
                    </Button>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
} 