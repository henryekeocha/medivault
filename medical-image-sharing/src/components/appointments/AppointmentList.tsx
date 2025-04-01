'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TablePagination, 
  Tooltip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  SelectChangeEvent,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';
import { useClerk, useUser } from '@clerk/nextjs';
import { useToast } from '@/contexts/ToastContext';
import { Appointment as ApiAppointment } from '@/lib/api/types';
import { patientClient } from '@/lib/api/patientClient';
import { providerClient } from '@/lib/api/providerClient';

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

interface Appointment extends Omit<ApiAppointment, 'scheduledFor'> {
  scheduledFor: string;
}

interface AppointmentListProps {
  userRole?: 'PATIENT' | 'PROVIDER' | 'ADMIN';
  onView?: (appointment: Appointment) => void;
  onEdit?: (appointment: Appointment) => void;
  refreshTrigger?: number;
  statusFilter?: string;
}

interface QueryParams {
  page: number;
  limit: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export default function AppointmentList({ 
  userRole = 'PATIENT', 
  onView, 
  onEdit,
  refreshTrigger = 0,
  statusFilter = '',
}: AppointmentListProps) {
  const { user } = useUser();
  const toast = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters
  const [internalStatusFilter, setInternalStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date range filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  // Use either the provided status filter or the internal one
  const effectiveStatusFilter = statusFilter || internalStatusFilter;

  // Fetch appointments
  const fetchAppointments = async () => {
    // Return early if no user is logged in
    if (!user?.id) return;

    try {
      setLoading(true);
      setError('');
      
      // Build query parameters
      const params: QueryParams = {
        page: page + 1, // API is 1-indexed
        limit: rowsPerPage,
      };
      
      // Handle comma-separated status values
      if (effectiveStatusFilter) {
        // For API calls, we can't send comma-separated values directly
        // We'll filter the results client-side instead
        if (!effectiveStatusFilter.includes(',')) {
          params.status = effectiveStatusFilter;
        }
      }
      
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      let response;
      if (userRole === 'PATIENT') {
        // For patients, we need to get their appointments through the patient client
        // Use the Clerk user ID
        try {
          response = await patientClient.getAppointment(user.id);
        } catch (err) {
          // Silently handle the failure with an empty response
          console.warn('Failed to fetch appointments, defaulting to empty list:', err);
          response = {
            status: 'success',
            data: {
              items: []
            }
          };
        }
      } else {
        // For both providers and admins, we use the provider client
        response = await providerClient.getAppointments(params);
      }
      
      console.log('Appointments response:', response);
      
      // Handle raw response directly - this means the actual API returned object
      // Check if response has items array directly or is wrapped in status/data structure
      if (response && ((response as any).items || response.status === 'success')) {
        let appointmentsData: any[] = [];
        let totalCount = 0;
        
        // Case 1: Direct response with items array
        if ((response as any).items) {
          appointmentsData = (response as any).items;
          totalCount = (response as any).totalCount || 0;
          
          if ((response as any).pagination && (response as any).pagination.total) {
            totalCount = (response as any).pagination.total;
          }
        }
        // Case 2: Response wrapped in success/data structure
        else if (response.status === 'success' && response.data) {
          if (response.data.items && Array.isArray(response.data.items)) {
            appointmentsData = response.data.items;
            totalCount = response.data.totalCount || 0;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            appointmentsData = response.data.data;
            totalCount = response.data.totalCount || 0;
          } else if (Array.isArray(response.data)) {
            appointmentsData = response.data;
            totalCount = appointmentsData.length;
          } else if (response.data.pagination) {
            if (Array.isArray(response.data.data)) {
              appointmentsData = response.data.data;
            } else if (Array.isArray(response.data.items)) {
              appointmentsData = response.data.items;
            }
            totalCount = response.data.pagination.total || 0;
          }
        }
        
        // If we have valid data (even empty array), proceed
        // Empty array (length 0) is valid - it means no appointments
        // Convert Date types to string if needed
        const formattedAppointments = appointmentsData.map((apt: ApiAppointment): Appointment => ({
          ...apt,
          scheduledFor: typeof apt.scheduledFor === 'string' 
            ? apt.scheduledFor 
            : (apt.scheduledFor as Date).toISOString()
        }));
        
        setAppointments(formattedAppointments);
        setTotalCount(totalCount);
      } else {
        // Handle error response
        const errorMessage = 
          response?.error?.message || 
          (response?.data?.error?.message) || 
          'Failed to load appointments';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      
      // Don't show error messages for 404 errors or network issues
      if (error instanceof Error && 
          (error.message.includes('404') || 
           error.message.includes('Network Error') ||
           error.message.includes('Failed to fetch') ||
           (error as any)?.response?.status === 404)) {
        console.warn('Appointment endpoint not available, showing empty list');
      } else {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to load appointments. Please try again.';
        
        setError(errorMessage);
        toast.showError(errorMessage);
      }
      
      // Initialize with empty data
      setAppointments([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when filters or pagination changes
  useEffect(() => {
    fetchAppointments();
  }, [page, rowsPerPage, effectiveStatusFilter, startDate, endDate, user?.id, refreshTrigger, userRole]);

  // Handle page change
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle status filter change
  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    // Only change internal filter if no external filter is provided
    if (!statusFilter) {
      setInternalStatusFilter(event.target.value);
      setPage(0);
    }
  };

  // Handle search query change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Handle date filter changes
  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(event.target.value);
    setPage(0);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(event.target.value);
    setPage(0);
  };

  // Apply search filter and status filter to appointments (client-side)
  const filteredAppointments = appointments.filter((appointment) => {
    // First apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        (appointment.reason && appointment.reason.toLowerCase().includes(query)) ||
        (appointment.providerName && appointment.providerName.toLowerCase().includes(query)) ||
        (appointment.patientName && appointment.patientName.toLowerCase().includes(query)) ||
        (typeMap[appointment.type] && typeMap[appointment.type].toLowerCase().includes(query))
      );
      
      if (!matchesSearch) return false;
    }
    
    // Then apply comma-separated status filter if needed
    if (effectiveStatusFilter && effectiveStatusFilter.includes(',')) {
      const statusValues = effectiveStatusFilter.split(',');
      return statusValues.includes(appointment.status);
    }
    
    return true;
  });

  // Confirm deletion of appointment
  const handleOpenDeleteDialog = (appointmentId: string) => {
    setAppointmentToDelete(appointmentId);
    setDeleteDialogOpen(true);
  };

  // Cancel deletion
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setAppointmentToDelete(null);
  };

  // Confirm and process deletion
  const handleConfirmDelete = async () => {
    if (!appointmentToDelete) return;
    
    try {
      setLoading(true);
      setError('');
      
      let response;
      if (userRole === 'PATIENT') {
        response = await patientClient.deleteAppointment(appointmentToDelete);
      } else {
        // For both providers and admins, we use the provider client
        response = await providerClient.updateAppointment(appointmentToDelete, { status: 'CANCELLED' });
      }
      
      if (response.status === 'success') {
        toast.showSuccess('Appointment cancelled successfully');
        // Refresh appointments after deletion
        fetchAppointments();
      } else {
        throw new Error(response.error?.message || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to cancel appointment. Please try again.';
      
      setError(errorMessage);
      toast.showError(errorMessage);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {userRole === 'PATIENT' ? 'My Appointments' : 
           userRole === 'PROVIDER' ? 'Patient Appointments' : 
           'All Appointments'}
        </Typography>

        {/* Filters */}
        <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ flexGrow: 1, minWidth: '200px' }}
          />
          
          <FormControl size="small" sx={{ minWidth: '150px' }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              id="status-filter"
              value={effectiveStatusFilter && effectiveStatusFilter.includes(',') ? '' : effectiveStatusFilter}
              label="Status"
              onChange={handleStatusFilterChange}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="SCHEDULED">Scheduled</MenuItem>
              <MenuItem value="CONFIRMED">Confirmed</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
              <MenuItem value="RESCHEDULED">Rescheduled</MenuItem>
              <MenuItem value="NO_SHOW">No Show</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate}
            onChange={handleStartDateChange}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: '100%', sm: '150px' } }}
          />
          
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={handleEndDateChange}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: '100%', sm: '150px' } }}
          />
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={fetchAppointments}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {loading && !appointments.length ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date & Time</TableCell>
                    {userRole !== 'PATIENT' && <TableCell>Patient</TableCell>}
                    {userRole !== 'PROVIDER' && <TableCell>Provider</TableCell>}
                    <TableCell>Type</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No appointments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body2">
                              {format(new Date(appointment.scheduledFor), 'MMM dd, yyyy')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(appointment.scheduledFor), 'h:mm a')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDistanceToNow(new Date(appointment.scheduledFor), { addSuffix: true })}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        {userRole !== 'PATIENT' && (
                          <TableCell>{appointment.patientName || 'Unknown Patient'}</TableCell>
                        )}
                        
                        {userRole !== 'PROVIDER' && (
                          <TableCell>{appointment.providerName || 'Unknown Provider'}</TableCell>
                        )}
                        
                        <TableCell>{typeMap[appointment.type] || appointment.type}</TableCell>
                        
                        <TableCell>
                          <Tooltip title={appointment.reason}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: { xs: '100px', sm: '150px', md: '200px' },
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {appointment.reason}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            label={statusMap[appointment.status]?.label || appointment.status}
                            color={statusMap[appointment.status]?.color || 'default'}
                            size="small"
                          />
                        </TableCell>
                        
                        <TableCell align="right">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => onView && onView(appointment)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {/* Only allow editing for upcoming appointments */}
                          {['SCHEDULED', 'CONFIRMED'].includes(appointment.status) && onEdit && (
                            <Tooltip title="Edit Appointment">
                              <IconButton
                                size="small"
                                onClick={() => onEdit(appointment)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {/* Only allow cancellation for upcoming appointments */}
                          {['SCHEDULED', 'CONFIRMED'].includes(appointment.status) && (
                            <Tooltip title="Cancel Appointment">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDeleteDialog(appointment.id)}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        fullWidth
        maxWidth="sm"
        aria-labelledby="appointment-cancel-dialog-title"
        disableEnforceFocus
      >
        <DialogTitle id="appointment-cancel-dialog-title">Cancel Appointment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>No, Keep It</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Yes, Cancel Appointment
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
} 