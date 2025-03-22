'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  Button,
  TextField,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  FormControl,
  InputLabel, 
  Select,
  MenuItem,
  Rating,
  Tabs,
  Tab,
  Breadcrumbs,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as AiIcon,
  MedicalServices as DiagnosisIcon,
  Biotech as AnalysisIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Visibility as ViewIcon,
  HistoryToggleOff as AiAssistIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api/client';
import { ImageViewer } from '@/components/images/ImageViewer';
import { ImageAnalysis as ImageAnalysisComponent } from '@/components/images/ImageAnalysis';
import { ApiResponse, PaginatedResponse, ImageAnalysis, AnalysisFinding, Image } from '@/lib/api/types';
import { format } from 'date-fns';
import { useToast } from '@/components/Toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { ImageType } from '@prisma/client';

// Define a custom BodyPart enum that matches what's used in the application
enum BodyPart {
  HEAD = 'HEAD',
  NECK = 'NECK',
  CHEST = 'CHEST',
  ABDOMEN = 'ABDOMEN',
  PELVIS = 'PELVIS',
  SPINE = 'SPINE',
  UPPER_EXTREMITY = 'UPPER_EXTREMITY',
  LOWER_EXTREMITY = 'LOWER_EXTREMITY',
  OTHER = 'OTHER'
}

// Define tabs for the analysis page
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
      {...other}
      style={{ minHeight: '60vh' }}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `analysis-tab-${index}`,
    'aria-controls': `analysis-tabpanel-${index}`,
  };
}

// Confidence levels for analysis
const confidenceLevels = [
  { value: 0.99, label: 'Very High (99%)' },
  { value: 0.9, label: 'High (90%)' },
  { value: 0.8, label: 'Good (80%)' },
  { value: 0.7, label: 'Moderate (70%)' },
  { value: 0.6, label: 'Fair (60%)' },
  { value: 0.5, label: 'Low (50%)' },
  { value: 0.3, label: 'Very Low (30%)' },
];

