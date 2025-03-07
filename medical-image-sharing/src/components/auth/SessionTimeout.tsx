'use client';

import React, { useState, useEffect } from 'react';
import { useCognitoAuthContext } from '@/contexts/CognitoAuthContext';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Box
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import TimerIcon from '@mui/icons-material/Timer';

interface SessionTimeoutProps {
  // The time (in seconds) before session expiry to show the warning
  warningTime?: number;
}

/**
 * SessionTimeout Component
 * Displays a warning dialog when the user's session is about to expire
 * and gives them the option to extend their session or log out
 */
export default function SessionTimeout({ warningTime = 300 }: SessionTimeoutProps) {
  const { sessionExpiry, refreshSession, signOut } = useCognitoAuthContext();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Format the time left in MM:SS format
  const formatTimeLeft = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate the progress percentage for the linear progress bar
  const calculateProgress = (seconds: number | null): number => {
    if (seconds === null) return 0;
    // Progress should be from 0-100, 100 being full time left, 0 being no time left
    return Math.min(100, Math.max(0, (seconds / warningTime) * 100));
  };
  
  // Handle extending the session
  const handleExtendSession = async () => {
    await refreshSession();
    setShowWarning(false);
  };
  
  // Handle logging out
  const handleLogout = async () => {
    await signOut();
    setShowWarning(false);
  };
  
  // Check if we should show the warning based on the session expiry time
  useEffect(() => {
    if (sessionExpiry !== null && sessionExpiry <= warningTime && sessionExpiry > 0) {
      setTimeLeft(sessionExpiry);
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [sessionExpiry, warningTime]);
  
  // Update the time left every second when the warning is shown
  useEffect(() => {
    if (!showWarning || timeLeft === null) return;
    
    const timer = setTimeout(() => {
      if (timeLeft > 0) {
        setTimeLeft(timeLeft - 1);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [showWarning, timeLeft]);
  
  // If warning is not shown, don't render anything
  if (!showWarning) return null;
  
  return (
    <Dialog open={showWarning} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Session Timeout Warning
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Your session is about to expire due to inactivity. You will be logged out in:
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', my: 2, gap: 1 }}>
          <TimerIcon color="error" />
          <Typography variant="h4" component="span" color="error" fontWeight="bold">
            {formatTimeLeft(timeLeft)}
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={calculateProgress(timeLeft)} 
          sx={{ 
            height: 10, 
            borderRadius: 5,
            '& .MuiLinearProgress-bar': {
              backgroundColor: timeLeft && timeLeft < 60 ? 'error.main' : 'primary.main'
            }
          }} 
        />
        
        <Typography variant="body2" sx={{ mt: 2 }}>
          Would you like to extend your session or log out?
        </Typography>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleLogout} color="error" variant="outlined">
          Log Out
        </Button>
        <Button 
          onClick={handleExtendSession} 
          color="primary" 
          variant="contained" 
          autoFocus
        >
          Extend Session
        </Button>
      </DialogActions>
    </Dialog>
  );
} 