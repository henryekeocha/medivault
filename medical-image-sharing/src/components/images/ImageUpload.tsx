'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  LinearProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  FormControlLabel,
  Switch,
  Tooltip,
} from '@mui/material';
import { 
  Close as CloseIcon, 
  Refresh as RefreshIcon,
  MedicalInformation as DicomIcon,
} from '@mui/icons-material';
import { ImageType } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { imageService } from '@/lib/api/services/image.service';

// Custom type to extend the Prisma ImageType enum with DICOM
type ExtendedImageType = ImageType | 'DICOM';

interface ImageUploadProps {
  onUploadComplete?: (imageId: string) => void;
  onCancel?: () => void;
}

interface ImageMetadata {
  type: ExtendedImageType;
  description: string;
  patientId: string;
  tags: string[];
  newTag: string;
  modality?: string;
  bodyPart?: string;
  studyDate?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUploadComplete,
  onCancel,
}) => {
  const { data: session } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [metadata, setMetadata] = useState<ImageMetadata>({
    type: ImageType.XRAY,
    description: '',
    patientId: '',
    tags: [],
    newTag: '',
    modality: '',
    bodyPart: '',
    studyDate: new Date().toISOString().split('T')[0],
  });
  
  const [isDicom, setIsDicom] = useState(false);
  const [showDicomOptions, setShowDicomOptions] = useState(false);
  
  // Initialize error handler - only declare once
  const { error, handleError, clearError } = useErrorHandler({
    context: 'Image upload',
    showToastByDefault: true
  });

  useEffect(() => {
    if (session?.user?.role && (session.user.role === 'PATIENT' || session.user.role === 'PROVIDER')) {
      imageService.setUserRole(session.user.role);
    }
  }, [session?.user?.role]);

  // Function to check if a file is a DICOM file
  const checkIfDicom = useCallback((file: File) => {
    // Check file extension
    const isDicomByExtension = file.name.toLowerCase().endsWith('.dcm');
    
    // Check MIME type
    const isDicomByType = file.type === 'application/dicom';
    
    // Set DICOM detection
    const fileIsDicom = isDicomByExtension || isDicomByType;
    setIsDicom(fileIsDicom);
    
    // If it's a DICOM file, automatically set the type to DICOM
    if (fileIsDicom) {
      setMetadata(prev => ({
        ...prev,
        type: 'DICOM' as ExtendedImageType,
      }));
      setShowDicomOptions(true);
    }
    
    return fileIsDicom;
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    clearError();
    setFiles(acceptedFiles);
    
    // Check if the file is a DICOM file
    if (acceptedFiles.length > 0) {
      checkIfDicom(acceptedFiles[0]);
    }
  }, [clearError, checkIfDicom]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.dicom', '.dcm'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      handleError('Please select a file to upload');
      return;
    }
    
    // Reset state
    clearError();
    setUploading(true);
    setProgress(0);
    setUploadComplete(false);

    try {
      // Validate required fields
      if (!metadata.type) {
        throw new Error('Please select an image type');
      }
      
      if (!metadata.description.trim()) {
        throw new Error('Please provide a description for the image');
      }
      
      // Prepare metadata for the API
      const imageMetadata: any = {
        type: metadata.type === 'DICOM' ? ImageType.OTHER : metadata.type, // Map DICOM to OTHER for prisma
        notes: metadata.description,
        patientId: metadata.patientId,
        tags: metadata.tags,
        modality: metadata.modality,
        bodyPart: metadata.bodyPart,
      };
      
      // Convert studyDate from string to Date if present
      if (metadata.studyDate) {
        imageMetadata.studyDate = new Date(metadata.studyDate);
      }
      
      const onProgressUpdate = (progress: number) => {
        setProgress(progress);
      };
      
      // Use unified uploadImage method
      const response = await imageService.uploadImage(files[0], imageMetadata, onProgressUpdate);
      
      if (response.status !== 'success' || !response.data) {
        throw new Error(response.error?.message || 'Upload failed');
      }

      setUploadComplete(true);
      
      if (onUploadComplete) {
        onUploadComplete(response.data.id);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      handleError(error);
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setProgress(0);
    setUploadComplete(false);
    clearError();
  };

  const handleAddTag = () => {
    if (metadata.newTag && !metadata.tags.includes(metadata.newTag)) {
      setMetadata({
        ...metadata,
        tags: [...metadata.tags, metadata.newTag],
        newTag: '',
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata({
      ...metadata,
      tags: metadata.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Upload Medical Image
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Supported formats: PNG, JPG, JPEG, GIF, BMP, DICOM
        </Typography>
      </Box>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={clearError}
            >
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      {uploadComplete && !error ? (
        <Alert 
          severity="success"
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={resetUpload}
            >
              Upload Another
            </Button>
          }
        >
          Image uploaded successfully
        </Alert>
      ) : (
        <>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : error ? 'error.main' : 'grey.300',
              borderRadius: 1,
              p: 3,
              mb: 3,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
              },
            }}
          >
            <input {...getInputProps()} />
            {files.length > 0 ? (
              <Typography>{files[0].name}</Typography>
            ) : (
              <Typography>
                {isDragActive
                  ? 'Drop the file here'
                  : 'Drag and drop an image file here, or click to select'}
              </Typography>
            )}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="image-type-label">Image Type</InputLabel>
                <Select
                  labelId="image-type-label"
                  id="image-type"
                  value={metadata.type}
                  label="Image Type"
                  onChange={(e) => {
                    const selectedType = e.target.value as ExtendedImageType;
                    setMetadata({ ...metadata, type: selectedType });
                    setShowDicomOptions(selectedType === 'DICOM');
                  }}
                  disabled={uploading || isDicom}
                >
                  <MenuItem value={ImageType.XRAY}>X-Ray</MenuItem>
                  <MenuItem value={ImageType.MRI}>MRI</MenuItem>
                  <MenuItem value={ImageType.CT}>CT Scan</MenuItem>
                  <MenuItem value={ImageType.ULTRASOUND}>Ultrasound</MenuItem>
                  <MenuItem value={'DICOM' as ExtendedImageType}>DICOM</MenuItem>
                  <MenuItem value={ImageType.OTHER}>Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* DICOM Detection Alert */}
            {isDicom && (
              <Grid item xs={12}>
                <Alert severity="info">
                  DICOM file detected. DICOM-specific options have been enabled.
                </Alert>
              </Grid>
            )}

            {/* DICOM-specific options */}
            {(showDicomOptions || isDicom) && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Modality"
                    value={metadata.modality || ''}
                    onChange={(e) => setMetadata({ ...metadata, modality: e.target.value })}
                    variant="outlined"
                    disabled={uploading}
                    placeholder="E.g., CT, MR, US"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Body Part"
                    value={metadata.bodyPart || ''}
                    onChange={(e) => setMetadata({ ...metadata, bodyPart: e.target.value })}
                    variant="outlined"
                    disabled={uploading}
                    placeholder="E.g., HEAD, CHEST"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Study Date"
                    type="date"
                    value={metadata.studyDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setMetadata({ ...metadata, studyDate: e.target.value })}
                    variant="outlined"
                    disabled={uploading}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={metadata.description}
                onChange={(e) =>
                  setMetadata({ ...metadata, description: e.target.value })
                }
                multiline
                rows={3}
                disabled={uploading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Patient ID"
                value={metadata.patientId}
                onChange={(e) =>
                  setMetadata({ ...metadata, patientId: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Tags</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {metadata.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  label="Add Tag"
                  value={metadata.newTag}
                  onChange={(e) =>
                    setMetadata({ ...metadata, newTag: e.target.value })
                  }
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button variant="outlined" onClick={handleAddTag}>
                  Add
                </Button>
              </Box>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={uploading || !files.length}
                startIcon={isDicom ? <DicomIcon /> : undefined}
              >
                {uploading 
                  ? `Uploading... ${progress}%` 
                  : (isDicom ? 'Upload DICOM' : 'Upload Image')}
              </Button>
              {uploadComplete && (
                <Button
                  variant="outlined"
                  onClick={resetUpload}
                  startIcon={<RefreshIcon />}
                >
                  Upload Another
                </Button>
              )}
            </Box>
          </Grid>

          {uploading && (
            <Grid item xs={12}>
              <LinearProgress variant="determinate" value={progress} />
            </Grid>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={onCancel}>Cancel</Button>
          </Box>
        </>
      )}
    </Paper>
  );
};
