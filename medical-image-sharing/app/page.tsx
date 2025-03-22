'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';
import { DEFAULT_ROUTES } from '@/config/routes';
import HomeContent from '@/components/landing/HomeContent';
import { Route } from 'next';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Debug logging
    console.log('Home page - Session status:', status);
    console.log('Home page - Session data:', session);
    
    if (status === 'authenticated' && session?.user?.role && !isRedirecting) {
      setIsRedirecting(true);
      
      try {
        // Get the correct dashboard URL for the user's role
        let dashboardUrl = '/dashboard';
        
        // Convert role to string to handle both string and enum values
        const userRole = String(session.user.role).toUpperCase();
        
        if (userRole === 'ADMIN') {
          dashboardUrl = '/admin/dashboard';
        } else if (userRole === 'PROVIDER') {
          dashboardUrl = '/provider/dashboard';
        } else if (userRole === 'PATIENT') {
          dashboardUrl = '/patient/dashboard';
        }
        
        console.log(`User authenticated with role ${userRole}, redirecting to ${dashboardUrl}`);
        
        // Add a small delay to ensure routing works properly
        setTimeout(() => {
          router.push(dashboardUrl as Route);
        }, 250);
      } catch (error) {
        console.error('Error during redirection:', error);
        setIsRedirecting(false);
      }
    }
  }, [session, status, router, isRedirecting]);

  // Show loading state while session is loading
  if (status === 'loading' || isRedirecting) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress size={48} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {isRedirecting ? "Redirecting to your dashboard..." : "Loading your session..."}
        </Typography>
      </Box>
    );
  }

  // If user is not authenticated, show the home page content
  if (status === 'unauthenticated' || !session) {
    return <HomeContent />;
  }

  // This should never be reached due to the redirect, but include as a fallback
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <CircularProgress size={48} />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Preparing your dashboard...
      </Typography>
    </Box>
  );
} 