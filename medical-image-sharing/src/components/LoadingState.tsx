'use client';

import React from 'react';
import { Box, CircularProgress, Typography, Paper, Skeleton, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  size?: 'small' | 'medium' | 'large';
  error?: string | null;
  onRetry?: () => void;
  disableBackground?: boolean;
  skeletonCount?: number;
  skeletonHeight?: number;
}

export function LoadingState({
  message = 'Loading...',
  fullScreen = false,
  overlay = false,
  size = 'medium',
  error = null,
  onRetry,
  disableBackground = false,
  skeletonCount = 0,
  skeletonHeight = 60,
}: LoadingStateProps) {
  const theme = useTheme();
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56,
  };

  // If there's an error and a retry function, show error state instead
  if (error && onRetry) {
    return (
      <Box 
        sx={{
          p: 3, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 2,
          ...(fullScreen && {
            minHeight: '50vh',
          })
        }}
      >
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          variant="contained" 
          color="primary"
          onClick={onRetry}
        >
          Retry
        </Button>
      </Box>
    );
  }

  // Show skeleton loaders if requested
  if (skeletonCount > 0) {
    return (
      <Box sx={{ width: '100%' }}>
        {Array.from(new Array(skeletonCount)).map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={skeletonHeight}
            sx={{ mb: 1, borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  // Show standard loading spinner
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
        ...(overlay && {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1000,
        }),
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: disableBackground ? 'transparent' : 'background.default',
          zIndex: (theme) => theme.zIndex.modal + 1,
          padding: (theme) => theme.spacing(2),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }),
      }}
    >
      <CircularProgress 
        size={sizeMap[size]} 
        sx={{
          color: theme.palette.primary.main,
        }}
      />
      {message && (
        <Typography
          variant={size === 'small' ? 'body2' : 'body1'}
          color="text.secondary"
          align="center"
        >
          {message}
        </Typography>
      )}
    </Box>
  );

  if (overlay || fullScreen) {
    return content;
  }

  return <Paper elevation={0}>{content}</Paper>;
}

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export function LoadingButton({ 
  loading, 
  children, 
  size = 'small',
  color,
}: LoadingButtonProps) {
  const theme = useTheme();
  const spinnerSize = size === 'small' ? 20 : size === 'medium' ? 24 : 32;
  
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      {loading && (
        <CircularProgress
          size={spinnerSize}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: `-${spinnerSize / 2}px`,
            marginLeft: `-${spinnerSize / 2}px`,
            color: color || theme.palette.primary.main,
          }}
        />
      )}
    </Box>
  );
}

interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  error?: string | null;
  onRetry?: () => void;
}

export function LoadingOverlay({ 
  loading, 
  children, 
  message, 
  size = 'medium',
  error = null,
  onRetry,
}: LoadingOverlayProps) {
  return (
    <Box sx={{ position: 'relative' }}>
      {children}
      {loading && <LoadingState overlay message={message} size={size} />}
      {!loading && error && onRetry && (
        <Box 
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
          }}
        >
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button 
            startIcon={<RefreshIcon />} 
            variant="contained" 
            color="primary"
            onClick={onRetry}
          >
            Retry
          </Button>
        </Box>
      )}
    </Box>
  );
}

interface SkeletonLoaderProps {
  count?: number;
  height?: number;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
}

export function SkeletonLoader({ 
  count = 3, 
  height = 60, 
  variant = 'rectangular',
  width = '100%',
}: SkeletonLoaderProps) {
  return (
    <Box sx={{ width }}>
      {Array.from(new Array(count)).map((_, index) => (
        <Skeleton
          key={index}
          variant={variant}
          height={height}
          sx={{ mb: 1, borderRadius: 1 }}
        />
      ))}
    </Box>
  );
} 