'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { Role } from '@prisma/client';
import { DEFAULT_ROUTES } from '@/config/routes';
import HomeContent from '@/components/landing/HomeContent';
import { Route } from 'next';
import { Box, CircularProgress, Typography, Alert, Container, Paper, Button } from '@mui/material';

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Debug logging
    console.log('Home page - Auth status:', isLoaded ? 'loaded' : 'loading');
    console.log('Home page - User data:', user);
    
    // Only redirect if we're explicitly navigating to the dashboard
    if (isLoaded && isUserLoaded && isSignedIn && user && !isRedirecting) {
      const path = window.location.pathname;
      if (path === '/dashboard' || path === '/') {
        setIsRedirecting(true);
        
        const handleRedirect = async () => {
          try {
            // Get the user's role from metadata
            const userRole = user.unsafeMetadata?.role as Role;
            console.log('User role from metadata:', userRole);
            
            if (userRole) {
              const dashboardUrl = DEFAULT_ROUTES[userRole];
              console.log(`User authenticated with role ${userRole}, redirecting to ${dashboardUrl}`);
              
              // Add a small delay to ensure routing works properly
              setTimeout(() => {
                router.push(dashboardUrl as Route);
              }, 250);
            } else {
              console.error('No role found for authenticated user');
              // Don't set a default role, show an error instead
              setError('Your account is missing a role. Please contact support to resolve this issue.');
              setIsRedirecting(false);
            }
          } catch (error) {
            console.error('Error during redirection:', error);
            setError('An error occurred while loading your account. Please try again.');
            setIsRedirecting(false);
          }
        };

        handleRedirect();
      }
    }
  }, [isLoaded, isUserLoaded, isSignedIn, user, router, isRedirecting]);

  // Show loading state while auth is loading
  if (!isLoaded || !isUserLoaded || isRedirecting) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress size={48} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {isRedirecting ? "Redirecting to your dashboard..." : "Loading your session..."}
        </Typography>
      </Box>
    );
  }

  // Show error message if there's an issue with the user's role
  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please contact support to resolve this issue.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.href = '/auth/login'}
            sx={{ mt: 2 }}
          >
            Sign Out
          </Button>
        </Paper>
      </Container>
    );
  }

  // Show the home page content for both authenticated and unauthenticated users
  return <HomeContent />;
} 