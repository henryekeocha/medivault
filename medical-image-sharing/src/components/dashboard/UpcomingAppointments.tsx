import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  Chip, 
  CircularProgress, 
  Button,
  Avatar,
  ListItemAvatar,
  Skeleton,
  useTheme,
  Alert
} from '@mui/material';
import { 
  CalendarMonth as CalendarIcon, 
  ChevronRight as ChevronRightIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { providerClient } from '@/lib/api';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';

// Mapping for appointment status display
const statusMap: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  SCHEDULED: { label: 'Scheduled', color: 'primary' },
  CONFIRMED: { label: 'Confirmed', color: 'success' },
  COMPLETED: { label: 'Completed', color: 'secondary' },
  CANCELLED: { label: 'Cancelled', color: 'error' },
  RESCHEDULED: { label: 'Rescheduled', color: 'warning' },
  NO_SHOW: { label: 'No Show', color: 'error' },
};

interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  patientName?: string;
  providerName?: string;
  scheduledFor: string | Date;
  reason: string;
  notes?: string;
  status: string;
  type?: string;
  patientProfileImage?: string;
}

interface UpcomingAppointmentsProps {
  providerId: string;
  limit?: number;
  loading?: boolean;
}

const UpcomingAppointments: React.FC<UpcomingAppointmentsProps> = ({ 
  providerId, 
  limit = 5,
  loading: externalLoading
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const { error, handleError, clearError } = useErrorHandler({
    context: 'Upcoming Appointments',
    showToastByDefault: true
  });

  useEffect(() => {
    fetchAppointments();
    
    // Refresh appointments every 5 minutes
    const interval = setInterval(() => {
      fetchAppointments();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [providerId, limit]);

  const fetchAppointments = async () => {
    if (!providerId) return;
    
    try {
      setLoading(true);
      clearError();
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch upcoming appointments
      const response = await providerClient.getAppointments({
        status: 'SCHEDULED,CONFIRMED',
        startDate: today,
        limit: limit,
      });
      
      if (response.status === 'success') {
        setAppointments(response.data.data);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      handleError(err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    router.push('/provider/appointments');
  };

  const handleViewAppointment = (appointmentId: string) => {
    router.push(`/provider/appointments/${appointmentId}`);
  };

  const renderSkeleton = () => (
    <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
      {[...Array(limit)].map((_, index) => (
        <React.Fragment key={index}>
          <ListItem alignItems="flex-start">
            <ListItemAvatar>
              <Skeleton variant="circular" width={40} height={40} />
            </ListItemAvatar>
            <ListItemText
              primary={<Skeleton variant="text" width="60%" />}
              secondary={
                <>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="40%" />
                </>
              }
            />
          </ListItem>
          {index < limit - 1 && <Divider variant="inset" component="li" />}
        </React.Fragment>
      ))}
    </List>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 2,
        boxShadow: theme.shadows[2],
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color="text.secondary">
          Upcoming Appointments
        </Typography>
        <CalendarIcon color="primary" />
      </Box>

      {loading ? (
        renderSkeleton()
      ) : error ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Alert 
            severity="error" 
            action={
              <Button 
                color="inherit" 
                size="small" 
                startIcon={<RefreshIcon />}
                onClick={() => fetchAppointments()}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      ) : appointments.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">No upcoming appointments</Typography>
        </Box>
      ) : (
        <>
          <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
            {appointments.map((appointment, index) => (
              <React.Fragment key={appointment.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleViewAppointment(appointment.id)}
                >
                  <ListItemAvatar>
                    <Avatar src={appointment.patientProfileImage} alt={appointment.patientName}>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2">
                          {appointment.patientName || 'Unknown Patient'}
                        </Typography>
                        <Chip
                          label={statusMap[appointment.status]?.label || appointment.status}
                          color={statusMap[appointment.status]?.color || 'default'}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <TimeIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.875rem', color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" component="span">
                            {format(new Date(appointment.scheduledFor), 'MMM dd, yyyy • h:mm a')}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            mt: 0.5
                          }}
                        >
                          {appointment.reason}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < appointments.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
          
          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Button
              endIcon={<ChevronRightIcon />}
              onClick={handleViewAll}
              fullWidth
            >
              View All Appointments
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default UpcomingAppointments; 