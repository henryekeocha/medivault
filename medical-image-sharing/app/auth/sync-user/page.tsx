'use client';

import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, Button, Alert, CircularProgress } from '@mui/material';
import { useAuth, useUser, useClerk } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserFromClerk } from '@/lib/clerk/create-user';

export default function SyncUserPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect_url') || '/dashboard';
  
  const [isLoading, setIsLoading] = useState(false);
  const [syncAttempted, setSyncAttempted] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-sync on page load
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      handleSync();
    }
  }, [isLoaded, isSignedIn, user]);
  
  // Redirect after successful sync
  useEffect(() => {
    if (syncSuccess) {
      const timer = setTimeout(() => {
        // Use window.location for navigation to avoid the router type issue
        window.location.href = redirectUrl;
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [syncSuccess, redirectUrl]);

  const handleSync = async () => {
    if (!isSignedIn || !user) {
      setError('You must be signed in to sync your account');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSyncAttempted(true);
    
    try {
      console.log('Starting sync process for user:', user.id);
      
      // Attempt to get token from Clerk
      const token = await clerk.session?.getToken();
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      // Multiple sync strategies in sequence - try until one succeeds
      let success = false;
      
      // Strategy 1: Use the createUserFromClerk utility
      try {
        console.log('Attempt 1: Using createUserFromClerk utility');
        success = await createUserFromClerk();
        console.log('createUserFromClerk result:', success);
      } catch (err) {
        console.error('Error in createUserFromClerk:', err);
      }
      
      // Strategy 2: Call the backend sync endpoint directly if method 1 failed
      if (!success) {
        try {
          console.log('Attempt 2: Calling sync API with user ID:', user.id);
          const response = await fetch(`/api/auth/sync/${user.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              role: user.publicMetadata?.role || 'PATIENT'
            })
          });
          
          console.log('Sync API response status:', response.status);
          const data = await response.json();
          console.log('Sync API response:', data);
          
          success = data.success;
          
          if (success) {
            console.log('Successfully synced user with API');
          } else {
            console.error('API sync failed:', data.message);
          }
        } catch (err) {
          console.error('Error calling sync API:', err);
        }
      }
      
      // Strategy 3: Create user with test-user endpoint as last resort
      if (!success) {
        try {
          console.log('Attempt 3: Using test-user API');
          const response = await fetch('/api/auth/test-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              clerkId: user.id,
              email: user.primaryEmailAddress?.emailAddress || '',
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
              role: user.publicMetadata?.role || 'PATIENT'
            })
          });
          
          const data = await response.json();
          console.log('test-user API response:', data);
          
          success = data.success;
          
          if (success) {
            console.log('Successfully created user with test-user API');
          } else {
            console.error('test-user API failed:', data.message);
          }
        } catch (err) {
          console.error('Error calling test-user API:', err);
        }
      }
      
      // Try to update the metadata regardless of creation result
      try {
        if (user) {
          const role = user.publicMetadata?.role || 'PATIENT';
          console.log('Updating user metadata with role:', role);
          await user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              role,
              syncAttempted: true,
              syncTimestamp: new Date().toISOString()
            }
          });
        }
      } catch (metadataErr) {
        console.error('Error updating metadata:', metadataErr);
      }
      
      setSyncSuccess(success);
      
      if (!success) {
        setError('Failed to sync your account. Please try again or contact support.');
      }
    } catch (err) {
      console.error('Error during sync:', err);
      setError('An unexpected error occurred while syncing your account. Please try again.');
      setSyncSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleManualSync = () => {
    handleSync();
  };
  
  const handleSignOut = async () => {
    try {
      // Clear any stored sync attempts
      localStorage.removeItem('lastSyncAttempt');
      // Sign out the user and redirect to login using window.location
      window.location.href = '/auth/login';
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (!isLoaded) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Account Synchronization
        </Typography>
        
        <Typography variant="body1" paragraph>
          We need to sync your Clerk account with our database to proceed. This usually happens automatically,
          but sometimes it needs a little help.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {syncSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your account has been successfully synchronized! Redirecting...
          </Alert>
        )}
        
        {syncAttempted && !syncSuccess && !error && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Synchronization in progress...
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            disabled={isLoading || syncSuccess}
            onClick={handleManualSync}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            fullWidth
          >
            {isLoading ? 'Syncing...' : 'Sync Account'}
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleSignOut}
            fullWidth
          >
            Sign Out
          </Button>
        </Box>
      </Paper>
    </Container>
  );
} 