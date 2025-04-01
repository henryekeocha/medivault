import React, { useState } from 'react';
import { Button, Typography, Box, CircularProgress } from '@mui/material';
import { createUserFromClerk } from '@/lib/clerk/create-user';

export function SyncUserButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);
  
  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const success = await createUserFromClerk();
      setResult({
        success,
        message: success 
          ? 'User synchronized successfully! Please refresh the page.'
          : 'Failed to synchronize user. Check console for details.'
      });
    } catch (error) {
      console.error('Error syncing user:', error);
      setResult({
        success: false,
        message: 'An error occurred during synchronization.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 2 }}>
      <Typography variant="body1">
        Having trouble accessing your account? Try synchronizing your user data:
      </Typography>
      
      <Button
        variant="contained"
        color="primary"
        disabled={isLoading}
        onClick={handleSync}
        startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {isLoading ? 'Synchronizing...' : 'Sync User Data'}
      </Button>
      
      {result && (
        <Typography 
          variant="body2" 
          color={result.success ? 'success.main' : 'error.main'}
          sx={{ mt: 2 }}
        >
          {result.message}
        </Typography>
      )}
    </Box>
  );
} 