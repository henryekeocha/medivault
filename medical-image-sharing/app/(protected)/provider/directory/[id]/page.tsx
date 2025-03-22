'use client';

import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Box, 
  Avatar, 
  Divider, 
  Button, 
  Rating, 
  Chip, 
  List, 
  ListItem, 
  ListItemIcon,  
  ListItemText,
  Paper,
  Skeleton,
  Alert,
  Tab,
  Tabs
} from '@mui/material';
import { 
  Person, 
  Phone, 
  Email, 
  LocationOn, 
  School, 
  Work, 
  CalendarMonth, 
  Star,
  ArrowBack,
  VerifiedUser,
  LocalHospital
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { ApiClient } from '@/lib/api/client';
import { ProviderSpecialty } from '@prisma/client';

interface Provider {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  specialty?: ProviderSpecialty;
  bio?: string;
  credentials?: {
    education?: string[];
    certifications?: string[];
    experience?: string;
  };
  imageUrl?: string;
  rating?: number;
  availability?: string[];
  verified?: boolean;
}

export default function ProviderDetails() {
  const router = useRouter();
  const params = useParams();
  const providerId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!providerId) return;
    fetchProviderDetails();
  }, [providerId]);

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getUser(providerId);
      
      if (response.status === 'success' && response.data) {
        setProvider(response.data);
      } else {
        setError('Failed to fetch provider details');
      }
    } catch (error) {
      console.error('Error fetching provider details:', error);
      setError('An error occurred while fetching provider details');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 1 }} />
          <Skeleton variant="text" width={120} height={40} />
        </Box>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Skeleton variant="circular" width={100} height={100} />
            <Box sx={{ ml: 3 }}>
              <Skeleton variant="text" width={200} height={40} />
              <Skeleton variant="text" width={150} height={30} />
              <Skeleton variant="text" width={100} height={24} />
            </Box>
          </Box>
          
          <Skeleton variant="text" width="90%" height={60} />
          <Skeleton variant="text" width="95%" height={20} />
          <Skeleton variant="text" width="85%" height={20} />
        </Paper>
        
        <Skeleton variant="rectangular" width="100%" height={400} />
      </Container>
    );
  }

  if (error || !provider) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={handleGoBack}
          sx={{ mb: 3 }}
        >
          Back to Directory
        </Button>
        
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Provider not found'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={handleGoBack}
        sx={{ mb: 3 }}
      >
        Back to Directory
      </Button>
      
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
          <Avatar 
            sx={{ width: 120, height: 120, bgcolor: 'primary.main', mb: { xs: 2, md: 0 } }}
            src={provider.imageUrl}
          >
            <Person fontSize="large" />
          </Avatar>
          
          <Box sx={{ ml: { xs: 0, md: 3 }, textAlign: { xs: 'center', md: 'left' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <Typography variant="h4" component="h1" sx={{ mr: 1 }}>
                {provider.name}
              </Typography>
              
              {provider.verified && (
                <Chip 
                  icon={<VerifiedUser fontSize="small" />} 
                  label="Verified" 
                  color="primary" 
                  size="small"
                  sx={{ mt: { xs: 1, md: 0 } }}
                />
              )}
            </Box>
            
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {provider.specialty?.replace(/_/g, ' ') || 'General Provider'}
            </Typography>
            
            {provider.rating !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                <Rating 
                  value={provider.rating} 
                  precision={0.5} 
                  readOnly 
                />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {provider.rating.toFixed(1)} / 5
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
        
        {provider.bio && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body1">
              {provider.bio}
            </Typography>
          </Box>
        )}
      </Paper>
      
      <Box sx={{ mb: 4 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="provider details tabs">
          <Tab label="Contact Information" />
          <Tab label="Credentials & Experience" />
          <Tab label="Availability" />
        </Tabs>
        
        <Box sx={{ p: 3, border: 1, borderColor: 'divider', borderTop: 0 }}>
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Contact Details
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <Email />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Email" 
                          secondary={provider.email} 
                        />
                      </ListItem>
                      
                      {provider.phone && (
                        <ListItem>
                          <ListItemIcon>
                            <Phone />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Phone" 
                            secondary={provider.phone} 
                          />
                        </ListItem>
                      )}
                      
                      {provider.address && (
                        <ListItem>
                          <ListItemIcon>
                            <LocationOn />
                          </ListItemIcon>
                          <ListItemText 
                            primary="Address" 
                            secondary={provider.address} 
                          />
                        </ListItem>
                      )}
                    </List>
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                      <Button 
                        variant="contained" 
                        color="primary"
                        startIcon={<CalendarMonth />}
                        onClick={() => router.push(`/appointments/new?providerId=${provider.id}` as any)}
                      >
                        Schedule Appointment
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Specialties
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                      <Chip 
                        icon={<LocalHospital />} 
                        label={provider.specialty?.replace(/_/g, ' ') || 'General Medicine'} 
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          
          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Education & Certifications
                    </Typography>
                    
                    {provider.credentials?.education && provider.credentials.education.length > 0 && (
                      <>
                        <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
                          Education
                        </Typography>
                        <List dense>
                          {provider.credentials.education.map((edu, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <School />
                              </ListItemIcon>
                              <ListItemText primary={edu} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                    
                    {provider.credentials?.certifications && provider.credentials.certifications.length > 0 && (
                      <>
                        <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
                          Certifications
                        </Typography>
                        <List dense>
                          {provider.credentials.certifications.map((cert, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <VerifiedUser />
                              </ListItemIcon>
                              <ListItemText primary={cert} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Professional Experience
                    </Typography>
                    
                    {provider.credentials?.experience ? (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body1">
                          {provider.credentials.experience}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No experience information available
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          
          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Availability
                    </Typography>
                    
                    {provider.availability && provider.availability.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                        {provider.availability.map((slot, index) => (
                          <Chip 
                            key={index}
                            icon={<CalendarMonth />}
                            label={slot}
                            sx={{ m: 0.5 }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No availability information provided. Please contact the provider directly.
                      </Typography>
                    )}
                    
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                      <Button 
                        variant="contained" 
                        color="primary"
                        startIcon={<CalendarMonth />}
                        onClick={() => router.push(`/appointments/new?providerId=${provider.id}` as any)}
                      >
                        Schedule Appointment
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      </Box>
    </Container>
  );
} 