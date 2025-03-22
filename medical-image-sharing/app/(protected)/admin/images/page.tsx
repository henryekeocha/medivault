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
import { ApiClient } from '@/lib/api/client';
import { ApiResponse } from '@/lib/api/types';

interface Image {
  id: string;
  title: string;
  uploadedBy: string;
  uploadDate: string;
  patientId: string;
  type: string;
  size: string;
  status: string;
  thumbnail: string;
  url?: string;
}

// Add extension methods to ApiClient at the top of the file before the component
// These are temporary extensions to match the expected API while in development
declare module '@/lib/api/client' {
  interface ApiClient {
    getImageDownloadUrl(imageId: string): Promise<ApiResponse<{downloadUrl: string, filename?: string}>>;
    getImageDetails(imageId: string): Promise<ApiResponse<Image>>;
  }
}

// Temporarily add these methods to the ApiClient prototype
ApiClient.prototype.getImageDownloadUrl = async function(imageId: string): Promise<ApiResponse<{downloadUrl: string, filename?: string}>> {
  // This is a temporary implementation
  const response = await this.get<{downloadUrl: string, filename?: string}>(`/images/${imageId}/download`);
  // Construct a proper ApiResponse instead of type casting
  return {
    status: 'success',
    data: {
      downloadUrl: typeof response === 'object' && response.downloadUrl ? response.downloadUrl : '',
      filename: typeof response === 'object' && response.filename ? response.filename : undefined
    }
  };
};

ApiClient.prototype.getImageDetails = async function(imageId: string): Promise<ApiResponse<Image>> {
  // This is a temporary implementation
  const response = await this.get<Image>(`/images/${imageId}`);
  // Construct a proper ApiResponse instead of type casting
  return {
    status: 'success',
    data: response as Image
  };
};

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
    fetchImages();
  }, [typeFilter, statusFilter]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const apiClient = ApiClient.getInstance();
      
      const params: Record<string, string> = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      
      const response = await apiClient.getImages(params);
      
      if (response.status === 'success') {
        // Correctly access and transform the paginated data into the expected format
        setImages(response.data.data.map(img => ({
          id: img.id,
          title: img.filename || 'Untitled',
          uploadedBy: img.metadata?.uploadedBy || 'Unknown',
          uploadDate: img.uploadDate?.toString() || new Date().toString(),
          patientId: img.patientId || 'Unknown',
          type: img.type || 'Unknown',
          size: formatFileSize(img.fileSize || 0),
          status: img.status || 'Unknown',
          thumbnail: `/api/images/${img.id}/thumbnail`,
          url: `/api/images/${img.id}`
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

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredImages = images.filter(image => {
    const matchesSearch = 
      image.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleDelete = (imageId: string) => {
    setImageToDelete(imageId);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;
    
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.deleteImage(imageToDelete);
      
      if (response.status === 'success') {
        setNotification({
          message: 'Image successfully deleted',
          severity: 'success'
        });
        // Refresh images list
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
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getImageDownloadUrl(imageId);
      
      if (response.status === 'success' && response.data.downloadUrl) {
        // Create a temporary anchor element to trigger the download
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.filename || 'medical-image.jpg';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setNotification({
          message: 'Failed to download image',
          severity: 'error'
        });
      }
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
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getImageDetails(imageId);
      
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
      console.error('Error viewing image:', err);
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Image Management
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Search Images"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 300 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value as string)}
            >
              <MenuItem value="ALL">All Types</MenuItem>
              <MenuItem value="X-RAY">X-Ray</MenuItem>
              <MenuItem value="MRI">MRI</MenuItem>
              <MenuItem value="CT">CT Scan</MenuItem>
              <MenuItem value="ULTRASOUND">Ultrasound</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as string)}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="ARCHIVED">Archived</MenuItem>
              <MenuItem value="DELETED">Deleted</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : filteredImages.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No images found matching your criteria</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredImages.map((image) => (
            <Grid item xs={12} sm={6} md={4} key={image.id}>
              <Card>
                <CardMedia
                  component="img"
                  height="200"
                  image={image.thumbnail}
                  alt={image.title}
                />
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    {image.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uploaded by: {image.uploadedBy}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Patient ID: {image.patientId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Date: {new Date(image.uploadDate).toLocaleDateString()}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={image.type}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={image.status}
                      color={image.status === 'ACTIVE' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </CardContent>
                <CardActions>
                  <IconButton size="small" onClick={() => handleView(image.id)}>
                    <ViewIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDownload(image.id)}>
                    <DownloadIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(image.id)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Image Viewer Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedImage && (
          <>
            <DialogTitle>{selectedImage.title}</DialogTitle>
            <DialogContent>
              <Box sx={{ textAlign: 'center', my: 2 }}>
                <img 
                  src={selectedImage.url || selectedImage.thumbnail} 
                  alt={selectedImage.title}
                  style={{ maxWidth: '100%', maxHeight: '60vh' }}
                />
              </Box>
              <Typography variant="body1" gutterBottom>
                <strong>Uploaded by:</strong> {selectedImage.uploadedBy}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Patient ID:</strong> {selectedImage.patientId}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Type:</strong> {selectedImage.type}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Size:</strong> {selectedImage.size}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Upload Date:</strong> {new Date(selectedImage.uploadDate).toLocaleString()}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Status:</strong> {selectedImage.status}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
              <Button onClick={() => handleDownload(selectedImage.id)}>Download</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Delete Image</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this image? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      {notification && (
        <Snackbar
          open={true}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </Container>
  );
} 