'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Divider,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  FormControl,
  InputLabel,
  Select, 
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { patientClient } from '@/lib/api';
import { MedicalRecord } from '@/lib/api/types';
import { formatDate } from '@/lib/utils/dateUtils';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';

interface MedicalRecordDetailProps {
  record: MedicalRecord;
  onClose: () => void;
}

const recordTypeColors: Record<string, string> = {
  'visit': 'primary',
  'lab': 'success',
  'prescription': 'warning',
  'imaging': 'secondary',
  'surgery': 'error',
  'vaccination': 'info',
  'other': 'default',
};

const recordTypeLabels: Record<string, string> = {
  'visit': 'Office Visit',
  'lab': 'Lab Results',
  'prescription': 'Prescription',
  'imaging': 'Imaging',
  'surgery': 'Surgery',
  'vaccination': 'Vaccination',
  'other': 'Other',
};

export function MedicalRecordDetail({ record, onClose }: MedicalRecordDetailProps) {
  const [loading, setLoading] = useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'json'>('pdf');
  const { error, handleError, clearError } = useErrorHandler({
    context: 'Medical Record Detail',
    showToastByDefault: true
  });
  
  const handleDownload = async () => {
    try {
      setLoading(true);
      clearError();
      
      const blob = await patientClient.downloadMedicalRecord(record.id, downloadFormat);
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a link element to trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical-record-${record.id}.${downloadFormat}`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setIsDownloadDialogOpen(false);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleFormatChange = (event: SelectChangeEvent) => {
    setDownloadFormat(event.target.value as 'pdf' | 'json');
  };
  
  const renderImages = () => {
    if (!record.images || record.images.length === 0) return null;
    
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Images
        </Typography>
        <Grid container spacing={2}>
          {record.images.map((img) => (
            <Grid item key={img.id} xs={12} sm={6} md={4}>
              <Paper
                variant="outlined"
                sx={{
                  p: 1,
                  height: 150,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={img.image.s3Url || '/placeholder-medical-image.png'}
                  alt={img.image.filename || 'Medical image'}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    // Handle image loading error
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/placeholder-medical-image.png'; // Fallback image
                    handleError(new Error(`Failed to load image: ${img.image.s3Url || 'unknown'}`));
                  }}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 3 }} className="printable-content">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" gutterBottom>
            {record.title}
          </Typography>
          <Chip
            label={recordTypeLabels[record.recordType] || record.recordType}
            color={recordTypeColors[record.recordType] as any || 'default'}
          />
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Date Created
            </Typography>
            <Typography variant="body1">
              {formatDate(new Date(record.createdAt))}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Provider
            </Typography>
            <Typography variant="body1">
              {record.providerId ? `Provider ID: ${record.providerId}` : 'Unknown Provider'}
            </Typography>
          </Grid>
          
          {record.updatedAt && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body1">
                {formatDate(new Date(record.updatedAt))}
              </Typography>
            </Grid>
          )}
        </Grid>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Content
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'background.default' }}>
            <Typography variant="body1" whiteSpace="pre-line">
              {record.content}
            </Typography>
          </Paper>
        </Box>
        
        {renderImages()}
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={clearError}
                startIcon={<RefreshIcon />}
              >
                Dismiss
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={onClose}
            disabled={loading}
          >
            Close
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={loading}
          >
            Print
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={loading ? undefined : <DownloadIcon />}
            onClick={() => setIsDownloadDialogOpen(true)}
            disabled={loading}
          >
            {loading ? <LoadingState size="small" message="Downloading..." /> : 'Download'}
          </Button>
        </Box>
      </Paper>
      
      <Dialog
        open={isDownloadDialogOpen}
        onClose={() => !loading && setIsDownloadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Download Medical Record</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={downloadFormat}
              onChange={handleFormatChange}
              label="Format"
              disabled={loading}
            >
              <MenuItem value="pdf">PDF Document</MenuItem>
              <MenuItem value="json">JSON Data</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDownloadDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDownload} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <LoadingState size="small" message="Downloading..." /> : 'Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 