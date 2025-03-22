'use client';

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  CloudOff as CloudOffIcon,
  Timer as TimerIcon,
  Lock as LockIcon,
  WifiOff as WifiOffIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useToast } from '@/contexts/ToastContext';
import { LoadingState } from '@/components/LoadingState';

/**
 * Error Showcase Page
 * 
 * This page demonstrates the various error handling patterns implemented
 * throughout the application, showing the standardized approach to:
 * 
 * 1. Error display (alerts, toasts)
 * 2. Loading states
 * 3. Recovery mechanisms
 * 4. Error dismissal
 * 5. Validation error handling
 */
export default function ErrorShowcasePage() {
  const toast = useToast();
  const { error: simulatedError, setError, clearError, loading: simulatedLoading, setLoading } = useErrorHandler();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selectedErrorType, setSelectedErrorType] = useState('api');
  
  // Demo form values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const errorTypes = {
    api: {
      title: 'API Error',
      description: 'Simulates errors that occur during API requests',
      icon: <CloudOffIcon color="error" fontSize="large" />,
      errors: [
        { name: 'Network Error', message: 'Unable to connect to the server. Please check your internet connection.' },
        { name: '404 Not Found', message: 'The requested resource was not found on the server.' },
        { name: '500 Server Error', message: 'An unexpected error occurred on the server. Please try again later.' },
        { name: 'Timeout Error', message: 'The request timed out. Please try again.' },
        { name: 'Authentication Error', message: 'Your session has expired. Please log in again.' },
      ]
    },
    validation: {
      title: 'Validation Error',
      description: 'Demonstrates form validation error handling',
      icon: <WarningIcon color="warning" fontSize="large" />,
      errors: [
        { name: 'Email Validation', message: 'Please enter a valid email address.' },
        { name: 'Password Required', message: 'Password is required.' },
        { name: 'Password Complexity', message: 'Password must be at least 8 characters and include a number.' },
        { name: 'Field Length', message: 'This field exceeds the maximum allowed length of 50 characters.' },
      ]
    },
    permission: {
      title: 'Permission Error',
      description: 'Shows errors related to user permissions and access control',
      icon: <LockIcon color="error" fontSize="large" />,
      errors: [
        { name: 'Access Denied', message: 'You do not have permission to access this resource.' },
        { name: 'Action Forbidden', message: 'You are not authorized to perform this action.' },
        { name: 'Upgrade Required', message: 'This feature requires a premium subscription.' },
      ]
    },
    system: {
      title: 'System Error',
      description: 'Illustrates system and infrastructure errors',
      icon: <StorageIcon color="error" fontSize="large" />,
      errors: [
        { name: 'Database Error', message: 'Failed to connect to the database. Please try again later.' },
        { name: 'Storage Limit', message: 'You have reached your storage limit. Please upgrade your plan.' },
        { name: 'File System Error', message: 'Failed to write to file system. Please contact support.' },
      ]
    }
  };
  
  // Simulate loading state
  const handleSimulateLoading = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  };
  
  // Simulate error with toast
  const handleSimulateToastError = (message: string) => {
    toast.showError(message);
  };
  
  // Simulate error with alert
  const handleSimulateAlertError = (message: string) => {
    setError(message);
  };
  
  // Simulate error with validation
  const handleSimulateValidationError = () => {
    setValidationErrors({
      email: email ? '' : 'Email is required',
      password: password.length >= 8 ? '' : 'Password must be at least 8 characters',
    });
  };
  
  // Clear all errors
  const handleClearAllErrors = () => {
    clearError();
    setValidationErrors({});
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Error Handling Showcase
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4 }}>
          This page demonstrates the standardized error handling patterns implemented across the application.
          It shows how errors are displayed, loading states are managed, and how users can recover from errors.
        </Typography>
        
        <Grid container spacing={3}>
          {/* Error Type Selector */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Select Error Type
              </Typography>
              
              <Grid container spacing={2}>
                {Object.entries(errorTypes).map(([key, type]) => (
                  <Grid item xs={6} sm={3} key={key}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        cursor: 'pointer',
                        borderColor: selectedErrorType === key ? 'primary.main' : 'divider',
                        bgcolor: selectedErrorType === key ? 'primary.light' : 'background.paper',
                        '&:hover': { 
                          borderColor: 'primary.main',
                          bgcolor: 'primary.lighter',
                        }
                      }}
                      onClick={() => setSelectedErrorType(key)}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 2 }}>
                        {type.icon}
                        <Typography variant="subtitle1" sx={{ mt: 1 }}>
                          {type.title}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
          
          {/* Selected Error Type Examples */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {errorTypes[selectedErrorType as keyof typeof errorTypes].icon}
                <Typography variant="h6" sx={{ ml: 1 }}>
                  {errorTypes[selectedErrorType as keyof typeof errorTypes].title} Examples
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                {errorTypes[selectedErrorType as keyof typeof errorTypes].description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              {selectedErrorType === 'validation' ? (
                // Validation error demo with form
                <Box component="form" noValidate>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        variant="outlined"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={!!validationErrors.email}
                        helperText={validationErrors.email}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        variant="outlined"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={!!validationErrors.password}
                        helperText={validationErrors.password}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSimulateValidationError}
                      >
                        Validate Form
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                // Other error types
                <Box>
                  {errorTypes[selectedErrorType as keyof typeof errorTypes].errors.map((err, index) => (
                    <Accordion key={index}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{err.name}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {err.message}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleSimulateToastError(err.message)}
                          >
                            Show as Toast
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleSimulateAlertError(err.message)}
                          >
                            Show as Alert
                          </Button>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Controls and Output */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Controls
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={handleSimulateLoading}
                  sx={{ mb: 2 }}
                >
                  Simulate Loading State
                </Button>
                
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  onClick={handleClearAllErrors}
                  sx={{ mb: 2 }}
                  startIcon={<RefreshIcon />}
                >
                  Clear All Errors
                </Button>
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Output
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                {simulatedLoading && (
                  <Box sx={{ my: 2 }}>
                    <LoadingState message="Simulating loading state..." />
                  </Box>
                )}
                
                {simulatedError && (
                  <Alert 
                    severity="error" 
                    sx={{ my: 2 }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={clearError}
                      >
                        Dismiss
                      </Button>
                    }
                  >
                    {simulatedError}
                  </Alert>
                )}
                
                {!simulatedLoading && !simulatedError && (
                  <Box sx={{ 
                    p: 3, 
                    bgcolor: 'background.default', 
                    borderRadius: 1,
                    minHeight: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      Use the controls to simulate different errors and states
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
          
          {/* Best Practices */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Error Handling Best Practices
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CheckCircleIcon color="success" />
                        <Typography variant="subtitle1" sx={{ ml: 1 }}>
                          Clear Error Messages
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Error messages should be concise, user-friendly, and explain what happened and how to fix it.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CheckCircleIcon color="success" />
                        <Typography variant="subtitle1" sx={{ ml: 1 }}>
                          Recovery Options
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Always provide users with a way to recover from errors, such as retry buttons or clear instructions.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CheckCircleIcon color="success" />
                        <Typography variant="subtitle1" sx={{ ml: 1 }}>
                          Consistent Patterns
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Maintain consistent error handling patterns across the application to create a predictable user experience.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
} 