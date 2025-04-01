'use client';

import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container,
  Card,
  CardContent,
  Grid,
  Divider,
  Button,
  Alert
} from '@mui/material';
import { 
  UserProfile,
  useUser,
  useAuth
} from '@clerk/nextjs';
import { Shield, ArrowBack } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function MFAPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  
  // Return to profile
  const handleBackToProfile = () => {
    router.push('/profile');
  };
  
  if (!isLoaded) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography>Loading...</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={handleBackToProfile}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          <Shield sx={{ mr: 1, verticalAlign: 'middle' }} />
          Multi-Factor Authentication
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Enhance Your Account Security
        </Typography>
        <Typography variant="body1" paragraph>
          Multi-factor authentication adds an additional layer of security to your account by requiring more than just a password to sign in.
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          We recommend setting up at least two different authentication methods.
        </Alert>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Manage your multi-factor authentication settings and security preferences.
              </Typography>
              <Divider sx={{ my: 2 }} />
              <UserProfile 
                path="/profile/mfa"
                routing="path"
                appearance={{
                  elements: {
                    rootBox: {
                      boxShadow: 'none',
                      padding: 0
                    }
                  }
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
} 