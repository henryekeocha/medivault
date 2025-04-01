'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon, 
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { patientClient } from '@/lib/api/patientClient';
import { useToast } from '@/hooks/useToast';
import { ImageType } from '@/lib/api/types';
import { User } from '@/lib/api/types';
import { AxiosProgressEvent } from '@/lib/api/sharedClient';

interface Provider extends User {
  specialty?: string;
  hospital?: string;
}

interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function PatientUploadPage() {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [provider, setProvider] = useState('');
  const [imageType, setImageType] = useState<ImageType | ''>('');
  const [description, setDescription] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoadingProviders(true);
        setError(null);
        const response = await patientClient.getProviders();
        if (response.status === 'success' && response.data) {
          setProviders(response.data);
        } else {
          setError('Failed to fetch providers');
        }
      } catch (err) {
        console.error('Error fetching providers:', err);
        setError('Failed to load providers. Please try again later.');
        showError('Failed to load providers');
      } finally {
        setLoadingProviders(false);
      }
    };

    fetchProviders();
  }, [showError]);

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
    if (files.length === 0) {
      showError('Please select files to upload');
      return;
    }

    if (!imageType) {
      showError('Please select an image type');
      return;
    }

    // Mark all files as uploading
    setFiles(prev =>
      prev.map(file => ({
        ...file,
        status: 'uploading',
      }))
    );

    // Upload files one by one
    const updatedFiles = [...files];
    
    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].status !== 'uploading') continue;
      
      try {
        // Prepare metadata
        const metadata = {
          type: imageType,
          description: description,
          ...(provider ? { providerId: provider } : {}),
        };
        
        // Upload file
        await patientClient.uploadImage(
          updatedFiles[i].file,
          metadata,
          (progress: number) => {
            updatedFiles[i] = {
              ...updatedFiles[i],
              progress,
            };
            setFiles([...updatedFiles]);
          }
        );
        
        // Mark as success
        updatedFiles[i] = {
          ...updatedFiles[i],
          progress: 100,
          status: 'success',
        };
        setFiles([...updatedFiles]);
        
      } catch (err) {
        console.error('Error uploading file:', err);
        updatedFiles[i] = {
          ...updatedFiles[i],
          progress: 0,
          status: 'error',
          error: 'Upload failed',
        };
        setFiles([...updatedFiles]);
        showError(`Failed to upload ${updatedFiles[i].file.name}`);
      }
    }
    
    const successCount = updatedFiles.filter(file => file.status === 'success').length;
    if (successCount > 0) {
      showSuccess(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`);
    }
  };

  const handleRemove = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const renderProviderSelect = () => {
    if (loadingProviders) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="body2">Loading providers...</Typography>
        </Box>
      );
    }

    return (
      <FormControl fullWidth>
        <InputLabel>Share with Provider</InputLabel>
        <Select
          value={provider}
          label="Share with Provider"
          onChange={(e) => setProvider(e.target.value)}
        >
          {providers.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Upload Medical Images
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Provider and Image Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {renderProviderSelect()}
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Image Type</InputLabel>
              <Select
                value={imageType}
                label="Image Type"
                onChange={(e) => setImageType(e.target.value as ImageType)}
              >
                <MenuItem value={ImageType.XRAY}>X-Ray</MenuItem>
                <MenuItem value={ImageType.MRI}>MRI</MenuItem>
                <MenuItem value={ImageType.CT}>CT Scan</MenuItem>
                <MenuItem value={ImageType.ULTRASOUND}>Ultrasound</MenuItem>
                <MenuItem value={ImageType.OTHER}>Other</MenuItem>
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
              placeholder="Add any relevant information about these images"
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