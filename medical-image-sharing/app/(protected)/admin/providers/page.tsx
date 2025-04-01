'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  useTheme,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Pagination,
} from '@mui/material';
import {
  Person as PersonIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import { adminClient } from '@/lib/api/adminClient';
import { useRouter } from 'next/navigation';
import { routes } from '@/config/routes';

export default function AdminProvidersPage() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialty, setSpecialty] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [providers, setProviders] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProviders() {
      try {
        setLoading(true);
        
        // Fetch providers from the backend using the API client
        const response = await adminClient.getProviders({ 
          page,
          limit: 10,
          search: searchQuery || undefined,
          specialty: specialty || undefined
        });
        
        if (response.status === 'success') {
          setProviders(response.data.data || []);
          setTotalPages(Math.ceil((response.data.pagination?.total || 0) / 10));
        } else {
          throw new Error(response.error?.message || 'Failed to fetch providers');
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching providers:', err);
        setError('Failed to load providers. Please try again later.');
        setProviders([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProviders();
  }, [page, searchQuery, specialty]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(1); // Reset to first page when search changes
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleViewProvider = (id: string) => {
    router.push(routes.admin.providersView(id));
  };

  const handleEditProvider = (id: string) => {
    router.push(routes.admin.providersEdit(id));
  };

  const handleDeleteProvider = (id: string) => {
    // In a real application, this would show a confirmation dialog before deleting
    console.log(`Delete provider with ID: ${id}`);
  };

  if (loading && providers.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ fontSize: 32, mr: 2 }} />
          <Typography variant="h4" component="h1">
            Providers
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push(routes.admin.providersAdd)}
        >
          Add Provider
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4, mx: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ px: 3 }}>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search providers by name, email or specialty"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Provider</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Specialty</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Patients</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {providers.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No providers found
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar src={provider.image} alt={provider.name} sx={{ mr: 2 }}>
                          {provider.name?.charAt(0) || 'P'}
                        </Avatar>
                        <Box>
                          <Typography variant="body1">
                            {provider.name}
                            {provider.isVerified && (
                              <VerifiedIcon 
                                fontSize="small" 
                                color="primary" 
                                sx={{ ml: 1, verticalAlign: 'middle' }} 
                              />
                            )}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{provider.email}</TableCell>
                    <TableCell>{provider.specialty || 'General'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={provider.isActive ? "Active" : "Inactive"} 
                        color={provider.isActive ? "success" : "error"} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{provider.patientCount || 0}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleViewProvider(provider.id)}
                        sx={{ mr: 1 }}
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEditProvider(provider.id)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteProvider(provider.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange} 
              color="primary" 
            />
          </Box>
        )}
      </Box>
    </Box>
  );
} 