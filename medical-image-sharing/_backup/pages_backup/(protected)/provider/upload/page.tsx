'use client';

import React, { useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function ProviderUploadPage() {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [patientId, setPatientId] = useState('');
  const [imageType, setImageType] = useState('');
  const [description, setDescription] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.dcm', '.jpg', '.jpeg', '.png'],
    },
    multiple: true,
  });

  const handleUpload = async () => {
    // Implement actual upload logic here
    setFiles(prev =>
      prev.map(file => ({
        ...file,
        status: 'uploading',
      }))
    );

    // Simulate upload progress
    const interval = setInterval(() => {
      setFiles(prev =>
        prev.map(file => ({
          ...file,
          progress: file.progress >= 100 ? 100 : file.progress + 10,
          status: file.progress >= 90 ? 'success' : 'uploading',
        }))
      );
    }, 500);

    // Clear interval after "upload" is complete
    setTimeout(() => clearInterval(interval), 5000);
  };

  const handleRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Upload Medical Images
      </Typography>

      {/* Patient and Image Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Patient ID"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Image Type</InputLabel>
              <Select
                value={imageType}
                label="Image Type"
                onChange={(e) => setImageType(e.target.value)}
              >
                <MenuItem value="xray">X-Ray</MenuItem>
                <MenuItem value="mri">MRI</MenuItem>
                <MenuItem value="ct">CT Scan</MenuItem>
                <MenuItem value="ultrasound">Ultrasound</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Upload Area */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <UploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography variant="h6" align="center">
            {isDragActive
              ? 'Drop the files here'
              : 'Drag and drop files here, or click to select files'}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Supported formats: DICOM (.dcm), JPEG, PNG
          </Typography>
        </Box>
      </Paper>

      {/* File List */}
      {files.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <List>
            {files.map((file, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={file.file.name}
                  secondary={
                    <Box sx={{ width: '100%' }}>
                      <LinearProgress
                        variant="determinate"
                        value={file.progress}
                        color={
                          file.status === 'error'
                            ? 'error'
                            : file.status === 'success'
                            ? 'success'
                            : 'primary'
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        {file.status === 'success'
                          ? 'Upload complete'
                          : file.status === 'error'
                          ? file.error
                          : `${Math.round(file.progress)}%`}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  {file.status === 'success' ? (
                    <SuccessIcon color="success" />
                  ) : file.status === 'error' ? (
                    <ErrorIcon color="error" />
                  ) : (
                    <IconButton
                      edge="end"
                      onClick={() => handleRemove(index)}
                      disabled={file.status === 'uploading'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<UploadIcon />}
            onClick={handleUpload}
            disabled={files.some(f => f.status === 'uploading')}
          >
            Upload Files
          </Button>
        </Box>
      )}
    </Container>
  );
} 