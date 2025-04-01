'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Box,
  Avatar,
  Rating,
  Chip,
  IconButton, 
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Message as MessageIcon,
  Share as ShareIcon,
  CalendarToday as CalendarIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { patientClient } from '@/lib/api/patientClient';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { User } from '@/lib/api/types';

interface ProviderMetadata {
  specialty: string;
  hospital: string;
  rating: number;
  reviewCount: number;
  status: 'active' | 'pending' | 'inactive';
  lastVisit?: string;
  nextAppointment?: string;
}

interface Provider extends User {
  providerMetadata: ProviderMetadata;
}

export default function PatientProvidersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const { error, loading, withErrorHandling, clearError } = useErrorHandler({
    context: 'Patient Providers',
    showToastByDefault: true
  });
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    type: 'info',
  });
  
  const [addProviderDialog, setAddProviderDialog] = useState(false);
  const [providerCode, setProviderCode] = useState('');
  const [addingProvider, setAddingProvider] = useState(false);

  // Fetch providers on component mount
  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await patientClient.getProviders();
      if (response?.status === 'success' && Array.isArray(response.data)) {
        // Transform User[] into Provider[] with default metadata
        const transformedProviders: Provider[] = response.data.map((user: User) => ({
          ...user,
          providerMetadata: {
            specialty: 'Not specified',
            hospital: 'Not specified',
            rating: 0,
            reviewCount: 0,
            status: 'active'
          }
        }));
        setProviders(transformedProviders);
      } else {
        // Handle empty or invalid response
        console.warn('Invalid provider data received:', response);
        setProviders([]);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      setProviders([]); // Ensure we always have an empty array in case of error
    }
  };

  const handleAddProvider = async () => {
    if (!providerCode.trim()) {
      setNotification({
        open: true,
        message: 'Please enter a provider code',
        type: 'error',
      });
      return;
    }
    
    setAddingProvider(true);
    try {
      const response = await patientClient.linkProvider(providerCode.trim());
      if (response.status === 'success') {
        const newProvider: Provider = {
          ...response.data,
          providerMetadata: {
            specialty: 'Not specified',
            hospital: 'Not specified',
            rating: 0,
            reviewCount: 0,
            status: 'active'
          }
        };
        setProviders([...providers, newProvider]);
        setAddProviderDialog(false);
        setProviderCode('');
        setNotification({
          open: true,
          message: 'Provider added successfully',
          type: 'success',
        });
      } else {
        throw new Error(response.error?.message || 'Failed to add provider');
      }
    } catch (error) {
      setNotification({
        open: true,
        message: error instanceof Error ? error.message : 'An error occurred. Please try again later.',
        type: 'error',
      });
    } finally {
      setAddingProvider(false);
    }
  };

  const handleMessage = (providerId: string) => {
    router.push(`/patient/messages?provider=${providerId}`);
  };

  const handleSchedule = (providerId: string) => {
    router.push(`/patient/appointments/schedule?provider=${providerId}`);
  };

  const handleShare = (providerId: string) => {
    router.push(`/patient/share?provider=${providerId}`);
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const handleCloseDialog = () => {
    setAddProviderDialog(false);
    setProviderCode('');
  };

  const handleOpenDialog = () => {
    setAddProviderDialog(true);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          My Providers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Add Provider
        </Button>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => clearError()}
            >
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <TextField
              fullWidth
              placeholder="Search providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Providers Grid */}
      <Grid container spacing={3}>
        {providers
          .filter(provider => 
            provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            provider.providerMetadata.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
            provider.providerMetadata.hospital.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((provider) => (
            <Grid item xs={12} sm={6} md={4} key={provider.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      {provider.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{provider.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {provider.providerMetadata.specialty}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {provider.providerMetadata.hospital}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Rating value={provider.providerMetadata.rating} readOnly size="small" />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      ({provider.providerMetadata.reviewCount} reviews)
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={provider.providerMetadata.status}
                      color={
                        provider.providerMetadata.status === 'active'
                          ? 'success'
                          : provider.providerMetadata.status === 'pending'
                          ? 'warning'
                          : 'error'
                      }
                      size="small"
                    />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<MessageIcon />}
                    onClick={() => handleMessage(provider.id)}
                  >
                    Message
                  </Button>
                  <Button
                    size="small"
                    startIcon={<CalendarIcon />}
                    onClick={() => handleSchedule(provider.id)}
                  >
                    Schedule
                  </Button>
                  <Button
                    size="small"
                    startIcon={<ShareIcon />}
                    onClick={() => handleShare(provider.id)}
                  >
                    Share
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
      </Grid>

      {/* Add Provider Dialog */}
      <Dialog open={addProviderDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add Provider</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter the provider code to connect with your healthcare provider.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="Provider Code"
            value={providerCode}
            onChange={(e) => setProviderCode(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleAddProvider}
            variant="contained"
            disabled={!providerCode.trim() || addingProvider}
          >
            {addingProvider ? <CircularProgress size={24} /> : 'Add Provider'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.type}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
} 