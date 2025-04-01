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
} from '@mui/icons-material';
import { adminClient } from '@/lib/api/adminClient';
import { useRouter } from 'next/navigation';
import { routes } from '@/config/routes';

export default function AdminPatientsPage() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPatients() {
      try {
        setLoading(true);
        
        // In a real application, this would be an API call with search and pagination params
        const response = await adminClient.getUsers({ 
          role: 'PATIENT',
          page,
          limit: 10,
          search: searchQuery || undefined
        });
        
        if (response.status === 'success') {
          setPatients(response.data.data || []);
          setTotalPages(Math.ceil((response.data.pagination?.total || 0) / 10));
        } else {
          throw new Error(response.error?.message || 'Failed to fetch patients');
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching patients:', err);
        setError('Failed to load patients. Please try again later.');
        setPatients([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPatients();
  }, [page, searchQuery]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(1); // Reset to first page when search changes
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleViewPatient = (id: string) => {
    router.push(routes.admin.patientsView(id));
  };

  const handleEditPatient = (id: string) => {
    router.push(routes.admin.patientsEdit(id));
  };

  const handleDeletePatient = (id: string) => {
    // In a real application, this would show a confirmation dialog before deleting
    console.log(`Delete patient with ID: ${id}`);
  };

  if (loading && patients.length === 0) {
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
            Patients
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push(routes.admin.patientsAdd)}
        >
          Add Patient
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
              placeholder="Search patients by name or email"
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
                <TableCell>Patient</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {patients.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No patients found
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar src={patient.image} alt={patient.name} sx={{ mr: 2 }}>
                          {patient.name?.charAt(0) || 'P'}
                        </Avatar>
                        <Typography variant="body1">{patient.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={patient.isActive ? "Active" : "Inactive"} 
                        color={patient.isActive ? "success" : "error"} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(patient.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleViewPatient(patient.id)}
                        sx={{ mr: 1 }}
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEditPatient(patient.id)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePatient(patient.id)}
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