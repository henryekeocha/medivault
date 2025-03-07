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
import { ApiClient } from '@/lib/api/client';
import { format } from 'date-fns';
import { ImageStatus, ImageType } from '@prisma/client';
import { ImageViewer } from '@/components/images/ImageViewer';
import { ImageAnalysis } from '@/components/images/ImageAnalysis';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

// Image filter and sort options
type SortOption = 'newest' | 'oldest' | 'name' | 'type';
type FilterType = 'all' | 'xray' | 'mri' | 'ct' | 'ultrasound' | 'other';

// Patient selection type
interface PatientOption {
  id: string;
  name: string;
}

export default function ProviderImagesPage() {
  const { user } = useAuth();
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
      const response = await ApiClient.getInstance().searchPatients({ query });
      setPatientOptions(response.data.items.map((patient: any) => ({
        id: patient.id,
        name: patient.name || `${patient.firstName} ${patient.lastName}`
      })));
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
    refetch
  } = useQuery({
    queryKey: ['provider-images', selectedPatient?.id, filterType, sortOption, page, searchTerm],
    queryFn: async () => {
      const apiClient = ApiClient.getInstance();
      const params: any = {
        page,
        limit,
        status: ImageStatus.READY,
        type: getImageTypeFilter(),
        search: searchTerm || undefined,
        patientId: selectedPatient?.id,
      };
      
      // Add sorting
      switch (sortOption) {
        case 'newest':
          params.sortBy = 'uploadDate';
          params.sortOrder = 'desc';
          break;
        case 'oldest':
          params.sortBy = 'uploadDate';
          params.sortOrder = 'asc';
          break;
        case 'name':
          params.sortBy = 'filename';
          params.sortOrder = 'asc';
          break;
        case 'type':
          params.sortBy = 'type';
          params.sortOrder = 'asc';
          break;
      }
      
      return await apiClient.getImages(params);
    },
    enabled: !!user
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
      const apiClient = ApiClient.getInstance();
      const blob = await apiClient.downloadImage(imageId);
      
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
      return ApiClient.getInstance().deleteImage(imageId);
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
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading images: {(error as any)?.message || 'Unknown error occurred'}
        </Alert>
      ) : imagesResponse?.data?.data.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No images found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm || filterType !== 'all' || selectedPatient
              ? 'Try adjusting your search filters'
              : 'Upload some images to get started'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            onClick={() => router.push('/provider/upload')}
          >
            Upload Images
          </Button>
        </Paper>
      ) : (
        <>
          <Grid container spacing={3}>
            {imagesResponse?.data?.data.map((image: any) => (
              <Grid item key={image.id} xs={12} sm={6} md={4} lg={3}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box 
                    sx={{ 
                      position: 'relative',
                      height: 200,
                      bgcolor: 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    {image.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={image.thumbnailUrl} 
                        alt={image.filename}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '100%', 
                          objectFit: 'contain' 
                        }}
                      />
                    ) : (
                      <ImageIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                    )}
                    <Chip
                      label={image.type}
                      size="small"
                      color={getImageTypeColor(image.type)}
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  </Box>
                  
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" noWrap title={image.filename}>
                      {image.filename}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {image.studyDate 
                        ? format(new Date(image.studyDate), 'MMM d, yyyy') 
                        : format(new Date(image.uploadDate), 'MMM d, yyyy')}
                    </Typography>
                    
                    {image.patientName && (
                      <Typography variant="body2">
                        Patient: {image.patientName}
                      </Typography>
                    )}
                    
                    {image.bodyPart && (
                      <Typography variant="body2" color="text.secondary">
                        Body Part: {image.bodyPart}
                      </Typography>
                    )}
                    
                    {image.diagnosis && (
                      <Typography variant="body2" color="text.secondary">
                        Diagnosis: {image.diagnosis}
                      </Typography>
                    )}
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Box>
                      <Tooltip title="View Image">
                        <IconButton onClick={() => handleView(image.id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Share Image">
                        <IconButton onClick={() => handleShare(image.id)}>
                          <ShareIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download Image">
                        <IconButton onClick={() => handleDownload(image.id)}>
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Image">
                        <IconButton 
                          onClick={() => handleDelete(image.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Button
                      variant="contained"
                      startIcon={<BiotechIcon />}
                      size="small"
                      onClick={() => handleAnalyze(image.id)}
                    >
                      Analyze
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {/* Pagination */}
          {imagesResponse?.data?.pagination?.pages && imagesResponse.data.pagination.pages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination 
                count={imagesResponse.data.pagination.pages} 
                page={page} 
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
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