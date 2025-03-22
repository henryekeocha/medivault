'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  CloudUpload as UploadIcon,
  CameraAlt as CameraIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { ApiClient } from '@/lib/api/client';
import { formatDistance } from 'date-fns';
import ProviderSpecialties from '@/config/specialties';

enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

interface VerificationState {
  licenseNumber: string;
  licenseState: string;
  licenseExpiryDate: Date | null;
  specialty: string;
  identityDocument: File | null;
  licenseDocument: File | null;
  selfie: File | null;
  status: VerificationStatus;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  lastVerified: Date | null;
  nextVerification: Date | null;
}

const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
  'Wisconsin', 'Wyoming', 'District of Columbia'
];

export default function ProviderVerificationPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationState>({
    licenseNumber: '',
    licenseState: '',
    licenseExpiryDate: null,
    specialty: '',
    identityDocument: null,
    licenseDocument: null,
    selfie: null,
    status: VerificationStatus.PENDING,
    verifiedAt: null,
    rejectionReason: null,
    lastVerified: null,
    nextVerification: null,
  });
  
  const [processingImage, setProcessingImage] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [showVerificationInfo, setShowVerificationInfo] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Check if the user is authenticated and is a provider
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    if (user?.role !== 'PROVIDER') {
      router.push('/dashboard');
      return;
    }
    
    // Load existing verification data if available
    fetchVerificationData();
  }, [isAuthenticated, user, router]);
  
  const fetchVerificationData = async () => {
    try {
      setIsLoading(true);
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.getProviderVerification();
      
      if (response.status === 'success' && response.data) {
        // Map the data from API to our state format
        const verification = response.data;
        setVerificationData({
          licenseNumber: verification.licenseNumber || '',
          licenseState: verification.licenseState || '',
          licenseExpiryDate: verification.licenseExpiryDate ? new Date(verification.licenseExpiryDate) : null,
          specialty: verification.specialtyName || '',
          identityDocument: null,
          licenseDocument: null,
          selfie: null,
          status: verification.verificationStatus as VerificationStatus,
          verifiedAt: verification.verifiedAt ? new Date(verification.verifiedAt) : null,
          rejectionReason: verification.rejectionReason || null,
          lastVerified: verification.lastVerificationDate ? new Date(verification.lastVerificationDate) : null,
          nextVerification: verification.nextVerificationDate ? new Date(verification.nextVerificationDate) : null,
        });
        
        // If verification exists and is not rejected, show info panel
        if (verification.verificationStatus !== VerificationStatus.REJECTED) {
          setShowVerificationInfo(true);
        }
      }
    } catch (err) {
      console.error('Error fetching verification data:', err);
      setError('Failed to load your verification information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const startCamera = async (forSelfie = true) => {
    try {
      setCameraActive(true);
      setProcessingImage(forSelfie ? 'selfie' : '');
      
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: forSelfie ? 'user' : 'environment' } 
        });
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access your camera. Please check permissions and try again.');
      setCameraActive(false);
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setProcessingImage('');
  };
  
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            // Create a file from the blob
            const now = new Date();
            const file = new File([blob], `${processingImage}_${now.getTime()}.jpg`, { type: 'image/jpeg' });
            
            // Update the state based on which image we're capturing
            if (processingImage === 'selfie') {
              setVerificationData(prev => ({ ...prev, selfie: file }));
            } else if (processingImage === 'identity') {
              setVerificationData(prev => ({ ...prev, identityDocument: file }));
            } else if (processingImage === 'license') {
              setVerificationData(prev => ({ ...prev, licenseDocument: file }));
            }
            
            // Stop the camera
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, fileType: 'identity' | 'license' | 'selfie') => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ 
          ...prev, 
          [fileType]: 'File size exceeds 5MB limit' 
        }));
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('application/pdf')) {
        setErrors(prev => ({ 
          ...prev, 
          [fileType]: 'File must be an image or PDF' 
        }));
        return;
      }
      
      // Clear any previous errors
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fileType];
        return newErrors;
      });
      
      // Update state with the file
      setVerificationData(prev => ({ 
        ...prev, 
        [fileType === 'identity' ? 'identityDocument' : 
         fileType === 'license' ? 'licenseDocument' : 'selfie']: file 
      }));
    }
  };
  
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 0) {
      if (!verificationData.licenseNumber) {
        newErrors.licenseNumber = 'License number is required';
      }
      if (!verificationData.licenseState) {
        newErrors.licenseState = 'State is required';
      }
      if (!verificationData.licenseExpiryDate) {
        newErrors.licenseExpiryDate = 'Expiration date is required';
      } else if (verificationData.licenseExpiryDate < new Date()) {
        newErrors.licenseExpiryDate = 'License cannot be expired';
      }
      if (!verificationData.specialty) {
        newErrors.specialty = 'Medical specialty is required';
      }
    } else if (step === 1) {
      if (!verificationData.identityDocument) {
        newErrors.identityDocument = 'ID document is required';
      }
      if (!verificationData.licenseDocument) {
        newErrors.licenseDocument = 'License document is required';
      }
    } else if (step === 2) {
      if (!verificationData.selfie) {
        newErrors.selfie = 'Selfie photo is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateStep(activeStep)) {
      if (activeStep === 2) {
        submitVerification();
      } else {
        setActiveStep(prev => prev + 1);
      }
    }
  };
  
  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };
  
  const submitVerification = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 1. Upload files to S3 via Amplify Storage
      const uploads = await Promise.all([
        uploadFile(verificationData.identityDocument, 'identity'),
        uploadFile(verificationData.licenseDocument, 'license'),
        uploadFile(verificationData.selfie, 'selfie'),
      ]);
      
      // 2. Send verification data to API
      const apiClient = ApiClient.getInstance();
      const response = await apiClient.submitProviderVerification({
        licenseNumber: verificationData.licenseNumber,
        licenseState: verificationData.licenseState,
        licenseExpiryDate: verificationData.licenseExpiryDate as Date,
        specialtyName: verificationData.specialty,
        identityDocumentS3Key: uploads[0],
        licenseDocumentS3Key: uploads[1],
        selfieS3Key: uploads[2],
      });
      
      if (response.status === 'success') {
        setSuccess('Your verification information has been submitted successfully! We will review your documents and update your account status within 1-2 business days.');
        setActiveStep(3); // Move to success step
      } else {
        throw new Error(response.error?.message || 'Failed to submit verification');
      }
    } catch (err: any) {
      console.error('Error submitting verification:', err);
      setError(err.message || 'An error occurred while submitting your verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const uploadFile = async (file: File | null, prefix: string): Promise<string> => {
    if (!file || !user) {
      throw new Error(`${prefix} file is required`);
    }
    
    try {
      // Create a unique key for the file
      const key = `verifications/${user.id}/${prefix}_${Date.now()}_${file.name}`;
      
      // Create form data for the file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('key', key);
      formData.append('accessLevel', 'private');
      
      // Upload to API endpoint
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.key;
    } catch (err) {
      console.error(`Error uploading ${prefix} file:`, err);
      throw new Error(`Failed to upload ${prefix} file`);
    }
  };
  
  const getVerificationStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return 'success';
      case VerificationStatus.PENDING:
        return 'warning';
      case VerificationStatus.REJECTED:
        return 'error';
      case VerificationStatus.EXPIRED:
        return 'default';
      default:
        return 'default';
    }
  };
  
  const getVerificationStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return <CheckCircleIcon color="success" />;
      case VerificationStatus.PENDING:
        return <WarningIcon color="warning" />;
      case VerificationStatus.REJECTED:
        return <CancelIcon color="error" />;
      case VerificationStatus.EXPIRED:
        return <RefreshIcon color="disabled" />;
      default:
        return null;
    }
  };
  
  const renderInformationStep = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Medical License Information
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Please enter your medical license details exactly as they appear on your documentation.
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="License Number"
          value={verificationData.licenseNumber}
          onChange={(e) => setVerificationData(prev => ({ ...prev, licenseNumber: e.target.value }))}
          error={!!errors.licenseNumber}
          helperText={errors.licenseNumber}
          required
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <FormControl fullWidth error={!!errors.licenseState}>
          <InputLabel id="license-state-label">State</InputLabel>
          <Select
            labelId="license-state-label"
            value={verificationData.licenseState}
            onChange={(e) => setVerificationData(prev => ({ ...prev, licenseState: e.target.value }))}
            label="State"
            required
          >
            {STATES.map(state => (
              <MenuItem key={state} value={state}>{state}</MenuItem>
            ))}
          </Select>
          {errors.licenseState && <FormHelperText>{errors.licenseState}</FormHelperText>}
        </FormControl>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="License Expiration Date"
            value={verificationData.licenseExpiryDate}
            onChange={(date) => setVerificationData(prev => ({ 
              ...prev, 
              licenseExpiryDate: date as Date | null 
            }))}
            renderInput={(params) => (
              <TextField 
                {...params} 
                fullWidth 
                error={!!errors.licenseExpiryDate}
                helperText={errors.licenseExpiryDate || params.helperText}
                required
              />
            )}
          />
        </LocalizationProvider>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <FormControl fullWidth error={!!errors.specialty}>
          <InputLabel id="specialty-label">Medical Specialty</InputLabel>
          <Select
            labelId="specialty-label"
            value={verificationData.specialty}
            onChange={(e) => setVerificationData(prev => ({ ...prev, specialty: e.target.value }))}
            label="Medical Specialty"
            required
          >
            {ProviderSpecialties.map(specialty => (
              <MenuItem key={specialty.value} value={specialty.value}>{specialty.label}</MenuItem>
            ))}
          </Select>
          {errors.specialty && <FormHelperText>{errors.specialty}</FormHelperText>}
        </FormControl>
      </Grid>
    </Grid>
  );
  
  const renderDocumentsStep = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Upload Verification Documents
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Please upload clear, legible images of your identification document and medical license.
        </Typography>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Government-Issued ID
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload a photo of your driver's license, passport, or other government-issued ID.
            </Typography>
            
            {verificationData.identityDocument ? (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Box
                  component="img"
                  src={URL.createObjectURL(verificationData.identityDocument)}
                  alt="ID Preview"
                  sx={{ 
                    maxWidth: '100%', 
                    maxHeight: 200, 
                    objectFit: 'contain',
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    mb: 1
                  }}
                />
                <Typography variant="caption" display="block">
                  {verificationData.identityDocument.name}
                </Typography>
                <Button 
                  size="small" 
                  color="error" 
                  onClick={() => setVerificationData(prev => ({ ...prev, identityDocument: null }))}
                >
                  Remove
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  fullWidth
                >
                  Upload ID
                  <input
                    type="file"
                    hidden
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, 'identity')}
                  />
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<CameraIcon />}
                  onClick={() => startCamera(false)}
                  fullWidth
                >
                  Take Photo
                </Button>
              </Box>
            )}
            
            {errors.identityDocument && (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {errors.identityDocument}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Medical License
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload a photo of your current medical license or certification.
            </Typography>
            
            {verificationData.licenseDocument ? (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Box
                  component="img"
                  src={URL.createObjectURL(verificationData.licenseDocument)}
                  alt="License Preview"
                  sx={{ 
                    maxWidth: '100%', 
                    maxHeight: 200, 
                    objectFit: 'contain',
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    mb: 1
                  }}
                />
                <Typography variant="caption" display="block">
                  {verificationData.licenseDocument.name}
                </Typography>
                <Button 
                  size="small" 
                  color="error" 
                  onClick={() => setVerificationData(prev => ({ ...prev, licenseDocument: null }))}
                >
                  Remove
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  fullWidth
                >
                  Upload License
                  <input
                    type="file"
                    hidden
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, 'license')}
                  />
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<CameraIcon />}
                  onClick={() => {
                    setProcessingImage('license');
                    startCamera(false);
                  }}
                  fullWidth
                >
                  Take Photo
                </Button>
              </Box>
            )}
            
            {errors.licenseDocument && (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {errors.licenseDocument}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  const renderSelfieStep = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Identity Verification
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Please take a selfie photo holding your ID next to your face. This helps us verify your identity.
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            {cameraActive ? (
              <Box sx={{ textAlign: 'center' }}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  style={{ width: '100%', maxWidth: 500, borderRadius: 8 }} 
                />
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button variant="outlined" onClick={stopCamera}>
                    Cancel
                  </Button>
                  <Button variant="contained" onClick={captureImage}>
                    Capture
                  </Button>
                </Box>
                
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                {verificationData.selfie ? (
                  <Box>
                    <Box
                      component="img"
                      src={URL.createObjectURL(verificationData.selfie)}
                      alt="Selfie Preview"
                      sx={{ 
                        maxWidth: '100%', 
                        maxHeight: 300, 
                        objectFit: 'contain',
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        mb: 1
                      }}
                    />
                    <Typography variant="caption" display="block">
                      {verificationData.selfie.name}
                    </Typography>
                    <Button 
                      size="small" 
                      color="error" 
                      onClick={() => setVerificationData(prev => ({ ...prev, selfie: null }))}
                      sx={{ mt: 1 }}
                    >
                      Remove
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Box 
                      sx={{ 
                        width: 200, 
                        height: 200, 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed #ccc',
                        borderRadius: 2,
                        mb: 2
                      }}
                    >
                      <CameraIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadIcon />}
                      >
                        Upload Selfie
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'selfie')}
                        />
                      </Button>
                      
                      <Button
                        variant="contained"
                        startIcon={<CameraIcon />}
                        onClick={() => {
                          setProcessingImage('selfie');
                          startCamera(true);
                        }}
                      >
                        Take Selfie
                      </Button>
                    </Box>
                  </Box>
                )}
                
                {errors.selfie && (
                  <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                    {errors.selfie}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">How to take a good verification selfie</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2">
              1. Make sure your face and ID are clearly visible
            </Typography>
            <Typography variant="body2">
              2. Ensure good lighting conditions
            </Typography>
            <Typography variant="body2">
              3. Hold your ID next to your face
            </Typography>
            <Typography variant="body2">
              4. Look directly at the camera
            </Typography>
            <Typography variant="body2">
              5. Do not wear sunglasses or anything that obscures your face
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Grid>
    </Grid>
  );
  
  const renderSuccessStep = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
      
      <Typography variant="h5" gutterBottom>
        Verification Submitted Successfully!
      </Typography>
      
      <Typography variant="body1" paragraph>
        Thank you for submitting your verification documents. Our team will review your information and update your account status.
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        You'll receive an email notification once the verification process is complete, usually within 1-2 business days.
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={() => router.push('/provider/dashboard')}
        sx={{ mt: 2 }}
      >
        Return to Dashboard
      </Button>
    </Box>
  );
  
  const renderVerificationStatus = () => (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {getVerificationStatusIcon(verificationData.status)}
          <Typography variant="h6" sx={{ ml: 1 }}>
            Verification Status: 
            <Chip 
              label={verificationData.status} 
              color={getVerificationStatusColor(verificationData.status) as any}
              size="small"
              sx={{ ml: 1 }}
            />
          </Typography>
        </Box>
        
        <Box sx={{ ml: 'auto' }}>
          <IconButton 
            onClick={() => setShowVerificationInfo(!showVerificationInfo)}
            aria-label="toggle verification info"
          >
            <InfoIcon />
          </IconButton>
        </Box>
      </Box>
      
      {showVerificationInfo && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">License Number:</Typography>
              <Typography variant="body2">{verificationData.licenseNumber}</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">License State:</Typography>
              <Typography variant="body2">{verificationData.licenseState}</Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Expiration Date:</Typography>
              <Typography variant="body2">
                {verificationData.licenseExpiryDate?.toLocaleDateString()}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Specialty:</Typography>
              <Typography variant="body2">{verificationData.specialty}</Typography>
            </Grid>
            
            {verificationData.status === VerificationStatus.APPROVED && (
              <>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Last Verified:</Typography>
                  <Typography variant="body2">
                    {verificationData.lastVerified 
                      ? `${verificationData.lastVerified.toLocaleDateString()} (${formatDistance(verificationData.lastVerified, new Date(), { addSuffix: true })})` 
                      : 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Next Verification:</Typography>
                  <Typography variant="body2">
                    {verificationData.nextVerification 
                      ? `${verificationData.nextVerification.toLocaleDateString()} (${formatDistance(verificationData.nextVerification, new Date(), { addSuffix: true })})` 
                      : 'N/A'}
                  </Typography>
                </Grid>
              </>
            )}
            
            {verificationData.status === VerificationStatus.REJECTED && verificationData.rejectionReason && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="error">Rejection Reason:</Typography>
                <Typography variant="body2">{verificationData.rejectionReason}</Typography>
              </Grid>
            )}
          </Grid>
          
          {verificationData.status === VerificationStatus.REJECTED && (
            <Button 
              variant="contained"
              color="primary"
              onClick={() => setShowVerificationInfo(false)}
              sx={{ mt: 3 }}
            >
              Resubmit Verification
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );
  
  const steps = ['License Information', 'Upload Documents', 'Identity Verification', 'Complete'];
  
  if (isLoading && !verificationData.licenseNumber) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Typography variant="h4" gutterBottom align="center">
        Provider Verification
      </Typography>
      
      <Typography variant="body1" paragraph align="center" color="text.secondary">
        Complete the verification process to access all provider features
      </Typography>
      
      {/* Verification Status (if exists) */}
      {verificationData.status !== VerificationStatus.PENDING && verificationData.licenseNumber && renderVerificationStatus()}
      
      {/* Error and Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 4 }}>
          {success}
        </Alert>
      )}
      
      {/* Only show the form if status is not APPROVED or there's no verification yet */}
      {(verificationData.status !== VerificationStatus.APPROVED || !verificationData.licenseNumber || !showVerificationInfo) && (
        <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 2 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          <Box sx={{ mt: 4, mb: 3 }}>
            {activeStep === 0 && renderInformationStep()}
            {activeStep === 1 && renderDocumentsStep()}
            {activeStep === 2 && renderSelfieStep()}
            {activeStep === 3 && renderSuccessStep()}
          </Box>
          
          {activeStep < 3 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button 
                disabled={activeStep === 0 || isLoading}
                onClick={handleBack}
              >
                Back
              </Button>
              
              <Button 
                variant="contained"
                onClick={handleNext}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {isLoading ? 'Processing...' : activeStep === 2 ? 'Submit Verification' : 'Next'}
              </Button>
            </Box>
          )}
        </Paper>
      )}
    </Container>
  );
} 