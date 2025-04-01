'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button, 
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import { useAuth, useUser } from '@clerk/nextjs';

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get auth data from Clerk
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };
  
  const testAuth = () => {
    try {
      addLog(`Testing Clerk auth...`);
      addLog(`Auth loaded: ${isLoaded}`);
      addLog(`User signed in: ${isSignedIn}`);
      
      if (user) {
        addLog(`User email: ${user.primaryEmailAddress?.emailAddress}`);
        addLog(`User name: ${user.fullName}`);
        addLog(`User ID: ${user.id}`);
      }
      
      setDebugResult({
        isLoaded,
        isSignedIn,
        user: user ? {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
          imageUrl: user.imageUrl,
        } : null
      });
    } catch (error: any) {
      console.error('Error testing auth:', error);
      addLog(`ERROR: ${error.message}`);
      setError(error.message);
    }
  };
  
  const testSignOut = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      addLog(`Testing sign-out...`);
      
      await signOut();
      
      addLog(`Sign-out successful!`);
      setDebugResult({ success: true });
    } catch (error: any) {
      console.error('Sign-out error:', error);
      addLog(`ERROR: ${error.message}`);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testAPIRoute = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      addLog(`Testing API auth route...`);
      
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      addLog(`API call successful!`);
      setDebugResult(data);
    } catch (error: any) {
      console.error('API call error:', error);
      addLog(`ERROR: ${error.message}`);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Log initial auth information on component mount
  useEffect(() => {
    addLog(`Initial auth loaded: ${isLoaded}`);
    if (isLoaded && isSignedIn && user) {
      addLog(`Logged in as: ${user.primaryEmailAddress?.emailAddress}`);
    }
  }, [isLoaded, isSignedIn, user]);
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Clerk Authentication Debug Page
      </Typography>
      
      <Typography variant="body1" paragraph>
        This page helps diagnose issues with Clerk authentication and user session management.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Card sx={{ width: '100%', mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Current Auth Status: <strong>{isLoaded ? 'Loaded' : 'Loading'}</strong>
            </Typography>
            {user && (
              <Box>
                <Typography variant="body1">
                  User: {user.fullName} ({user.primaryEmailAddress?.emailAddress})
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
        
        <Paper sx={{ p: 3, width: '100%', mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            1. Test Authentication
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              onClick={testAuth}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Test Auth'}
            </Button>
            
            <Button 
              variant="outlined" 
              onClick={testSignOut}
              disabled={isLoading}
            >
              Test Sign Out
            </Button>
            
            <Button 
              variant="outlined" 
              onClick={testAPIRoute}
              disabled={isLoading}
            >
              Test API Auth Route
            </Button>
          </Box>
        </Paper>
        
        <Paper sx={{ p: 3, width: '100%', mb: 3 }}>
          <Typography variant="h6" gutterBottom>Debug Results</Typography>
          <Box sx={{ 
            p: 2, 
            bgcolor: 'background.paper', 
            borderRadius: 1,
            maxHeight: '200px',
            overflow: 'auto' 
          }}>
            <Typography component="pre" variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {debugResult ? JSON.stringify(debugResult, null, 2) : 'No results yet'}
            </Typography>
          </Box>
        </Paper>
        
        <Paper sx={{ p: 3, width: '100%' }}>
          <Typography variant="h6" gutterBottom>Debug Logs</Typography>
          <List sx={{ 
            bgcolor: 'background.paper', 
            borderRadius: 1,
            maxHeight: '300px',
            overflow: 'auto' 
          }}>
            {logs.length === 0 ? (
              <ListItem>
                <ListItemText primary="No logs yet" />
              </ListItem>
            ) : (
              logs.map((log, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText 
                      primary={log} 
                      primaryTypographyProps={{ 
                        component: 'div',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                      }} 
                    />
                  </ListItem>
                  {index < logs.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </List>
        </Paper>
      </Box>
    </Container>
  );
} 