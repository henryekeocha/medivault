'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tabs, 
  Tab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import AppointmentList from '@/components/appointments/AppointmentList';
import AppointmentForm from '@/components/appointments/AppointmentForm';
import AppointmentDetail from '@/components/appointments/AppointmentDetail';
import { useUser } from '@clerk/nextjs';
import { patientClient } from '@/lib/api/patientClient';

/**
 * The Appointment interface used in this page component.
 * Note: This interface differs from the one used in AppointmentDetail.tsx
 * and from the API's Appointment type.
 * - AppointmentDetail expects scheduledFor to be just string
 * - API returns createdAt and updatedAt as Date objects
 */
interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  patientName?: string;
  providerName?: string;
  scheduledFor: string | Date;  // Our interface allows both string and Date
  reason: string;
  notes?: string;
  status: string;
  type: string;
  createdAt?: string | Date;  // Allow both string and Date
  updatedAt?: string | Date;  // Allow both string and Date
}

export default function PatientAppointmentsPage() {
  const { user, isLoaded } = useUser();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State for dialogs
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // State for selected appointment
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // State for refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // State for tab value and filter status mapping
  const [tabValue, setTabValue] = useState(0);
  
  // Define status filters for each tab
  const tabStatusFilters = [
    '', // All appointments
    'SCHEDULED,CONFIRMED', // Upcoming
    'COMPLETED', // Past
    'CANCELLED,NO_SHOW' // Cancelled
  ];
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle view appointment
  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailDialogOpen(true);
  };
  
  // Handle edit appointment
  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditDialogOpen(true);
    setDetailDialogOpen(false);
  };
  
  /**
   * Converts between API Appointment type and our local Appointment type.
   * Main conversions:
   * 1. Ensuring scheduledFor is a string if it was a Date
   * 2. Converting createdAt and updatedAt to strings if they were Dates
   */
  const convertAppointmentData = (appointment: any): any => {
    return {
      ...appointment,
      // Ensure scheduledFor is a string if it comes as a Date
      scheduledFor: appointment.scheduledFor instanceof Date 
        ? appointment.scheduledFor.toISOString() 
        : appointment.scheduledFor,
      // Ensure createdAt is a string
      createdAt: appointment.createdAt instanceof Date 
        ? appointment.createdAt.toISOString() 
        : (appointment.createdAt || new Date().toISOString()),
      // Ensure updatedAt is a string
      updatedAt: appointment.updatedAt instanceof Date 
        ? appointment.updatedAt.toISOString() 
        : (appointment.updatedAt || new Date().toISOString()),
    };
  };
  
  // Update the handler to use the conversion function
  const handleAppointmentSuccess = (appointmentId: string) => {
    setNewAppointmentOpen(false);
    setEditDialogOpen(false);
    setRefreshTrigger(prev => prev + 1);
    
    // If we have the appointment ID, we could fetch and show its details
    if (appointmentId) {
      // Optionally fetch and display the newly created appointment details
      const fetchNewAppointment = async () => {
        try {
          const response = await patientClient.getAppointment(appointmentId);
          if (response.status === 'success' && response.data) {
            // Convert the appointment to ensure type compatibility
            const convertedAppointment = convertAppointmentData(response.data);
            setSelectedAppointment(convertedAppointment);
            setDetailDialogOpen(true);
          }
        } catch (error) {
          console.error('Error fetching new appointment details:', error);
        }
      };
      
      fetchNewAppointment();
    }
  };
  
  // Handle status change
  const handleStatusChange = () => {
    setRefreshTrigger(prev => prev + 1);
    setDetailDialogOpen(false);
  };

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Appointments</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setNewAppointmentOpen(true)}
        >
          Book Appointment
        </Button>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : undefined}
        >
          <Tab label="All Appointments" />
          <Tab label="Upcoming" />
          <Tab label="Past" />
          <Tab label="Cancelled" />
        </Tabs>
      </Paper>
      
      {/* Use a single AppointmentList with dynamic filters based on tab */}
      <AppointmentList
        userRole="PATIENT"
        onView={handleViewAppointment}
        onEdit={handleEditAppointment}
        refreshTrigger={refreshTrigger}
        statusFilter={tabStatusFilters[tabValue]}
      />
      
      {/* New Appointment Dialog */}
      <Dialog
        open={newAppointmentOpen}
        onClose={() => setNewAppointmentOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Book New Appointment
            <IconButton edge="end" onClick={() => setNewAppointmentOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <AppointmentForm
            onSuccess={handleAppointmentSuccess}
            patientId={user.id}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Appointment Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Edit Appointment
            <IconButton edge="end" onClick={() => setEditDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAppointment && (
            <AppointmentForm
              editMode
              initialData={{
                ...selectedAppointment,
                scheduledFor: selectedAppointment.scheduledFor instanceof Date 
                  ? selectedAppointment.scheduledFor.toISOString()
                  : selectedAppointment.scheduledFor,
              }}
              onSuccess={handleAppointmentSuccess}
              patientId={user.id}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Appointment Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogContent>
          {selectedAppointment && (
            <AppointmentDetail
              appointment={convertAppointmentData(selectedAppointment)}
              userRole="PATIENT"
              onEdit={handleEditAppointment}
              onClose={() => setDetailDialogOpen(false)}
              onStatusChange={handleStatusChange}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
} 