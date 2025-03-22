import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading application...' }: LoadingScreenProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: 'background.default',
        zIndex: 9999,
      }}
    >
      <CircularProgress size={48} />
      <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
        {message}
      </Typography>
    </Box>
  );
} 