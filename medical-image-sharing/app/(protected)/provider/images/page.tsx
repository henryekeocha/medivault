'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Tabs, 
  Tab,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Autocomplete,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Breadcrumbs,
  Pagination,
  Stack,
} from '@mui/material';
import {
  Share as ShareIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Biotech as BiotechIcon,
  Analytics as AnalyticsIcon,
  Image as ImageIcon,
  MedicalServices as MedicalIcon,
  Person as PersonIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageStatus, ImageType } from '@prisma/client';
import { ImageViewer } from '@/components/images/ImageViewer';
import { ImageAnalysis } from '@/components/images/ImageAnalysis';
import { useToast } from '@/contexts/ToastContext';
import { imageService } from '@/lib/api/services/image.service';
import { providerClient } from '@/lib/api/providerClient';
import { Image, PaginatedResponse, ApiResponse, User, ImageListResponse } from '@/lib/api/types';
import { Role } from '@prisma/client';
import { format } from 'date-fns';
import { useUser } from '@clerk/nextjs';

// Image filter and sort options
type SortOption = 'newest' | 'oldest' | 'name' | 'type';
type FilterType = 'all' | 'xray' | 'mri' | 'ct' | 'ultrasound' | 'other';

// Patient selection type
interface PatientOption {
  id: string;
  name: string;
}

// Helper function to check if response is paginated
const isPaginatedResponse = (data: PaginatedResponse<Image> | Image[]): data is PaginatedResponse<Image> => {
  return !Array.isArray(data) && 'data' in data && 'pagination' in data;
};

