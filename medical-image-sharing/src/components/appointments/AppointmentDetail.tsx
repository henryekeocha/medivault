'use client';

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
   SelectChangeEvent,
} from '@mui/material';
import { format } from 'date-fns';
import { patientClient } from '@/lib/api/patientClient';
import { providerClient } from '@/lib/api/providerClient';
import { useSession } from 'next-auth/react';
import { AppointmentStatus } from '@prisma/client';

// Mapping for appointment status display
const statusMap: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  SCHEDULED: { label: 'Scheduled', color: 'primary' },
  CONFIRMED: { label: 'Confirmed', color: 'success' },
  COMPLETED: { label: 'Completed', color: 'secondary' },
  CANCELLED: { label: 'Cancelled', color: 'error' },
  RESCHEDULED: { label: 'Rescheduled', color: 'warning' },
  NO_SHOW: { label: 'No Show', color: 'error' },
};

// Mapping for appointment type display
const typeMap: Record<string, string> = {
  checkup: 'Check-up',
  consultation: 'Consultation',
  followup: 'Follow-up',
  imaging: 'Imaging',
  procedure: 'Procedure',
};

interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  patientName?: string;
  providerName?: string;
  scheduledFor: string;
  reason: string;
  notes?: string;
  status: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AppointmentDetailProps {
  appointment: Appointment;
  userRole?: 'PATIENT' | 'PROVIDER' | 'ADMIN';
  onEdit?: (appointment: Appointment) => void;
  onClose?: () => void;
  onStatusChange?: () => void;
}

