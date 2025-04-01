'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog, 
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { patientClient } from '@/lib/api/patientClient';
import { useUser } from '@clerk/nextjs';
import { User } from '@/lib/api/types';

interface Provider extends User {
  specialty?: string;
  hospital?: string;
}

interface Image {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  metadata: string | null;
  status: string;
  type: string;
  patientId: string | null;
  studyDate: string | null;
  modality: string | null;
  bodyPart: string | null;
  diagnosis: string | null;
  notes: string | null;
  tags: string[];
  processingStarted: string | null;
  processingEnded: string | null;
  errorMessage: string | null;
  s3Key: string;
  s3Url: string | null;
  contentType: string | null;
  createdAt: string;
  updatedAt: string;
  lastViewed: string | null;
  viewCount: number;
  userId: string;
}

interface SharedImage {
  id: string;
  name: string;
  sharedWith: string;
  expiryDate: string;
  accessCount: number;
  link: string;
}

export default function PatientSharePage() {
  const { user, isLoaded } = useUser();
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [expiryDays, setExpiryDays] = useState('7');
  const [allowDownload, setAllowDownload] = useState(false);
  const [loading, setLoading] = useState({
    providers: true,
    images: true,
    sharedImages: true,
    sharing: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, severity: 'success' | 'error' | 'info'} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, shareId: string}>({
    open: false,
    shareId: '',
  });

  // State for API data
  const [providers, setProviders] = useState<Provider[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [sharedImages, setSharedImages] = useState<SharedImage[]>([]);

  // Fetch providers, images, and shared images on component mount
  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      return;
    }

    // Check if user has patient role in metadata
    const userRole = user.publicMetadata.role;
    if (userRole !== 'PATIENT') {
      return;
    }

    fetchProviders();
    fetchImages();
    fetchSharedImages();
  }, [isLoaded, user]);

  const fetchProviders = async () => {
    try {
      setLoading(prev => ({ ...prev, providers: true }));
      const response = await patientClient.getProviders();
      
      if (response.status === 'success') {
        setProviders(response.data);
      } else {
        console.error('Failed to fetch providers:', response);
      }
    } catch (err) {
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(prev => ({ ...prev, providers: false }));
    }
  };

  const fetchImages = async () => {
    try {
      setLoading(prev => ({ ...prev, images: true }));
      const response = await patientClient.getImages();
      
      if (response?.status === 'success' && response?.data) {
        setImages(response.data.data || []);
      } else {
        console.error('Failed to fetch images:', response);
        setImages([]);
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setImages([]);
    } finally {
      setLoading(prev => ({ ...prev, images: false }));
    }
  };

  const fetchSharedImages = async () => {
    try {
      const response = await patientClient.getSharedImages();
      if (response.status === 'success' && Array.isArray(response.data)) {
        const transformedImages: SharedImage[] = response.data.map(image => ({
          id: image.id,
          name: image.filename,
          sharedWith: '',  // This will be populated from the share data
          expiryDate: '',  // This will be populated from the share data
          accessCount: 0,  // This will be populated from the share data
          link: ''        // This will be populated from the share data
        }));
        setSharedImages(transformedImages);
      } else {
        console.error('Invalid response format:', response);
        setSharedImages([]);
      }
    } catch (error) {
      console.error('Error fetching shared images:', error);
      setSharedImages([]);
    }
  };

  const handleShare = async () => {
    // Validation
    if (!selectedProvider) {
      setNotification({
        message: 'Please select a provider',
        severity: 'error',
      });
      return;
    }
    
    if (!selectedImage) {
      setNotification({
        message: 'Please select an image',
        severity: 'error',
      });
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, sharing: true }));
      
      const response = await patientClient.shareImage({
        providerId: selectedProvider,
        imageId: selectedImage,
        expiryDays: parseInt(expiryDays),
        allowDownload,
      });
      
      if (response.status === 'success') {
        setNotification({
          message: 'Image shared successfully',
          severity: 'success',
        });
        
        // Reset form
        setSelectedProvider('');
        setSelectedImage('');
        setExpiryDays('7');
        setAllowDownload(false);
        
        // Refresh shared images list
        fetchSharedImages();
      } else {
        setNotification({
          message: response.error?.message || 'Failed to share image',
          severity: 'error',
        });
      }
    } catch (err) {
      console.error('Error sharing image:', err);
      setNotification({
        message: 'An error occurred while sharing the image',
        severity: 'error',
      });
    } finally {
      setLoading(prev => ({ ...prev, sharing: false }));
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setNotification({
      message: 'Link copied to clipboard',
      severity: 'info',
    });
  };

  const handleRevokeAccess = (id: string) => {
    setConfirmDialog({
      open: true,
      shareId: id,
    });
  };

  const confirmRevokeAccess = async () => {
    try {
      const response = await patientClient.revokeImageAccess(confirmDialog.shareId);
      
      if (response.status === 'success') {
        setNotification({
          message: 'Access revoked successfully',
          severity: 'success',
        });
        
        // Refresh shared images list
        fetchSharedImages();
      } else {
        setNotification({
          message: response.error?.message || 'Failed to revoke access',
          severity: 'error',
        });
      }
    } catch (err) {
      console.error('Error revoking access:', err);
      setNotification({
        message: 'An error occurred while revoking access',
        severity: 'error',
      });
    } finally {
      setConfirmDialog({ open: false, shareId: '' });
    }
  };

  const handleCloseDialog = () => {
    setConfirmDialog({ open: false, shareId: '' });
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Share Medical Images
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Share Form */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Share with Provider
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Provider</InputLabel>
              <Select
                value={selectedProvider}
                label="Select Provider"
                onChange={(e) => setSelectedProvider(e.target.value as string)}
                disabled={loading.providers}
              >
                {providers.map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </MenuItem>
                ))}
              </Select>
              {loading.providers && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Image</InputLabel>
              <Select
                value={selectedImage}
                label="Select Image"
                onChange={(e) => setSelectedImage(e.target.value as string)}
                disabled={loading.images}
              >
                {images.map((image) => (
                  <MenuItem key={image.id} value={image.id}>
                    {image.filename}
                  </MenuItem>
                ))}
              </Select>
              {loading.images && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Link Expiry</InputLabel>
              <Select
                value={expiryDays}
                label="Link Expiry"
                onChange={(e) => setExpiryDays(e.target.value as string)}
              >
                <MenuItem value="1">1 day</MenuItem>
                <MenuItem value="7">7 days</MenuItem>
                <MenuItem value="30">30 days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                />
              }
              label="Allow Download"
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ShareIcon />}
                onClick={handleShare}
                disabled={loading.sharing}
              >
                {loading.sharing ? <CircularProgress size={24} /> : 'Share Image'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Active Shares */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Active Shares
        </Typography>

        {loading.sharedImages ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : sharedImages.length === 0 ? (
          <Typography align="center" color="textSecondary" sx={{ py: 3 }}>
            You have no active shares
          </Typography>
        ) : (
          <List>
            {sharedImages.map((share) => (
              <ListItem key={share.id}>
                <ListItemText
                  primary={share.name}
                  secondary={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2">
                        Shared with: {share.sharedWith}
                      </Typography>
                      <Typography variant="body2">
                        Expires: {share.expiryDate}
                      </Typography>
                      <Typography variant="body2">
                        Access count: {share.accessCount}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          size="small"
                          label={share.link}
                          onClick={() => handleCopyLink(share.link)}
                          onDelete={() => handleCopyLink(share.link)}
                          deleteIcon={<CopyIcon />}
                        />
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRevokeAccess(share.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseDialog}
      >
        <DialogTitle>Revoke Access</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to revoke access to this shared image? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={confirmRevokeAccess} color="error" autoFocus>
            Revoke Access
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {notification ? (
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  );
} 