export default function ProviderImagesPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  // Search, filter, and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  
  // Selected patient state
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  
  // Selected image state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  
  // Filter menu state
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  
  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Check if user has provider role in metadata
    const userRole = user.publicMetadata.role;
    if (userRole !== 'PROVIDER') {
      router.push('/dashboard');
      return;
    }

    if (userRole) {
      imageService.setUserRole(userRole);
    }
  }, [isLoaded, user, router]);
  
  // Convert filter type to API filter
  const getImageTypeFilter = (): ImageType | undefined => {
    switch (filterType) {
      case 'xray': return ImageType.XRAY;
      case 'mri': return ImageType.MRI;
      case 'ct': return ImageType.CT;
      case 'ultrasound': return ImageType.ULTRASOUND;
      case 'other': return ImageType.OTHER;
      default: return undefined;
    }
  };
  
  // Search for patients
  const searchPatients = async (query: string) => {
    if (query.length < 2) return;
    
    setIsLoadingPatients(true);
    try {
      const response = await providerClient.searchPatients({ query });
      if (response.status === 'success' && response.data) {
        const patientOptions: PatientOption[] = response.data.items.map((patient: User) => ({
          id: patient.id,
          name: patient.name
        }));
        setPatientOptions(patientOptions);
      } else {
        showError('Failed to search patients');
      }
    } catch (error) {
      console.error('Failed to search patients:', error);
      showError('Failed to search patients');
    } finally {
      setIsLoadingPatients(false);
    }
  };
  
  // Fetch images query
  const { 
    data: imagesResponse, 
    isLoading, 
    isError, 
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['provider-images', selectedPatient?.id, filterType, sortOption, page, searchTerm],
    queryFn: async () => {
      try {
        const params = {
          page,
          limit,
          patientId: selectedPatient?.id,
        };
        
        const response = await imageService.getImages(params);
        
        if (response.status === 'success') {
          // Handle all possible response data types
          let images: Image[] = [];
          
          if (Array.isArray(response.data)) {
            images = response.data;
          } else if (response.data && typeof response.data === 'object') {
            if ('images' in response.data) {
              images = (response.data as ImageListResponse).images;
            } else if (isPaginatedResponse(response.data)) {
              images = response.data.data;
            }
          }
              
          let filteredImages = [...images];
          
          // Apply type filter
          const typeFilter = getImageTypeFilter();
          if (typeFilter) {
            filteredImages = filteredImages.filter((image) => image.type === typeFilter);
          }
          
          // Apply search filter
          if (searchTerm) {
            filteredImages = filteredImages.filter((image) => 
              image.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (image.metadata as any)?.notes?.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }
          
          // Apply sorting
          filteredImages.sort((a, b) => {
            switch (sortOption) {
              case 'newest':
                return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
              case 'oldest':
                return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
              case 'name':
                return a.filename.localeCompare(b.filename);
              case 'type':
                return a.type.localeCompare(b.type);
              default:
                return 0;
            }
          });
          
          // Return in PaginatedResponse format
          return {
            status: 'success' as const,
            data: {
              data: filteredImages,
              pagination: {
                total: filteredImages.length,
                pages: Math.ceil(filteredImages.length / limit),
                page,
                limit
              }
            }
          } as ApiResponse<PaginatedResponse<Image>>;
        }
        
        return response;
      } catch (err) {
        console.error('Error fetching images:', err);
        showError('Failed to load images. Please try again later.');
        throw err;
      }
    },
    enabled: !!user,
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  // Handle image actions
  const handleView = (imageId: string) => {
    setSelectedImage(imageId);
    setViewerOpen(true);
  };
  
  const handleAnalyze = (imageId: string) => {
    router.push(`/provider/analysis?id=${imageId}`);
  };
  
  const handleShare = (imageId: string) => {
    router.push(`/provider/share/image/${imageId}` as any);
  };
  
  const handleDownload = async (imageId: string) => {
    try {
      const blob = await imageService.downloadImage(imageId);
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a link element
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${imageId}.jpg`; // You might want to get the actual filename
      
      // Add to document and click
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Image downloaded successfully');
    } catch (error) {
      console.error('Error downloading image:', error);
      showError('Failed to download image');
    }
  };
  
  // Mutation for deleting images
  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => {
      return imageService.deleteImage(imageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-images'] });
      showSuccess('Image deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting image:', error);
      showError('Failed to delete image');
    }
  });
  
  const handleDelete = (imageId: string) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      deleteImageMutation.mutate(imageId);
    }
  };
  
  // Handle pagination change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setSortOption('newest');
    setSelectedPatient(null);
    setPage(1);
  };
  
  // Get display text for filter type
  const getFilterTypeDisplay = () => {
    switch (filterType) {
      case 'xray': return 'X-Ray';
      case 'mri': return 'MRI';
      case 'ct': return 'CT Scan';
      case 'ultrasound': return 'Ultrasound';
      case 'other': return 'Other';
      default: return 'All Types';
    }
  };
  
  // Get display text for sort option
  const getSortOptionDisplay = () => {
    switch (sortOption) {
      case 'newest': return 'Newest First';
      case 'oldest': return 'Oldest First';
      case 'name': return 'Name (A-Z)';
      case 'type': return 'Image Type';
      default: return 'Newest First';
    }
  };
  
  // Get chip color based on image type
  const getImageTypeColor = (type: string): 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'default' => {
    switch (type) {
      case 'XRAY': return 'primary';
      case 'MRI': return 'secondary';
      case 'CT': return 'info';
      case 'ULTRASOUND': return 'success';
      default: return 'default';
    }
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link href="/provider/dashboard" passHref>
          <Typography color="inherit" sx={{ cursor: 'pointer' }}>Dashboard</Typography>
        </Link>
        <Typography color="text.primary">Patient Images</Typography>
      </Breadcrumbs>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Patient Images</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => router.push('/provider/upload')}
          startIcon={<ImageIcon />}
        >
          Upload Images
        </Button>
      </Box>
      
      {/* Search and filter controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search by filename, diagnosis, body part..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                endAdornment: searchTerm ? (
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                ) : null,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={patientOptions}
              getOptionLabel={(option) => option.name}
              value={selectedPatient}
              onChange={(_, newValue) => setSelectedPatient(newValue)}
              onInputChange={(_, value) => searchPatients(value)}
              loading={isLoadingPatients}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Patient"
                  placeholder="Search for a patient"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <PersonIcon sx={{ color: 'text.secondary', mr: 1 }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                    endAdornment: (
                      <>
                        {isLoadingPatients ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
          
          <Grid item xs={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterIcon />}
              endIcon={<Typography variant="caption">{getFilterTypeDisplay()}</Typography>}
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            >
              Filter
            </Button>
            <Menu
              anchorEl={filterAnchorEl}
              open={Boolean(filterAnchorEl)}
              onClose={() => setFilterAnchorEl(null)}
            >
              <MenuItem 
                onClick={() => { setFilterType('all'); setFilterAnchorEl(null); }}
                selected={filterType === 'all'}
              >
                <ListItemText>All Types</ListItemText>
              </MenuItem>
              <MenuItem 
                onClick={() => { setFilterType('xray'); setFilterAnchorEl(null); }}
                selected={filterType === 'xray'}
              >
                <ListItemText>X-Ray</ListItemText>
              </MenuItem>
              <MenuItem 
                onClick={() => { setFilterType('mri'); setFilterAnchorEl(null); }}
                selected={filterType === 'mri'}
              >
                <ListItemText>MRI</ListItemText>
              </MenuItem>
              <MenuItem 
                onClick={() => { setFilterType('ct'); setFilterAnchorEl(null); }}
                selected={filterType === 'ct'}
              >
                <ListItemText>CT Scan</ListItemText>
              </MenuItem>
              <MenuItem 
                onClick={() => { setFilterType('ultrasound'); setFilterAnchorEl(null); }}
                selected={filterType === 'ultrasound'}
              >
                <ListItemText>Ultrasound</ListItemText>
              </MenuItem>
              <MenuItem 
                onClick={() => { setFilterType('other'); setFilterAnchorEl(null); }}
                selected={filterType === 'other'}
              >
                <ListItemText>Other</ListItemText>
              </MenuItem>
            </Menu>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<SortIcon />}
              endIcon={<Typography variant="caption">{getSortOptionDisplay()}</Typography>}
              onClick={(e) => setSortAnchorEl(e.currentTarget)}
            >
              Sort
            </Button>
            <Menu
              anchorEl={sortAnchorEl}
              open={Boolean(sortAnchorEl)}
              onClose={() => setSortAnchorEl(null)}
            >
              <MenuItem 
                onClick={() => { setSortOption('newest'); setSortAnchorEl(null); }}
                selected={sortOption === 'newest'}
              >
                <ListItemText>Newest First</ListItemText>
              </MenuItem>
              <MenuItem 
                onClick={() => { setSortOption('oldest'); setSortAnchorEl(null); }}
                selected={sortOption === 'oldest'}
              >
                <ListItemText>Oldest First</ListItemText>
              </MenuItem>
              <MenuItem 
                onClick={() => { setSortOption('name'); setSortAnchorEl(null); }}
                selected={sortOption === 'name'}
              >
                <ListItemText>Name (A-Z)</ListItemText>
              </MenuItem>
              <MenuItem 
                onClick={() => { setSortOption('type'); setSortAnchorEl(null); }}
                selected={sortOption === 'type'}
              >
                <ListItemText>Image Type</ListItemText>
              </MenuItem>
            </Menu>
          </Grid>
          
          {(searchTerm || filterType !== 'all' || sortOption !== 'newest' || selectedPatient) && (
            <Grid item xs={12}>
              <Box display="flex" gap={1} flexWrap="wrap">
                {searchTerm && (
                  <Chip 
                    label={`Search: ${searchTerm}`} 
                    onDelete={() => setSearchTerm('')}
                    color="primary"
                  />
                )}
                
                {filterType !== 'all' && (
                  <Chip 
                    label={`Type: ${getFilterTypeDisplay()}`} 
                    onDelete={() => setFilterType('all')}
                    color="info"
                  />
                )}
                
                {sortOption !== 'newest' && (
                  <Chip 
                    label={`Sort: ${getSortOptionDisplay()}`} 
                    onDelete={() => setSortOption('newest')}
                    color="secondary"
                  />
                )}
                
                {selectedPatient && (
                  <Chip 
                    label={`Patient: ${selectedPatient.name}`} 
                    onDelete={() => setSelectedPatient(null)}
                    color="success"
                  />
                )}
                
                <Button 
                  size="small" 
                  startIcon={<ClearIcon />}
                  onClick={handleResetFilters}
                >
                  Clear All
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {/* Images Grid */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          Error loading images: {(error as any)?.message || 'Unknown error occurred'}
        </Alert>
      ) : (!imagesResponse?.data || !isPaginatedResponse(imagesResponse.data) || imagesResponse.data.data.length === 0) ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No images found
          </Typography>
          <Typography color="text.secondary">
            {selectedPatient ? 'This patient has no images yet.' : 'Select a patient to view their images.'}
          </Typography>
        </Paper>
      ) : (
        <>
          <Grid container spacing={3}>
            {imagesResponse.data.data.map((image: Image) => (
              <Grid item key={image.id} xs={12} sm={6} md={4} lg={3}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component="img"
                    sx={{
                      height: 200,
                      objectFit: 'contain',
                      bgcolor: 'background.default'
                    }}
                    image={image.s3Url || `/api/images/${image.id}/view`}
                    alt={image.filename}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.src = '/placeholder-image.png';
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="h2" noWrap>
                      {image.filename}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Patient: {image.user?.name || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Type: {image.type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Uploaded: {format(new Date(image.uploadDate), 'MMM d, yyyy')}
                    </Typography>
                    {image.studyDate && (
                      <Typography variant="body2" color="text.secondary">
                        Study Date: {format(new Date(image.studyDate), 'MMM d, yyyy')}
                      </Typography>
                    )}
                    {image.modality && (
                      <Typography variant="body2" color="text.secondary">
                        Modality: {image.modality}
                      </Typography>
                    )}
                    {image.tags && image.tags.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {image.tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                  <CardActions>
                    <IconButton
                      size="small"
                      onClick={() => handleView(image.id)}
                      title="View"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleAnalyze(image.id)}
                      title="Analyze"
                    >
                      <BiotechIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleShare(image.id)}
                      title="Share"
                    >
                      <ShareIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(image.id)}
                      title="Download"
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(image.id)}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={imagesResponse.data.pagination.pages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      )}
      
      {/* Image Viewer Dialog */}
      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Image Viewer</Typography>
            <IconButton onClick={() => setViewerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ height: '80vh', p: 0 }}>
          {selectedImage && (
            <ImageViewer
              image={{ id: selectedImage, s3Key: `/api/images/${selectedImage}/view` } as any}
              onClose={() => setViewerOpen(false)}
              readOnly={true}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Image Analysis Dialog */}
      <Dialog
        open={analysisOpen}
        onClose={() => setAnalysisOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Image Analysis</Typography>
            <IconButton onClick={() => setAnalysisOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedImage && (
            <ImageAnalysis
              imageId={selectedImage}
              onAnalysisComplete={() => {
                // Optionally handle analysis completion
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
} 