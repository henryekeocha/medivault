'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel, 
  Box,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Share as ShareIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { ImageType, ImageStatus, Role } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { imageService } from '@/lib/api/services/image.service';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ImageMetadata, PaginatedResponse, Image } from '@/lib/api/types';

export default function PatientImagesPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, handleError, clearError } = useErrorHandler({
    context: 'Patient Images',
    showToastByDefault: true
  });

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Check if user has patient role in metadata
    const userRole = user.publicMetadata.role;
    if (userRole !== 'PATIENT') {
      router.push('/dashboard');
      return;
    }

    if (userRole) {
      imageService.setUserRole(userRole as Role);
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    fetchImages();
  }, [filterType]);

  const fetchImages = async () => {
    setLoading(true);
    clearError();
    try {
      const response = await imageService.getImages({
        patientId: user?.id,
        page: 1,
        limit: 20
      });
      
      // Extract images from any valid response format
      let imageList: Image[] = [];
      
      if (response) {
        // Check for our standard API response format
        if (response.status === 'success') {
          if (Array.isArray(response.data)) {
            imageList = response.data;
          } else if (response.data && Array.isArray(response.data.data)) {
            imageList = response.data.data;
          }
        } 
        // Check for direct data access (Axios response)
        else if (response.data) {
          if (Array.isArray(response.data)) {
            imageList = response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            imageList = response.data.data;
          }
        }
      }
      
      // Filter images
      const filteredImages = imageList.filter((image) => {
        const matchesType = !filterType || image.type === filterType;
        const matchesSearch = !searchTerm || 
          image.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (image.metadata as ImageMetadata)?.notes?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
      });
      
      setImages(filteredImages);
    } catch (err) {
      console.error('Error fetching images:', err);
      setImages([]);
      
      // Only show the error if it's a specific type we want to display
      // Silently fail for network or generic errors
      if (err instanceof Error && 
          err.message !== 'Failed to fetch' && 
          !err.message.includes('Network Error') &&
          !(err instanceof Object && 'status' in err && err.status === 200)) {
        handleError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchImages();
  };

  const handleView = (imageId: string) => {
    router.push(`/patient/images/${imageId}` as any);
  };

  const handleShare = async (imageId: string) => {
    router.push(`/patient/share?imageId=${imageId}` as any);
  };

  const handleDownload = async (imageId: string) => {
    try {
      const blob = await imageService.downloadImage(imageId);
      
      // Create an object URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${imageId}.jpg`; // Default filename
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      handleError(err);
    }
  };

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Medical Images
      </Typography>

      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          label="Search Images"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            endAdornment: (
              <IconButton onClick={handleSearch}>
                <SearchIcon />
              </IconButton>
            ),
          }}
          sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 300 } }}
        />
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="filter-type-label">Filter Type</InputLabel>
          <Select
            labelId="filter-type-label"
            value={filterType}
            label="Filter Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="XRAY">X-Ray</MenuItem>
            <MenuItem value="MRI">MRI</MenuItem>
            <MenuItem value="CT">CT Scan</MenuItem>
            <MenuItem value="ULTRASOUND">Ultrasound</MenuItem>
            <MenuItem value="OTHER">Other</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : images.length === 0 ? (
        <Alert severity="info">
          No images found. Try changing your search or filter criteria.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {images.map((image) => {
            const metadata = image.metadata as ImageMetadata;
            return (
              <Grid item xs={12} sm={6} md={4} key={image.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={image.s3Url || `/api/images/${image.id}/thumbnail`}
                    alt={image.filename || `Image ${image.id}`}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {image.filename || `Image ${image.id}`}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                      <Chip 
                        label={image.type || 'Unknown'} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                      {metadata?.modality && (
                        <Chip 
                          label={metadata.modality} 
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Uploaded on: {new Date(image.uploadDate).toLocaleDateString()}
                    </Typography>
                    {metadata?.scanDate && (
                      <Typography variant="body2" color="text.secondary">
                        Study date: {new Date(metadata.scanDate).toLocaleDateString()}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      startIcon={<ViewIcon />}
                      onClick={() => handleView(image.id)}
                    >
                      View
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<ShareIcon />}
                      onClick={() => handleShare(image.id)}
                    >
                      Share
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload(image.id)}
                    >
                      Download
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
} 