'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Dialog,
  DialogContent,
  useMediaQuery,
  Theme,
  Alert,
  Button,
} from '@mui/material';
import { MedicalRecordsList } from '@/components/medical-records/MedicalRecordsList';
import { MedicalRecordDetail } from '@/components/medical-records/MedicalRecordDetail';
import { MedicalRecord } from '@/lib/api/types';
import { useUser } from '@clerk/nextjs';
import { withProtectedRoute } from '@/components/ProtectedRoute';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { patientClient } from '@/lib/api/patientClient';
import { LoadingState } from '@/components/LoadingState';
import RefreshIcon from '@mui/icons-material/Refresh';

function PatientMedicalRecordsPage() {
  const { user, isLoaded } = useUser();
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md')); 
  const { error, loading, withErrorHandling, clearError } = useErrorHandler({ 
    context: 'Patient Records', 
    showToastByDefault: true 
  });

  const fetchRecords = async () => {
    const response = await patientClient.getMedicalRecords();
    if (response.status === 'success' && response.data) {
      setRecords(response.data.data);
    } else {
      throw new Error(response.error?.message || 'Failed to fetch medical records');
    }
  };

  useEffect(() => {
    withErrorHandling(fetchRecords).catch((error: Error) => {
      console.error('Error loading medical records:', error);
    });
  }, [withErrorHandling]);

  const handleRecordClick = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
  };

  const handleRetryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    withErrorHandling(fetchRecords).catch((error: Error) => {
      console.error('Error reloading medical records:', error);
    });
  };

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Medical Records
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          View and download your complete medical history
        </Typography>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRetryClick}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <LoadingState message="Loading medical records..." />
      ) : (
        <Paper sx={{ p: 0, overflow: 'hidden' }}>
          <MedicalRecordsList
            onRecordClick={handleRecordClick}
          />
        </Paper>
      )}

      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDialog}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          {selectedRecord && (
            <MedicalRecordDetail
              record={selectedRecord}
              onClose={handleCloseDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}

export default withProtectedRoute(PatientMedicalRecordsPage); 