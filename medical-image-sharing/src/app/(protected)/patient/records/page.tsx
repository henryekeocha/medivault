'use client';

import React, { useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { withProtectedRoute } from '@/components/ProtectedRoute';
import { useErrorHandler } from '@/hooks/useErrorHandler';

function PatientMedicalRecordsPage() {
  const { user } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md')); 
  const { error, clearError } = useErrorHandler({ 
    context: 'Patient Records', 
    showToastByDefault: true 
  });

  const handleRecordClick = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDetailDialogOpen(false);
  };

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
          onClose={clearError}
        >
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        <MedicalRecordsList
          patientId={user?.id}
          onRecordClick={handleRecordClick}
        />
      </Paper>

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