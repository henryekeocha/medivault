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
  Breadcrumbs,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
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
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { providerClient } from '@/lib/api/providerClient';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import Link from 'next/link';

interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  status: 'ACTIVE' | 'INACTIVE';
  contact: {
    email: string;
    phone?: string;
  };
}

interface PatientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  gender: string;
}

// Helper function to convert form data to API format
const convertFormDataToPatient = (formData: PatientFormData): Omit<Patient, 'id'> => {
  return {
    name: `${formData.firstName} ${formData.lastName}`.trim(),
    dateOfBirth: formData.dateOfBirth,
    gender: formData.gender,
    status: 'ACTIVE',
    contact: {
      email: formData.email,
      phone: formData.phone,
    },
  };
};

export default function PatientsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { showToast } = useToast();
  const { handleError, withErrorHandling, clearErrors } = useErrorHandler({
    context: 'Provider Patients',
    showToastByDefault: true
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
  });

  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      return;
    }

    // Check if user has provider role in metadata
    const userRole = user.publicMetadata.role;
    if (userRole !== 'PROVIDER') {
      return;
    }

    fetchPatients();
  }, [isLoaded, user, withErrorHandling]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await withErrorHandling(
        async () => providerClient.getPatients({
          page,
          limit: ITEMS_PER_PAGE,
          search: searchQuery,
          status: filterStatus === 'all' ? undefined : filterStatus
        }),
        { showToast: true }
      );
      
      if (response.status === 'success') {
        // Map User data to Patient type
        const patientData = response.data.data.map(user => ({
          id: user.id,
          name: user.name,
          dateOfBirth: user.birthdate || '',
          gender: user.gender || '',
          status: user.role === 'PATIENT' ? 'ACTIVE' : 'INACTIVE',
          contact: {
            email: user.email,
            phone: user.phoneNumber
          }
        }));
        const patientsWithCorrectStatus = patientData.map(patient => ({
          ...patient,
          status: patient.status as 'ACTIVE' | 'INACTIVE'
        }));
        setPatients(patientsWithCorrectStatus);
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

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterStatus(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
    setOpenDialog(true);
  };

  const closeDeleteDialog = () => {
    setOpenDialog(false);
    setSelectedPatient(null);
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    
    try {
      await withErrorHandling(
        async () => providerClient.deactivateUser(selectedPatient.id, 'Removed by provider'),
        { showToast: true }
      );
      showToast('Patient deactivated successfully', 'success');
      fetchPatients();
    } catch (err) {
      console.error('Error deleting patient:', err);
      setError('An error occurred while deleting the patient');
    } finally {
      closeDeleteDialog();
    }
  };

  const handleOpenDialog = (patient?: Patient) => {
    if (patient) {
      setSelectedPatient(patient);
      const [firstName, ...lastNameParts] = patient.name.split(' ');
      setFormData({
        firstName,
        lastName: lastNameParts.join(' '),
        email: patient.contact.email,
        phone: patient.contact.phone || '',
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
      });
    } else {
      setSelectedPatient(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      const patientData = convertFormDataToPatient(formData);
      
      if (selectedPatient) {
        await withErrorHandling(
          async () => providerClient.updatePatient(selectedPatient.id, patientData),
          { showToast: true }
        );
        showToast('Patient updated successfully', 'success');
      } else {
        await withErrorHandling(
          async () => providerClient.createPatient(formData),
          { showToast: true }
        );
        showToast('Patient created successfully', 'success');
      }
      handleCloseDialog();
      fetchPatients();
    } catch (error) {
      console.error('Error saving patient:', error);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPatient(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
    });
  };

  const filteredPatients = patients.filter((patient) =>
    Object.values(patient).some((value) =>
      value.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return null;
  }

  // Check if user has provider role in metadata
  const userRole = user.publicMetadata.role;
  if (userRole !== 'PROVIDER') {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link href="/provider/dashboard" passHref>
          <Typography color="inherit" sx={{ cursor: 'pointer' }}>Dashboard</Typography>
        </Link>
        <Typography color="text.primary">Patients</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Patients</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Patient
        </Button>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search patients..."
        value={searchQuery}
        onChange={handleSearch}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date of Birth</TableCell>
                <TableCell>Gender</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No patients found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>{patient.name}</TableCell>
                      <TableCell>{patient.contact.email}</TableCell>
                      <TableCell>{patient.contact.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={patient.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          color={patient.status === 'ACTIVE' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(patient.dateOfBirth).toLocaleDateString()}</TableCell>
                      <TableCell>{patient.gender}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleViewPatient(patient.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(patient)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => openDeleteDialog(patient)}
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
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredPatients.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedPatient ? 'Edit Patient' : 'Add New Patient'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Gender</InputLabel>
              <Select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                label="Gender"
                required
              >
                <MenuItem value="MALE">Male</MenuItem>
                <MenuItem value="FEMALE">Female</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedPatient ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}
    </Container>
  );
} 