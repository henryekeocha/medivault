'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  InputAdornment,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions, 
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api/client';
import { User, Patient } from '@/lib/api/types';

export default function PatientsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    fetchPatients();
  }, [page, filterStatus]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getPatients({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchQuery || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      
      if (response.status === 'success') {
        setPatients(response.data.data.map(user => user as unknown as Patient));
        setTotalPages(Math.ceil(response.data.pagination.total / ITEMS_PER_PAGE));
      } else {
        setError('Failed to load patients');
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('An error occurred while fetching patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1); // Reset to first page when searching
    fetchPatients();
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterStatus(event.target.value);
    setPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleViewPatient = (patientId: string) => {
    router.push(`/provider/patients/${patientId}`);
  };

  const handleEditPatient = (patientId: string) => {
    router.push(`/provider/patients/edit/${patientId}`);
  };

  const handleAddPatient = () => {
    router.push('/provider/patients/add');
  };

  const openDeleteDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedPatient(null);
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    
    try {
      setLoading(true);
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.deactivateUser(selectedPatient.id, 'Removed by provider');
      
      if (response.status === 'success') {
        // Remove patient from the list or refresh the list
        fetchPatients();
      } else {
        setError('Failed to delete patient');
      }
    } catch (err) {
      console.error('Error deleting patient:', err);
      setError('An error occurred while deleting the patient');
    } finally {
      setLoading(false);
      closeDeleteDialog();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          My Patients
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddPatient}
        >
          Add New Patient
        </Button>
      </Box>

      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search Patients"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 300 } }}
        />

        <TextField
          select
          label="Filter Status"
          value={filterStatus}
          onChange={handleFilterChange}
          variant="outlined"
          sx={{ width: { xs: '100%', sm: 200 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FilterIcon />
              </InputAdornment>
            ),
          }}
        >
          <MenuItem value="all">All Patients</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
        </TextField>

        <Button variant="outlined" onClick={handleSearch}>
          Search
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : patients.length === 0 ? (
        <Alert severity="info">
          No patients found. Try changing your search or filter criteria.
        </Alert>
      ) : (
        <>
          <Grid container spacing={3}>
            {patients.map((patient) => (
              <Grid item xs={12} sm={6} md={4} key={patient.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        {patient.firstName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {patient.firstName} {patient.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {patient.id.substring(0, 8)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={patient.status === 'ACTIVE' ? 'Active' : patient.status === 'INACTIVE' ? 'Inactive' : 'Pending'}
                        color={patient.status === 'ACTIVE' ? 'success' : patient.status === 'INACTIVE' ? 'error' : 'warning'}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      {patient.tags?.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" sx={{ mr: 1, mt: 1 }} />
                      ))}
                    </Box>

                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                      <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2">{patient.email}</Typography>
                    </Box>

                    {patient.phone && (
                      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">{patient.phone}</Typography>
                      </Box>
                    )}
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => handleViewPatient(patient.id)}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditPatient(patient.id)}
                    >
                      Edit
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Confirm Deactivation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to deactivate {selectedPatient?.firstName} {selectedPatient?.lastName}? This will remove them from your patient list.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeletePatient} color="error">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 