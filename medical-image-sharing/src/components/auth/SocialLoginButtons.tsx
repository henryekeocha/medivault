'use client';

import React, { useState, useEffect } from 'react';
import { Button, Divider, Box, Typography, CircularProgress, Stack, Paper, useTheme } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import AppleIcon from '@mui/icons-material/Apple';
import axios from 'axios';

interface SocialLoginButtonsProps {
  onBeforeLogin?: () => void;
  className?: string;
}

/**
 * Component for social login buttons (Google, Facebook, etc.)
 * with a modern and premium design
 */
export default function SocialLoginButtons({
  onBeforeLogin,
  className,
}: SocialLoginButtonsProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const [loading, setLoading] = useState<{
    google: boolean;
    facebook: boolean;
    twitter: boolean;
    apple: boolean;
  }>({
    google: false,
    facebook: false,
    twitter: false,
    apple: false,
  });
  const [providers, setProviders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch available social identity providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await axios.get('/api/auth/social/providers');
        if (response.data.success) {
          setProviders(response.data.providers.map((p: any) => p.name.toLowerCase()));
        }
      } catch (error) {
        console.error('Error fetching social providers:', error);
        // Default to showing all providers if we can't fetch the available ones
        setProviders(['google', 'facebook']);
      }
    };

    fetchProviders();
  }, []);

  /**
   * Handle social login with the given provider
   */
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'twitter' | 'apple') => {
    try {
      // Call onBeforeLogin if provided
      if (onBeforeLogin) {
        onBeforeLogin();
      }

      // Set loading state for the specific provider
      setLoading(prev => ({ ...prev, [provider]: true }));
      setError(null);

      // Get the authorization URL from the backend
      const response = await axios.post(`/api/auth/social/${provider}`);
      
      if (response.data.success && response.data.authUrl) {
        // Redirect to the provider's authorization page
        window.location.href = response.data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error(`Error logging in with ${provider}:`, error);
      setError(`Failed to login with ${provider}. Please try again.`);
    } finally {
      setLoading(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Don't render if no providers are available
  if (providers.length === 0) {
    return null;
  }

  const isAnyLoading = Object.values(loading).some(val => val);

  return (
    <Box className={className} sx={{ width: '100%', my: 2 }}>
      <Divider sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, fontWeight: 500 }}>
          OR CONTINUE WITH
        </Typography>
      </Divider>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}

      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 1 }}>
        {providers.includes('google') && (
          <Paper 
            elevation={1} 
            sx={{ 
              borderRadius: '50%',
              overflow: 'hidden',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { 
                transform: 'translateY(-3px)',
                boxShadow: 3 
              },
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'white',
            }}
          >
            <Button
              disabled={isAnyLoading}
              onClick={() => handleSocialLogin('google')}
              sx={{
                minWidth: 0,
                width: 50,
                height: 50,
                borderRadius: '50%',
                color: '#4285F4',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f5f5f5',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {loading.google ? (
                <CircularProgress size={24} />
              ) : (
                <GoogleIcon sx={{ fontSize: 28 }} />
              )}
            </Button>
          </Paper>
        )}

        {providers.includes('facebook') && (
          <Paper 
            elevation={1} 
            sx={{ 
              borderRadius: '50%', 
              overflow: 'hidden',
              transition: 'all 0.2s ease-in-out',
              '&:hover': { 
                transform: 'translateY(-3px)',
                boxShadow: 3 
              },
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'white',
            }}
          >
            <Button
              disabled={isAnyLoading}
              onClick={() => handleSocialLogin('facebook')}
              sx={{
                minWidth: 0,
                width: 50,
                height: 50,
                borderRadius: '50%',
                color: '#1877F2',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f5f5f5',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {loading.facebook ? (
                <CircularProgress size={24} />
              ) : (
                <FacebookIcon sx={{ fontSize: 28 }} />
              )}
            </Button>
          </Paper>
        )}

        <Paper 
          elevation={1} 
          sx={{ 
            borderRadius: '50%', 
            overflow: 'hidden',
            transition: 'all 0.2s ease-in-out',
            '&:hover': { 
              transform: 'translateY(-3px)',
              boxShadow: 3 
            },
            opacity: 0.7, // Less prominent for unavailable providers
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'white',
          }}
        >
          <Button
            disabled={true}
            sx={{
              minWidth: 0,
              width: 50,
              height: 50,
              borderRadius: '50%',
              color: isDarkMode ? '#4db6f7' : '#1DA1F2',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f5f5f5',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <TwitterIcon sx={{ fontSize: 28 }} />
          </Button>
        </Paper>

        <Paper 
          elevation={1} 
          sx={{ 
            borderRadius: '50%', 
            overflow: 'hidden',
            transition: 'all 0.2s ease-in-out',
            '&:hover': { 
              transform: 'translateY(-3px)',
              boxShadow: 3 
            },
            opacity: 0.7, // Less prominent for unavailable providers
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'white',
          }}
        >
          <Button
            disabled={true}
            sx={{
              minWidth: 0,
              width: 50,
              height: 50,
              borderRadius: '50%',
              color: isDarkMode ? '#aaaaaa' : '#000',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f5f5f5',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <AppleIcon sx={{ fontSize: 28 }} />
          </Button>
        </Paper>
      </Stack>
      
      <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1 }}>
        Additional login options coming soon
      </Typography>
    </Box>
  );
} 