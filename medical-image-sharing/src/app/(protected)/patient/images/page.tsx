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
import { ApiClient } from '@/lib/api/client';
import { Image, ImageType, ImageStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';

// Define our own Image type to match what we expect from the API
interface ImageData {
  id: string;
  patientId: string;
  type: string;
  status: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  s3Url?: string;
  filename?: string;
  modality?: string;
  uploadDate?: string;
  studyDate?: string;
}

export default function PatientImagesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchImages();
  }, [filterType]);

  const fetchImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getImages({
        type: filterType as ImageType || undefined,
        status: ImageStatus.READY, // Only show ready images
        page: 1,
        limit: 20,
        search: searchTerm
      });
      
      if (response.status === 'success') {
        // Convert the API response to our ImageData type
        setImages(response.data.data.map((img: any) => ({
          ...img,
          // Ensure metadata is properly typed if needed
          metadata: img.metadata || {}
        })));
      } else {
        setError('Failed to load images');
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('An error occurred while fetching images');
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
    try {
      const apiClient = ApiClient.getInstance();
      // Navigate to share page with the image ID
      router.push(`/patient/share?imageId=${imageId}` as any);
    } catch (err) {
      console.error('Error initiating share:', err);
    }
  };

  const handleDownload = async (imageId: string) => {
    try {
      const apiClient = ApiClient.getInstance();
      const blob = await apiClient.downloadImage(imageId);
      
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
      console.error('Error downloading image:', err);
      setError('Failed to download image');
    }
  };

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
          {images.map((image) => (
            <Grid item xs={12} sm={6} md={4} key={image.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="180"
                  image={image.s3Url || image.url || `/api/images/${image.id}/thumbnail`}
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
                    {image.modality && (
                      <Chip 
                        label={image.modality} 
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Uploaded on: {new Date(image.uploadDate || image.createdAt).toLocaleDateString()}
                  </Typography>
                  {image.studyDate && (
                    <Typography variant="body2" color="text.secondary">
                      Study date: {new Date(image.studyDate).toLocaleDateString()}
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
          ))}
        </Grid>
      )}
    </Container>
  );
} 