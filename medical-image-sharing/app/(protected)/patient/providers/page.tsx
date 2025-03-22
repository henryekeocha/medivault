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
import { ApiClient } from '@/lib/api/client';

// Extend the ApiClient interface to include the missing methods
declare module '@/lib/api/client' {
  interface ApiClient {
    get(url: string): Promise<{
      ok: boolean;
      json: () => Promise<any>;
    }>;
    
    post(url: string, data: any): Promise<{
      ok: boolean;
      json: () => Promise<any>;
    }>;
  }
}

interface Provider {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  rating: number;
  reviewCount: number;
  status: 'active' | 'pending' | 'inactive';
  lastVisit?: string;
  nextAppointment?: string;
}

export default function PatientProvidersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    type: 'info',
  });
  
  // Add new provider dialog
  const [addProviderDialog, setAddProviderDialog] = useState(false);
  const [providerCode, setProviderCode] = useState('');
  const [addingProvider, setAddingProvider] = useState(false);

  // Fetch providers on component mount
  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.get('/api/patient/providers');
      
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch providers');
      }
    } catch (err) {
      setError('An error occurred while fetching providers. Please try again later.');
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
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
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.post('/api/patient/providers/add', {
        providerCode: providerCode.trim(),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Add the new provider to the list
        setProviders([...providers, data.provider]);
        setAddProviderDialog(false);
        setProviderCode('');
        setNotification({
          open: true,
          message: 'Provider added successfully',
          type: 'success',
        });
      } else {
        const errorData = await response.json();
        setNotification({
          open: true,
          message: errorData.message || 'Failed to add provider',
          type: 'error',
        });
      }
    } catch (err) {
      setNotification({
        open: true,
        message: 'An error occurred. Please try again later.',
        type: 'error',
      });
      console.error('Error adding provider:', err);
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

  // Filter providers based on search term
  const filteredProviders = providers.filter(provider => 
    provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.hospital.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Healthcare Providers
      </Typography>

      {/* Search Bar */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          label="Search Providers"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            endAdornment: <SearchIcon color="action" />,
          }}
        />
      </Box>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredProviders.length > 0 ? (
        <Paper sx={{ mb: 4, p: 0 }}>
          <List>
            {filteredProviders.map((provider) => (
              <ListItem
                key={provider.id}
                alignItems="flex-start"
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': {
                    borderBottom: 'none',
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: 'primary.main',
                      fontSize: '1.5rem',
                    }}
                  >
                    {provider.name.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{provider.name}</Typography>
                      <Chip
                        size="small"
                        label={provider.status}
                        color={provider.status === 'active' ? 'success' : 'default'}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {provider.specialty} at {provider.hospital}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Rating
                          value={provider.rating}
                          precision={0.5}
                          size="small"
                          readOnly
                        />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          ({provider.reviewCount} reviews)
                        </Typography>
                      </Box>
                      {provider.lastVisit && (
                        <Typography variant="body2" color="text.secondary">
                          Last visit: {provider.lastVisit}
                        </Typography>
                      )}
                      {provider.nextAppointment && (
                        <Typography
                          variant="body2"
                          sx={{ color: 'primary.main', mt: 0.5 }}
                        >
                          Next appointment: {provider.nextAppointment}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  <IconButton
                    color="primary"
                    onClick={() => handleMessage(provider.id)}
                  >
                    <MessageIcon />
                  </IconButton>
                  <IconButton
                    color="primary"
                    onClick={() => handleSchedule(provider.id)}
                  >
                    <CalendarIcon />
                  </IconButton>
                  <IconButton
                    color="primary"
                    onClick={() => handleShare(provider.id)}
                  >
                    <ShareIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center', mb: 4 }}>
          <Typography variant="body1" color="text.secondary">
            {searchTerm ? 'No providers match your search criteria' : 'You have no healthcare providers yet'}
          </Typography>
        </Paper>
      )}

      {/* Add New Provider Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="outlined"
          color="primary"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => setAddProviderDialog(true)}
        >
          Add New Provider
        </Button>
      </Box>

      {/* Add Provider Dialog */}
      <Dialog open={addProviderDialog} onClose={() => !addingProvider && setAddProviderDialog(false)}>
        <DialogTitle>Add a New Provider</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the provider code given to you by your healthcare provider to connect with them.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Provider Code"
            fullWidth
            variant="outlined"
            value={providerCode}
            onChange={(e) => setProviderCode(e.target.value)}
            disabled={addingProvider}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setAddProviderDialog(false)} 
            disabled={addingProvider}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddProvider} 
            variant="contained" 
            disabled={addingProvider || !providerCode.trim()}
          >
            {addingProvider ? <CircularProgress size={24} /> : 'Add Provider'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.type} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
} 