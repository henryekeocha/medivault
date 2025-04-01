'use client';

import React from 'react';
import { Button, Container, Paper, Typography, Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import ErrorIcon from '@mui/icons-material/Error';

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleReturnHome = () => {
    window.location.href = '/';
  };

  const handleReturnToDashboard = () => {
    window.location.href = '/dashboard';
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: 2,
          textAlign: 'center',
          border: '1px solid #d32f2f',
          boxShadow: '0 4px 12px rgba(211, 47, 47, 0.1)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <ErrorIcon color="error" sx={{ fontSize: 80 }} />
        </Box>
        
        <Typography variant="h4" component="h1" gutterBottom color="error">
          Access Denied
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ mb: 4 }}>
          You do not have permission to access this page or resource. 
          This could be due to insufficient privileges or an authentication issue.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleReturnHome}
          >
            Return to Home
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            onClick={handleReturnToDashboard}
          >
            Go to Dashboard
          </Button>
        </Box>
      </Paper>
    </Container>
  );
} 