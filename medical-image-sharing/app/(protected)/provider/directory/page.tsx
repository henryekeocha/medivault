'use client';

import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Button,
  Box,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Chip,
  Avatar,
  Rating,
  Pagination,
  Skeleton,
  Alert
} from '@mui/material';
import { Person, CalendarMonth, Search } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { providerClient } from '@/lib/api/providerClient';
import { ProviderSpecialty, Role } from '@prisma/client';

// Define interfaces
interface Provider {
  id: string;
  name: string;
  email: string;
  role: Role;
  specialty?: string;
  bio?: string;
  rating?: number;
  imageUrl?: string;
  availability?: string[];
}

interface ProviderDirectoryState {
  providers: Provider[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  specialty: string;
  page: number;
  totalPages: number;
}

const specialtyOptions = Object.values(ProviderSpecialty).map(specialty => ({
  value: specialty,
  label: specialty.replace(/_/g, ' ')
}));

export default function ProviderDirectory() {
  const router = useRouter();
  const [state, setState] = useState<ProviderDirectoryState>({
    providers: [],
    loading: true,
    error: null,
    searchTerm: '',
    specialty: '',
    page: 1,
    totalPages: 1
  });

  const fetchProviders = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const params = {
        page: state.page,
        limit: 10,
        search: state.searchTerm || undefined,
        specialty: state.specialty || undefined,
        role: Role.PROVIDER
      };
      
      const response = await providerClient.getProviders(params);
      
      if (response.status === 'success' && response.data) {
        setState(prev => ({ 
          ...prev, 
          providers: response.data.data || [],
          totalPages: response.data.pagination?.pages || 1,
          loading: false 
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to fetch providers', 
          loading: false 
        }));
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'An error occurred while fetching providers', 
        loading: false 
      }));
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [state.page, state.specialty]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProviders();
  };

  const handleViewProfile = (id: string) => {
    router.push(`/provider/directory/${id}`);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setState(prev => ({ ...prev, page }));
  };

  const handleSpecialtyChange = (e: SelectChangeEvent<string>) => {
    setState(prev => ({ 
      ...prev, 
      specialty: e.target.value,
      page: 1 // Reset to first page on filter change
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, searchTerm: e.target.value }));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Provider Directory
      </Typography>
      
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="Search Providers"
              variant="outlined"
              value={state.searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                endAdornment: <Search color="action" />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="specialty-select-label">Specialty</InputLabel>
              <Select
                labelId="specialty-select-label"
                label="Specialty"
                value={state.specialty}
                onChange={handleSpecialtyChange}
              >
                <MenuItem value="">All Specialties</MenuItem>
                {specialtyOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button 
              fullWidth 
              variant="contained" 
              color="primary" 
              type="submit"
              size="large"
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Box>

      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {state.error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {state.loading ? (
          // Skeleton loaders
          Array.from(new Array(6)).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={60} height={60} />
                    <Box sx={{ ml: 2 }}>
                      <Skeleton variant="text" width={120} height={30} />
                      <Skeleton variant="text" width={80} height={20} />
                    </Box>
                  </Box>
                  <Skeleton variant="text" width="90%" />
                  <Skeleton variant="text" width="70%" />
                  <Box sx={{ mt: 2 }}>
                    <Skeleton variant="text" width={100} height={24} />
                    <Skeleton variant="text" width={180} height={24} />
                  </Box>
                </CardContent>
                <CardActions>
                  <Skeleton variant="rectangular" width={120} height={36} />
                </CardActions>
              </Card>
            </Grid>
          ))
        ) : state.providers.length === 0 ? (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No providers found matching your criteria
              </Typography>
            </Box>
          </Grid>
        ) : (
          // Provider cards
          state.providers.map(provider => (
            <Grid item xs={12} sm={6} md={4} key={provider.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}
                      src={provider.imageUrl}
                    >
                      <Person fontSize="large" />
                    </Avatar>
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6" component="div">
                        {provider.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {provider.specialty ? provider.specialty.replace(/_/g, ' ') : 'General Provider'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {provider.bio && (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {provider.bio.length > 120 
                        ? `${provider.bio.substring(0, 120)}...` 
                        : provider.bio}
                    </Typography>
                  )}
                  
                  {provider.rating !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Rating 
                        value={provider.rating} 
                        precision={0.5} 
                        readOnly 
                        size="small"
                      />
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {provider.rating.toFixed(1)}
                      </Typography>
                    </Box>
                  )}
                  
                  {provider.availability && provider.availability.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        Availability:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {provider.availability.map((slot, index) => (
                          <Chip 
                            key={index}
                            size="small"
                            label={slot}
                            icon={<CalendarMonth fontSize="small" />}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => handleViewProfile(provider.id)}
                    variant="outlined"
                  >
                    View Profile
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
      
      {!state.loading && state.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination 
            count={state.totalPages} 
            page={state.page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Container>
  );
} 