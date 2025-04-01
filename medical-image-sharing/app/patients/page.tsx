'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Box,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Message as MessageIcon,
  CalendarMonth as CalendarIcon,
  MedicalInformation as MedicalIcon,
} from '@mui/icons-material';
import { DataTable } from '@/components/DataTable';
import { withProtectedRoute } from '@/components/ProtectedRoute'; 
import { useToast } from '@/contexts/ToastContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { api } from '@/lib/api/api';
import { useRouter } from 'next/navigation';
import { Route } from 'next';
import { useUser } from '@clerk/nextjs';

interface Patient {
  id: string;
  name: string;
  email: string;
  dateOfBirth: string;
  lastVisit: string | null;
  status: 'active' | 'inactive';
  upcomingAppointment: string | null;
  medicalRecordCount: number;
}

function PatientsPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const toast = useToast();
  const router = useRouter();
  const { socket, onMessage } = useWebSocket();
  const { user } = useUser();

  const loadPatients = async () => {
    try {
      setLoading(true);
      const response = await api.get<{
        patients: Patient[];
        total: number;
      }>('/api/patients', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      setPatients(response.patients);
      setTotalCount(response.total);
    } catch (error) {
      toast.showError('Failed to load patients');
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();

    // Subscribe to real-time updates
    const unsubscribe = onMessage('patient_update', handlePatientUpdate);
    return () => {
      unsubscribe?.();
    };
  }, [page, rowsPerPage]);

  const handlePatientUpdate = (updatedPatient: Patient) => {
    setPatients(prevPatients =>
      prevPatients.map(patient =>
        patient.id === updatedPatient.id ? updatedPatient : patient
      )
    );
  };

  const columns = [
    { 
      id: 'name' as const, 
      label: 'Name', 
      minWidth: 170 
    },
    { 
      id: 'email' as const, 
      label: 'Email', 
      minWidth: 170 
    },
    {
      id: 'dateOfBirth' as const,
      label: 'Date of Birth',
      minWidth: 120,
      format: (value: string | number | null) => value ? new Date(value as string).toLocaleDateString() : 'N/A'
    },
    {
      id: 'lastVisit' as const,
      label: 'Last Visit',
      minWidth: 120,
      format: (value: string | number | null) => value ? new Date(value as string).toLocaleDateString() : 'Never'
    },
    {
      id: 'status' as const,
      label: 'Status',
      minWidth: 100,
      format: (value: string | number | null) => (
        <Chip
          label={value as string}
          color={value === 'active' ? 'success' : 'default'}
          size="small"
        />
      )
    },
    {
      id: 'upcomingAppointment' as const,
      label: 'Next Appointment',
      minWidth: 150,
      format: (value: string | number | null) => value ? new Date(value as string).toLocaleDateString() : 'None'
    },
    {
      id: 'medicalRecordCount' as const,
      label: 'Records',
      minWidth: 100,
      align: 'right' as const,
    }
  ];

  const rowActions = (row: Patient) => (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
      <Tooltip title="View Profile">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/patients/${row.id}` as Route);
          }}
        >
          <PersonIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Send Message">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/messages/new?patientId=${row.id}` as Route);
          }}
        >
          <MessageIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Schedule Appointment">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/appointments/new?patientId=${row.id}` as Route);
          }}
        >
          <CalendarIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Medical Records">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/patients/${row.id}/records` as Route);
          }}
        >
          <MedicalIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Patients
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonIcon />}
          onClick={() => router.push('/patients/new' as Route)}
        >
          Add Patient
        </Button>
      </Box>

      <DataTable
        columns={columns}
        data={patients}
        loading={loading}
        onRefresh={loadPatients}
        searchable
        onSearch={(query) => console.log('Search:', query)}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        totalCount={totalCount}
        rowActions={rowActions}
        onRowClick={(row) => router.push(`/patients/${row.id}` as Route)}
      />
    </Container>
  );
}

export default withProtectedRoute(PatientsPage, {
  allowedRoles: ['PROVIDER', 'ADMIN'],
  requireAuth: true,
}); 