export default function AppointmentDetail({
  appointment,
  userRole = 'PATIENT',
  onEdit,
  onClose,
  onStatusChange,
}: AppointmentDetailProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Status update dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(appointment.status);
  
  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  
  // Handle status update
  const handleStatusUpdate = async () => {
    if (newStatus === appointment.status) {
      setStatusDialogOpen(false);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Use the appropriate client based on user role
      if (userRole === 'PATIENT') {
        await patientClient.updateAppointment(appointment.id, { status: newStatus as AppointmentStatus });
      } else {
        await providerClient.updateAppointment(appointment.id, { status: newStatus as AppointmentStatus });
      }
      
      setSuccess(`Appointment status updated to ${statusMap[newStatus]?.label || newStatus}`);
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setError('Failed to update appointment status. Please try again.');
    } finally {
      setLoading(false);
      setStatusDialogOpen(false);
    }
  };
  
  // Handle appointment cancellation
  const handleCancelAppointment = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use the appropriate client based on user role
      if (userRole === 'PATIENT') {
        await patientClient.updateAppointment(appointment.id, { status: 'CANCELLED' });
      } else {
        await providerClient.updateAppointment(appointment.id, { status: 'CANCELLED' });
      }
      
      setSuccess('Appointment has been cancelled');
      
      // Notify parent component
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      setError('Failed to cancel appointment. Please try again.');
    } finally {
      setLoading(false);
      setCancelDialogOpen(false);
    }
  };
  
  // Handle status change
  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    setNewStatus(event.target.value);
  };
  
  // Check if user can edit the appointment
  const canEdit = () => {
    if (userRole === 'ADMIN') return true;
    
    // Safe access to user ID, accounting for different session structures
    const userId = session?.user && ('id' in session.user) 
      ? (session.user as any).id 
      : undefined;
    
    if (userRole === 'PROVIDER' && userId === appointment.providerId) return true;
    if (userRole === 'PATIENT' && userId === appointment.patientId) {
      return ['SCHEDULED', 'CONFIRMED'].includes(appointment.status);
    }
    return false;
  };
  
  // Check if user can update status
  const canUpdateStatus = () => {
    return userRole === 'PROVIDER' || userRole === 'ADMIN';
  };

  return (
    <Card>
      <CardContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Appointment Details
          </Typography>
          <Chip
            label={statusMap[appointment.status]?.label || appointment.status}
            color={statusMap[appointment.status]?.color || 'default'}
          />
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Date & Time
            </Typography>
            <Typography variant="body1" gutterBottom>
              {format(new Date(appointment.scheduledFor), 'EEEE, MMMM d, yyyy')} at {format(new Date(appointment.scheduledFor), 'h:mm a')}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Appointment Type
            </Typography>
            <Typography variant="body1" gutterBottom>
              {typeMap[appointment.type] || appointment.type}
            </Typography>
          </Grid>
          
          {userRole !== 'PATIENT' && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Patient
              </Typography>
              <Typography variant="body1" gutterBottom>
                {appointment.patientName || 'Unknown Patient'}
              </Typography>
            </Grid>
          )}
          
          {userRole !== 'PROVIDER' && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Provider
              </Typography>
              <Typography variant="body1" gutterBottom>
                {appointment.providerName || 'Unknown Provider'}
              </Typography>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              Reason for Visit
            </Typography>
            <Typography variant="body1" gutterBottom>
              {appointment.reason}
            </Typography>
          </Grid>
          
          {appointment.notes && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Additional Notes
              </Typography>
              <Typography variant="body1" gutterBottom>
                {appointment.notes}
              </Typography>
            </Grid>
          )}
          
          {appointment.createdAt && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {format(new Date(appointment.createdAt), 'MMM d, yyyy h:mm a')}
              </Typography>
            </Grid>
          )}
          
          {appointment.updatedAt && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {format(new Date(appointment.updatedAt), 'MMM d, yyyy h:mm a')}
              </Typography>
            </Grid>
          )}
        </Grid>
        
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {onClose && (
            <Button variant="outlined" onClick={onClose}>
              Close
            </Button>
          )}
          
          {canEdit() && ['SCHEDULED', 'CONFIRMED'].includes(appointment.status) && (
            <Button 
              variant="outlined" 
              color="error" 
              onClick={() => setCancelDialogOpen(true)}
            >
              Cancel Appointment
            </Button>
          )}
          
          {canUpdateStatus() && !['CANCELLED', 'COMPLETED'].includes(appointment.status) && (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => setStatusDialogOpen(true)}
            >
              Update Status
            </Button>
          )}
          
          {canEdit() && onEdit && ['SCHEDULED', 'CONFIRMED'].includes(appointment.status) && (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => onEdit(appointment)}
            >
              Edit Appointment
            </Button>
          )}
        </Box>
      </CardContent>
      
      {/* Status Update Dialog */}
      <Dialog 
        open={statusDialogOpen} 
        onClose={() => setStatusDialogOpen(false)}
        aria-labelledby="status-update-dialog-title"
        disableEnforceFocus
      >
        <DialogTitle id="status-update-dialog-title">Update Appointment Status</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select the new status for this appointment.
          </DialogContentText>
          
          <FormControl fullWidth>
            <InputLabel id="status-select-label">Status</InputLabel>
            <Select
              labelId="status-select-label"
              id="status-select"
              value={newStatus}
              label="Status"
              onChange={handleStatusChange}
            >
              <MenuItem value="SCHEDULED">Scheduled</MenuItem>
              <MenuItem value="CONFIRMED">Confirmed</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
              <MenuItem value="RESCHEDULED">Rescheduled</MenuItem>
              <MenuItem value="NO_SHOW">No Show</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStatusUpdate} variant="contained" color="primary">
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Cancel Appointment Dialog */}
      <Dialog 
        open={cancelDialogOpen} 
        onClose={() => setCancelDialogOpen(false)}
        aria-labelledby="cancel-appointment-dialog-title"
        disableEnforceFocus
      >
        <DialogTitle id="cancel-appointment-dialog-title">Cancel Appointment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>No, Keep It</Button>
          <Button onClick={handleCancelAppointment} color="error" autoFocus>
            Yes, Cancel Appointment
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
        message={success}
      />
    </Card>
  );
} 