export default function ImageAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { 
    error, 
    handleError, 
    clearError, 
    withErrorHandling 
  } = useErrorHandler({
    context: 'Image analysis',
    showToastByDefault: true
  });
  
  // Extract image ID from URL params
  const imageId = searchParams.get('id');
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Analysis state
  const [editingDiagnosis, setEditingDiagnosis] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [confidence, setConfidence] = useState<number>(0.9);
  const [bodyPart, setBodyPart] = useState<BodyPart | ''>('');
  const [notes, setNotes] = useState('');
  
  // AI assistance state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<AnalysisFinding[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AnalysisFinding[]>([]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Fetch image data
  const {
    data: imageData,
    isLoading: imageLoading,
    isError: imageError,
    error: imageErrorDetails,
    refetch: refetchImage
  } = useQuery({
    queryKey: ['image', imageId],
    queryFn: async () => {
      if (!imageId) throw new Error('No image ID provided');
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getImage(imageId);
      
      if (response.status !== 'success' || !response.data) {
        throw new Error(response.error?.message || 'Failed to load image data');
      }
      
      return response.data;
    },
    enabled: !!imageId,
  });
  
  // Fetch analysis data
  const {
    data: analysisData,
    isLoading: analysisLoading,
    isError: analysisError,
    error: analysisErrorDetails,
    refetch: refetchAnalysis
  } = useQuery({
    queryKey: ['analysis', imageId],
    queryFn: async () => {
      if (!imageId) throw new Error('No image ID provided');
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getAnalyses({ imageId });
      
      if (response.status !== 'success' || !response.data) {
        throw new Error(response.error?.message || 'Failed to load analysis data');
      }
      
      // Get the most recent analysis if available
      const analyses = response.data.data || [];
      return analyses.length > 0 ? analyses[0] : null;
    },
    enabled: !!imageId,
  });
  
  // Set initial form values from analysis data
  useEffect(() => {
    if (analysisData) {
      setDiagnosis(analysisData.diagnosis || '');
      setConfidence(analysisData.confidence || 0.9);
      setNotes(analysisData.notes || '');
      
      if (analysisData.findings && typeof analysisData.findings === 'string') {
        try {
          const parsedFindings = JSON.parse(analysisData.findings);
          setAiResults(parsedFindings);
        } catch (e) {
          console.error('Error parsing findings:', e);
          setAiResults([]);
        }
      } else if (Array.isArray(analysisData.findings)) {
        setAiResults(analysisData.findings);
      }
    }
  }, [analysisData]);
  
  // Set initial bodyPart from image data
  useEffect(() => {
    if (imageData?.bodyPart) {
      setBodyPart(imageData.bodyPart as BodyPart);
    }
  }, [imageData]);
  
  // Update analysis mutation
  const updateAnalysisMutation = useMutation({
    mutationFn: async (selectedFinding: AnalysisFinding) => {
      if (!analysisData) return null;
      
      // Add the finding to our results
      const newResults = [...aiResults, selectedFinding];
      setAiResults(newResults);
      
      // Update the analysis
      return await ApiClient.getInstance().updateAnalysis(analysisData.id, {
        findings: JSON.stringify(newResults),
        confidence: selectedFinding.confidence || confidence
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis', imageId] });
      showSuccess('Analysis updated with finding');
      setShowAiSuggestions(false);
    },
    onError: (error) => {
      handleError(error);
    }
  });
  
  // Save analysis changes
  const handleSaveAnalysis = async () => {
    try {
      clearError();
      
      // Get API client
      const apiClient = ApiClient.getInstance();
      
      if (analysisData?.id) {
        // Update existing analysis
        const response = await apiClient.updateAnalysis(analysisData.id, {
          findings: JSON.stringify(aiResults),
          notes,
          diagnosis,
          confidence
        });
        
        if (response.status === 'success') {
          showSuccess('Analysis updated successfully');
          refetchAnalysis(); // Refresh analysis data
        } else {
          throw new Error(response.error?.message || 'Failed to update analysis');
        }
      } else {
        // Create new analysis
        const createAnalysisData = {
          imageId: imageId!,
          type: "AI_ASSISTED", // Required field for CreateAnalysisRequest
          metadata: {
            notes,
            findings: JSON.stringify(aiResults)
          }
        };
        
        const response = await apiClient.analyzeImage(createAnalysisData);
        
        if (response.status === 'success') {
          showSuccess('Analysis created successfully');
          refetchAnalysis(); // Refresh analysis data
        } else {
          throw new Error(response.error?.message || 'Failed to create analysis');
        }
      }
    } catch (error) {
      handleError(error);
    }
  };
  
  // Handle AI suggestions
  const handleAIAnalysis = async () => {
    if (!imageId) return;
    
    setAiLoading(true);
    setShowAiSuggestions(false);
    
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getAIAnalysis(imageId);
      
      if (response.status === 'success' && response.data) {
        const suggestions = response.data.suggestions || [];
        // Map the API response to the expected AnalysisFinding type structure
        const mappedSuggestions = suggestions.map((suggestion: any) => {
          // Determine severity based on confidence
          const severityValue: 'low' | 'medium' | 'high' = 
            suggestion.confidence > 0.7 ? 'high' 
            : suggestion.confidence > 0.4 ? 'medium' 
            : 'low';
            
          return {
            title: suggestion.type || 'Finding',
            description: suggestion.description || '',
            severity: severityValue,
            confidence: suggestion.confidence,
            metadata: suggestion.metadata
          };
        });
        setAiSuggestions(mappedSuggestions);
        setShowAiSuggestions(true);
      } else {
        showError(response.error?.message || 'Failed to get AI suggestions');
      }
    } catch (error) {
      handleError(error);
    } finally {
      setAiLoading(false);
    }
  };
  
  // Apply an AI suggestion to the analysis
  const handleAddSuggestion = (suggestion: AnalysisFinding) => {
    // Check if this suggestion already exists in the results to prevent duplicates
    const exists = aiResults.some(
      result => result.title === suggestion.title && result.confidence === suggestion.confidence
    );
    
    if (!exists) {
      const updatedResults = [...aiResults, suggestion];
      setAiResults(updatedResults);
      
      // If it's the first finding and we don't have a diagnosis yet, use it as a diagnosis
      if (aiResults.length === 0 && !diagnosis.trim()) {
        setDiagnosis(suggestion.title);
        setConfidence(suggestion.confidence || 0.8);
      }
      
      showSuccess('AI suggestion added to analysis');
    } else {
      showError('This finding is already included in your analysis');
    }
  };
  
  // Handle AI suggestion selection
  const handleSuggestionSelect = (suggestion: AnalysisFinding) => {
    updateAnalysisMutation.mutate(suggestion);
  };

  // Save diagnosis
  const handleSaveDiagnosis = async () => {
    if (!analysisData?.id) return;
    
    try {
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.updateAnalysis(analysisData.id, {
        diagnosis,
        confidence,
        metadata: {
          ...analysisData.metadata,
          notes: notes
        }
      });
      
      if (response.status === 'success') {
        setEditingDiagnosis(false);
        showSuccess('Diagnosis updated successfully');
        queryClient.invalidateQueries({ queryKey: ['analysis', imageId] });
      } else {
        showError(response.error?.message || 'Failed to update diagnosis');
      }
    } catch (error) {
      handleError(error);
    }
  };
  
  // If no image ID is provided, show error
  if (!imageId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">No image ID provided. Please select an image to analyze.</Alert>
        <Button
          variant="contained"
          startIcon={<BackIcon />}
          onClick={() => router.push('/provider/images')}
          sx={{ mt: 2 }}
        >
          Return to Images
        </Button>
      </Container>
    );
  }
  
  // Loading state
  if (imageLoading || analysisLoading) {
    return <LoadingState message="Loading image and analysis data..." fullScreen />;
  }
  
  // Error state
  if (imageError || analysisError) {
    return (
      <LoadingState
        error={String(imageError || analysisError)}
        onRetry={() => {
          refetchImage();
          refetchAnalysis();
        }}
        fullScreen
      />
    );
  }
  
  const image = imageData;
  const analysis = analysisData;
  
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link href="/provider/dashboard" passHref>
          <Typography color="inherit" sx={{ cursor: 'pointer' }}>Dashboard</Typography>
        </Link>
        <Link href="/provider/images" passHref>
          <Typography color="inherit" sx={{ cursor: 'pointer' }}>Images</Typography>
        </Link>
        <Typography color="text.primary">Image Analysis</Typography>
      </Breadcrumbs>
      
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Image Analysis</Typography>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => router.push('/provider/images')}
        >
          Back to Images
        </Button>
      </Box>
      
      {/* Image Info Card */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>{image?.filename || 'Image'}</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip 
                label={image?.type || 'Unknown Type'} 
                color="primary"
                size="small"
              />
              {image?.studyDate && (
                <Chip 
                  label={format(new Date(image.studyDate), 'MMM d, yyyy')} 
                  size="small"
                />
              )}
              {image?.bodyPart && (
                <Chip 
                  label={image.bodyPart} 
                  size="small"
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {image?.patientId && `Patient ID: ${image.patientId}`}
            </Typography>
            {image?.notes && (
              <Typography variant="body2" color="text.secondary">
                Notes: {image.notes}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<ViewIcon />}
              onClick={() => setTabValue(0)}
              sx={{ mr: 1 }}
            >
              View Image
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AiAssistIcon />}
              onClick={handleAIAnalysis}
              disabled={aiLoading}
            >
              {aiLoading ? 'Analyzing...' : 'AI Assist'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="analysis tabs">
          <Tab label="Image Viewer" icon={<ViewIcon />} iconPosition="start" {...a11yProps(0)} />
          <Tab label="AI Analysis" icon={<AiIcon />} iconPosition="start" {...a11yProps(1)} />
          <Tab label="Diagnosis" icon={<DiagnosisIcon />} iconPosition="start" {...a11yProps(2)} />
        </Tabs>
      </Box>
      
      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ height: '70vh', width: '100%', bgcolor: 'background.paper' }}>
          {imageId && (
            <ImageViewer
              image={{ 
                id: imageId, 
                s3Key: `/api/images/${imageId}/view`,
                filename: imageData?.filename || '',
                fileType: imageData?.fileType || '',
                fileSize: imageData?.fileSize || 0,
                uploadDate: imageData?.uploadDate || new Date(),
                status: imageData?.status || 'PENDING',
                type: imageData?.type || 'XRAY',
                tags: imageData?.tags || []
              } as Image}
              readOnly={false}
              onClose={() => {}}
            />
          )}
        </Box>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Analysis Findings</Typography>
                  <Box>
                    <IconButton onClick={() => refetchAnalysis()} title="Refresh analysis">
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </Box>
                
                {aiResults.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No findings available. Click "AI Assist" to generate analysis suggestions.
                  </Alert>
                ) : (
                  aiResults.map((finding, index) => (
                    <Accordion key={index} sx={{ mb: 1 }}>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`finding-content-${index}`}
                        id={`finding-header-${index}`}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {finding.severity === 'high' && <ErrorIcon color="error" sx={{ mr: 1 }} />}
                          {finding.severity === 'medium' && <WarningIcon color="warning" sx={{ mr: 1 }} />}
                          {finding.severity === 'low' && <InfoIcon color="info" sx={{ mr: 1 }} />}
                          <Typography>{finding.title}</Typography>
                          {finding.confidence && (
                            <Chip
                              size="small"
                              label={`${(finding.confidence * 100).toFixed(0)}%`}
                              color={finding.confidence > 0.8 ? "success" : "warning"}
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {finding.description}
                        </Typography>
                        
                        <Box sx={{ mt: 1 }}>
                          <FormControl size="small" sx={{ width: 150, mr: 1 }}>
                            <InputLabel>Severity</InputLabel>
                            <Select
                              value={finding.severity}
                              label="Severity"
                              onChange={(e) => {
                                const newFindings = [...aiResults];
                                newFindings[index] = {
                                  ...finding,
                                  severity: e.target.value as AnalysisFinding['severity'],
                                };
                                setAiResults(newFindings);
                              }}
                            >
                              <MenuItem value="high">High</MenuItem>
                              <MenuItem value="medium">Medium</MenuItem>
                              <MenuItem value="low">Low</MenuItem>
                            </Select>
                          </FormControl>
                          
                          <FormControl size="small" sx={{ width: 150 }}>
                            <InputLabel>Confidence</InputLabel>
                            <Select
                              value={finding.confidence || 0.7}
                              label="Confidence"
                              onChange={(e) => {
                                const newFindings = [...aiResults];
                                newFindings[index] = {
                                  ...finding,
                                  confidence: e.target.value as number,
                                };
                                setAiResults(newFindings);
                              }}
                            >
                              {confidenceLevels.map((level) => (
                                <MenuItem key={level.value} value={level.value}>
                                  {level.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          
                          <Button
                            size="small"
                            color="error"
                            sx={{ ml: 1 }}
                            onClick={() => {
                              const newFindings = aiResults.filter((_, i) => i !== index);
                              setAiResults(newFindings);
                            }}
                          >
                            Remove
                          </Button>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveAnalysis}
                    disabled={updateAnalysisMutation.isPending}
                  >
                    {updateAnalysisMutation.isPending ? 'Saving...' : 'Save Findings'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>AI Suggestions</Typography>
                
                {aiLoading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" p={4}>
                    <CircularProgress />
                  </Box>
                ) : showAiSuggestions ? (
                  <>
                    {aiSuggestions.length > 0 ? (
                      aiSuggestions.map((suggestion, index) => (
                        <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                          <CardContent>
                            <Typography variant="subtitle1">{suggestion.title}</Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {suggestion.description}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                              <Chip
                                size="small"
                                label={`${(suggestion.confidence ? suggestion.confidence * 100 : 0).toFixed(0)}%`}
                                color={suggestion.confidence && suggestion.confidence > 0.8 ? "success" : "warning"}
                              />
                              <Button
                                size="small"
                                onClick={() => handleSuggestionSelect(suggestion)}
                              >
                                Add to Findings
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        No AI suggestions available for this image.
                      </Alert>
                    )}
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => setShowAiSuggestions(false)}
                      sx={{ mt: 1 }}
                    >
                      Hide Suggestions
                    </Button>
                  </>
                ) : (
                  <Box textAlign="center" p={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Click "AI Assist" to get suggestions based on image analysis.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AiAssistIcon />}
                      onClick={handleAIAnalysis}
                      sx={{ mt: 1 }}
                    >
                      AI Assist
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">Diagnosis</Typography>
                  {!editingDiagnosis ? (
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => setEditingDiagnosis(true)}
                    >
                      Edit
                    </Button>
                  ) : (
                    <Button
                      startIcon={<SaveIcon />}
                      variant="contained"
                      onClick={handleSaveDiagnosis}
                      disabled={updateAnalysisMutation.isPending}
                    >
                      {updateAnalysisMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  )}
                </Box>
                
                {editingDiagnosis ? (
                  <>
                    <TextField
                      fullWidth
                      label="Diagnosis"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      multiline
                      rows={3}
                      variant="outlined"
                      sx={{ mb: 3 }}
                    />
                    
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel>Body Part</InputLabel>
                      <Select
                        value={bodyPart}
                        onChange={(e) => setBodyPart(e.target.value as BodyPart)}
                        label="Body Part"
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        <MenuItem value="HEAD">Head</MenuItem>
                        <MenuItem value="NECK">Neck</MenuItem>
                        <MenuItem value="CHEST">Chest</MenuItem>
                        <MenuItem value="ABDOMEN">Abdomen</MenuItem>
                        <MenuItem value="PELVIS">Pelvis</MenuItem>
                        <MenuItem value="SPINE">Spine</MenuItem>
                        <MenuItem value="UPPER_EXTREMITY">Upper Extremity</MenuItem>
                        <MenuItem value="LOWER_EXTREMITY">Lower Extremity</MenuItem>
                        <MenuItem value="OTHER">Other</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography gutterBottom>Confidence Level</Typography>
                      <FormControl fullWidth>
                        <Select
                          value={confidence}
                          onChange={(e) => setConfidence(e.target.value as number)}
                        >
                          {confidenceLevels.map((level) => (
                            <MenuItem key={level.value} value={level.value}>
                              {level.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    
                    <TextField
                      fullWidth
                      label="Additional Notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      multiline
                      rows={4}
                      variant="outlined"
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="subtitle1" gutterBottom>
                      Diagnosis:
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                      <Typography variant="body1">
                        {diagnosis || 'No diagnosis has been provided yet.'}
                      </Typography>
                    </Paper>
                    
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Body Part:
                        </Typography>
                        <Typography variant="body1">
                          {bodyPart || 'Not specified'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Confidence Level:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Rating
                            value={confidence * 5}
                            readOnly
                            precision={0.5}
                            max={5}
                          />
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            ({(confidence * 100).toFixed(0)}%)
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    
                    {notes && (
                      <>
                        <Typography variant="subtitle1" gutterBottom>
                          Additional Notes:
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
                          <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                            {notes}
                          </Typography>
                        </Paper>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Summary</Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>
                  Image Type:
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {image?.type || 'Unknown'}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Study Date:
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {image?.studyDate 
                    ? format(new Date(image.studyDate), 'MMMM d, yyyy')
                    : 'Not specified'}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Last Updated:
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {analysis?.updatedAt 
                    ? format(new Date(analysis.updatedAt), 'MMMM d, yyyy h:mm a')
                    : 'Not yet updated'}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Findings:
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {aiResults.length > 0 
                    ? `${aiResults.length} finding(s) identified`
                    : 'No findings recorded'}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => window.print()}
                  sx={{ mb: 1 }}
                >
                  Print Report
                </Button>
                
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => router.push(`/provider/share/image/${imageId}` as any)}
                >
                  Share Results
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
  );
} 