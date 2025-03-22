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
import { ApiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { Image as BaseImage } from '@/lib/api/types';

// Extend the Image type to include the name property we add locally
interface Image extends BaseImage {
  name?: string;
}

interface Patient {
  id: string;
  name: string;
}

interface SharedImage {
  id: string;
  name: string;
  sharedWith: string;
  expiryDate: string;
  accessCount: number;
  link: string;
}

export default function ProviderSharePage() {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [expiryDays, setExpiryDays] = useState('7');
  const [requireConsent, setRequireConsent] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [downloadEnabled, setDownloadEnabled] = useState(false);
  const [loading, setLoading] = useState({
    patients: true,
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [filteredImages, setFilteredImages] = useState<Image[]>([]);
  const [sharedImages, setSharedImages] = useState<SharedImage[]>([]);

  // Fetch patients, images, and shared images on component mount
  useEffect(() => {
    fetchPatients();
    fetchImages();
    fetchSharedImages();
  }, []);

  // Filter images based on selected patient
  useEffect(() => {
    if (selectedPatient) {
      const filtered = images.filter(image => image.patientId === selectedPatient);
      setFilteredImages(filtered);
    } else {
      setFilteredImages([]);
    }
    
    // Reset selected image when patient changes
    setSelectedImage('');
  }, [selectedPatient, images]);

  const fetchPatients = async () => {
    try {
      setLoading(prev => ({ ...prev, patients: true }));
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getProviderPatients();
      
      if (response.status === 'success') {
        setPatients(response.data);
      } else {
        console.error('Failed to fetch patients:', response);
        setError('Failed to load patients');
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('An error occurred while loading patients');
    } finally {
      setLoading(prev => ({ ...prev, patients: false }));
    }
  };

  const fetchImages = async () => {
    try {
      setLoading(prev => ({ ...prev, images: true }));
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getProviderImages();
      
      if (response.status === 'success') {
        // Map API Image objects to include a name property (using filename)
        const mappedImages = response.data.map(img => ({
          ...img,
          name: img.filename || `Image ${img.id}` // Use filename as name or fallback to ID
        }));
        setImages(mappedImages);
      } else {
        console.error('Failed to fetch images:', response);
        setError('Failed to load images');
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('An error occurred while loading images');
    } finally {
      setLoading(prev => ({ ...prev, images: false }));
    }
  };

  const fetchSharedImages = async () => {
    try {
      setLoading(prev => ({ ...prev, sharedImages: true }));
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getProviderSharedImages();
      
      if (response.status === 'success') {
        setSharedImages(response.data);
      } else {
        console.error('Failed to fetch shared images:', response);
        setError('Failed to load shared images');
      }
    } catch (err) {
      console.error('Error fetching shared images:', err);
      setError('An error occurred while loading shared images');
    } finally {
      setLoading(prev => ({ ...prev, sharedImages: false }));
    }
  };

  const handleShare = async () => {
    // Validation
    if (!selectedPatient) {
      setNotification({
        message: 'Please select a patient',
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
      const apiClient = ApiClient.getInstance();
      
      const response = await apiClient.createImageShare({
        providerId: user?.id,
        patientId: selectedPatient,
        imageId: selectedImage,
        expiryDays: parseInt(expiryDays),
        requireConsent,
        watermarkEnabled,
        allowDownload: downloadEnabled,
      });
      
      if (response.status === 'success') {
        setNotification({
          message: 'Share link created successfully',
          severity: 'success',
        });
        
        // Reset form
        setSelectedImage('');
        
        // Refresh shared images list
        fetchSharedImages();
      } else {
        setNotification({
          message: response.error?.message || 'Failed to create share link',
          severity: 'error',
        });
      }
    } catch (err) {
      console.error('Error creating share link:', err);
      setNotification({
        message: 'An error occurred while creating the share link',
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
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.revokeImageShare(confirmDialog.shareId);
      
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
          Create New Share
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Patient</InputLabel>
              <Select
                value={selectedPatient}
                label="Select Patient"
                onChange={(e) => setSelectedPatient(e.target.value as string)}
                disabled={loading.patients}
              >
                {patients.map((patient) => (
                  <MenuItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </MenuItem>
                ))}
              </Select>
              {loading.patients && (
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
                disabled={loading.images || !selectedPatient || filteredImages.length === 0}
              >
                {filteredImages.map((image) => (
                  <MenuItem key={image.id} value={image.id}>
                    {image.name}
                  </MenuItem>
                ))}
              </Select>
              {loading.images ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : !selectedPatient ? (
                <Typography variant="caption" color="text.secondary">
                  Please select a patient first
                </Typography>
              ) : filteredImages.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  No images available for this patient
                </Typography>
              ) : null}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Expiry Period</InputLabel>
              <Select
                value={expiryDays}
                label="Expiry Period"
                onChange={(e) => setExpiryDays(e.target.value as string)}
              >
                <MenuItem value="1">1 day</MenuItem>
                <MenuItem value="7">7 days</MenuItem>
                <MenuItem value="30">30 days</MenuItem>
                <MenuItem value="90">90 days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={requireConsent}
                  onChange={(e) => setRequireConsent(e.target.checked)}
                />
              }
              label="Require Patient Consent"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={watermarkEnabled}
                  onChange={(e) => setWatermarkEnabled(e.target.checked)}
                />
              }
              label="Add Watermark"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={downloadEnabled}
                  onChange={(e) => setDownloadEnabled(e.target.checked)}
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
                disabled={loading.sharing || !selectedPatient || !selectedImage}
              >
                {loading.sharing ? <CircularProgress size={24} /> : 'Generate Share Link'}
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
        ) : <div></div>}
      </Snackbar>
    </Container>
  );
} 