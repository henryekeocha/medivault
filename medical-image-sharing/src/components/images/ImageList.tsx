'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  Chip,
  Dialog, 
  Button,
  Alert,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { ImageType } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { ImageViewer } from './ImageViewer';
import { ShareDialog } from '../shares/ShareDialog';
import type { Image } from '@/lib/api/types';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { imageService } from '@/lib/api/services/image.service';

interface ImageListProps {
  patientId?: string;
  onImageSelect?: (image: Image) => void;
  readOnly?: boolean;
}

export const ImageList: React.FC<ImageListProps> = ({
  patientId,
  onImageSelect,
  readOnly = false,
}) => {
  const { data: session } = useSession();
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    search: '',
    startDate: '',
    endDate: '',
  });

  // Initialize error handler
  const { 
    error, 
    handleError, 
    clearError,
    withErrorHandling 
  } = useErrorHandler({ 
    context: 'Image List', 
    showToastByDefault: true 
  });

  useEffect(() => {
    // Set the user role in the image service
    imageService.setUserRole(session?.user?.role === 'PROVIDER' ? 'PROVIDER' : 'PATIENT');
  }, [session?.user?.role]);

  const fetchImages = async () => {
    clearError();
    setLoading(true);
    
    try {
      const response = await imageService.getImages({
        page,
        limit: 12,
        ...(patientId && { patientId })
      });

      if (response.status !== 'success') {
        throw new Error(response.error?.message || 'Failed to fetch images');
      }

      const data = response.data;
      if ('data' in data) {  // Check if it's a PaginatedResponse
        const filteredImages = data.data.filter(image => {
          if (filters.type && image.type !== filters.type) return false;
          if (filters.search && !image.filename.toLowerCase().includes(filters.search.toLowerCase())) return false;
          if (filters.startDate && new Date(image.createdAt) < new Date(filters.startDate)) return false;
          if (filters.endDate && new Date(image.createdAt) > new Date(filters.endDate)) return false;
          return true;
        });
        setImages(filteredImages);
        setTotalPages(Math.ceil(filteredImages.length / 12));
      } else {  // It's an Image[]
        setImages(data);
        setTotalPages(1);
      }
    } catch (error) {
      handleError(error as Error);
      setImages([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [page, filters, patientId]);

  const handleImageClick = (image: Image) => {
    if (onImageSelect) {
      onImageSelect(image);
    } else {
      setSelectedImage(image);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, imageId: string) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setActiveImageId(imageId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setActiveImageId(null);
  };

  const handleShare = () => {
    handleMenuClose();
    setShareDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!activeImageId) return;

    withErrorHandling(async () => {
      const response = await imageService.deleteImage(activeImageId);
      
      if (response.status !== 'success') {
        throw new Error(response.error?.message || 'Failed to delete image');
      }
      
      fetchImages();
      handleMenuClose();
    }, { 
      showToast: true,
      successMessage: 'Image deleted successfully'
    });
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingState skeletonCount={4} />;
    }

    if (error) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Alert 
            severity="error" 
            sx={{ mb: 2, maxWidth: 500, mx: 'auto' }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                startIcon={<RefreshIcon />}
                onClick={fetchImages}
              >
                Retry
              </Button>
            }
          >
            {typeof error === 'string' ? error : (error as Error)?.message || 'Failed to load images'}
          </Alert>
        </Box>
      );
    }

    if (images.length === 0) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No images found. Try adjusting your filters or upload new images.
          </Typography>
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {images.map((image) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
            <Card
              onClick={() => handleImageClick(image)}
              sx={{ cursor: 'pointer', height: '100%' }}
            >
              <CardMedia
                component="img"
                height="200"
                image={image.s3Key}
                alt={image.filename}
                sx={{ objectFit: 'cover' }}
                onError={(e) => {
                  // Handle image loading error
                  (e.target as HTMLImageElement).src = '/placeholder-image.png';
                }}
              />
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" noWrap>
                      {image.filename}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {image.createdAt ? new Date(image.createdAt).toLocaleDateString() : 'Date unavailable'}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={image.type}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  {!readOnly && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, image.id)}
                    >
                      <MoreIcon />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                label="Type"
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value as string })
                }
              >
                <MenuItem value="">All</MenuItem>
                {Object.values(ImageType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Box>

      {renderContent()}

      {!loading && !error && totalPages > 1 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleShare}>
          <ShareIcon sx={{ mr: 1 }} /> Share
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {selectedImage && (
        <Dialog
          fullScreen
          open={true}
          onClose={() => setSelectedImage(null)}
        >
          <ImageViewer
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
            readOnly={readOnly}
          />
        </Dialog>
      )}

      {shareDialogOpen && activeImageId && (
        <ShareDialog
          imageId={activeImageId}
          onClose={() => setShareDialogOpen(false)}
        />
      )}
    </Box>
  );
}; 