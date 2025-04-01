'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  IconButton,
  Button,
  TextField,
  Box,
  Chip,
  Select,
  MenuItem,
  FormControl, 
  InputLabel,
  Stack,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { imageService } from '@/lib/api/services/image.service';
import { Image, ApiResponse } from '@/lib/api/types';

export default function AdminImagesPage() {
  const [images, setImages] = useState<Image[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, severity: 'success' | 'error'} | null>(null);

  useEffect(() => {
    imageService.setUserRole('ADMIN');
    fetchImages();
  }, [typeFilter, statusFilter]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      
      const params: Record<string, any> = {
        page: 1,
        limit: 50
      };
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      
      const response = await imageService.getImages(params);
      
      if (response.status === 'success') {
        const imageData = Array.isArray(response.data) ? response.data : response.data.data;
        setImages(imageData.map(img => ({
          ...img,
          title: img.filename || 'Untitled',
          uploadedBy: img.user?.name || 'Unknown',
          uploadDate: new Date(img.uploadDate || img.createdAt).toLocaleString(),
          patientId: img.patientId || 'Unknown',
          type: img.type || 'Unknown',
          size: formatFileSize(img.fileSize || 0),
          status: img.status || 'Unknown',
          thumbnail: imageService.getThumbnailUrl(img),
          url: imageService.getImageUrl(img)
        })));
        setError(null);
      } else {
        setError(response.error?.message || 'Failed to fetch images');
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('An error occurred while fetching images. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredImages = images.filter(image => {
    const matchesSearch = 
      (image.filename || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (image.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (image.patientId || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleDelete = (imageId: string) => {
    setImageToDelete(imageId);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;
    
    try {
      const response = await imageService.deleteImage(imageToDelete);
      
      if (response.status === 'success') {
        setNotification({
          message: 'Image successfully deleted',
          severity: 'success'
        });
        fetchImages();
      } else {
        setNotification({
          message: 'Failed to delete image',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      setNotification({
        message: 'An error occurred while deleting the image',
        severity: 'error'
      });
    } finally {
      setConfirmDialogOpen(false);
      setImageToDelete(null);
    }
  };

  const handleDownload = async (imageId: string) => {
    try {
      const blob = await imageService.downloadImage(imageId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${imageId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading image:', err);
      setNotification({
        message: 'An error occurred while downloading the image',
        severity: 'error'
      });
    }
  };

  const handleView = async (imageId: string) => {
    try {
      const response = await imageService.getImage(imageId);
      if (response.status === 'success') {
        setSelectedImage(response.data);
        setViewDialogOpen(true);
      } else {
        setNotification({
          message: 'Failed to load image details',
          severity: 'error'
        });
      }
    } catch (err) {
      console.error('Error loading image details:', err);
      setNotification({
        message: 'An error occurred while loading image details',
        severity: 'error'
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Image Management
        </Typography>

        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Search Images"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by filename, uploader, or patient ID"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Type Filter</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Type Filter"
              >
                <MenuItem value="ALL">All Types</MenuItem>
                <MenuItem value="XRAY">X-Ray</MenuItem>
                <MenuItem value="MRI">MRI</MenuItem>
                <MenuItem value="CT">CT Scan</MenuItem>
                <MenuItem value="ULTRASOUND">Ultrasound</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status Filter"
              >
                <MenuItem value="ALL">All Status</MenuItem>
                <MenuItem value="PROCESSING">Processing</MenuItem>
                <MenuItem value="READY">Ready</MenuItem>
                <MenuItem value="ERROR">Error</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredImages.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography>No images found matching your criteria</Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredImages.map((image) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="200"
                    image={imageService.getThumbnailUrl(image)}
                    alt={image.filename}
                    sx={{ objectFit: 'contain' }}
                  />
                  <CardContent>
                    <Typography variant="h6" noWrap>
                      {image.filename}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Uploaded by: {image.user?.name || 'Unknown'}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      <Chip label={image.type} size="small" />
                      <Chip label={image.status} size="small" color={
                        image.status === 'READY' ? 'success' :
                        image.status === 'ERROR' ? 'error' :
                        'default'
                      } />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Size: {formatFileSize(image.fileSize)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Patient ID: {image.patientId || 'N/A'}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <IconButton onClick={() => handleView(image.id)} title="View Details">
                      <ViewIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDownload(image.id)} title="Download">
                      <DownloadIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(image.id)} title="Delete">
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Image Details</DialogTitle>
          <DialogContent>
            {selectedImage && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <img
                    src={imageService.getImageUrl(selectedImage)}
                    alt={selectedImage.filename}
                    style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain' }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6">{selectedImage.filename}</Typography>
                  <Typography>Type: {selectedImage.type}</Typography>
                  <Typography>Status: {selectedImage.status}</Typography>
                  <Typography>Size: {formatFileSize(selectedImage.fileSize)}</Typography>
                  <Typography>Patient ID: {selectedImage.patientId || 'N/A'}</Typography>
                  <Typography>Upload Date: {new Date(selectedImage.uploadDate || selectedImage.createdAt).toLocaleString()}</Typography>
                  <Typography>Uploaded By: {selectedImage.user?.name || 'Unknown'}</Typography>
                  {selectedImage.notes && (
                    <Typography>Notes: {selectedImage.notes}</Typography>
                  )}
                  {selectedImage.diagnosis && (
                    <Typography>Diagnosis: {selectedImage.diagnosis}</Typography>
                  )}
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this image? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmDelete} color="error">Delete</Button>
          </DialogActions>
        </Dialog>

        {notification && (
          <Snackbar
            open={Boolean(notification)}
            autoHideDuration={6000}
            onClose={() => setNotification(null)}
          >
            <Alert
              onClose={() => setNotification(null)}
              severity={notification.severity}
              sx={{ width: '100%' }}
            >
              {notification.message}
            </Alert>
          </Snackbar>
        )}
      </Box>
    </Container>
  );
} 