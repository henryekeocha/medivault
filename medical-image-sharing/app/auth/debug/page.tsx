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
import { signIn, signOut, useSession } from 'next-auth/react';

export default function DebugPage() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('Password123!');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get session data from NextAuth
  const { data: session, status } = useSession();
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };
  
  const testSession = () => {
    try {
      addLog(`Testing NextAuth session...`);
      addLog(`Session status: ${status}`);
      addLog(`User logged in: ${!!session}`);
      
      if (session) {
        addLog(`User email: ${session.user?.email}`);
        addLog(`User name: ${session.user?.name}`);
      }
      
      setDebugResult(session);
    } catch (error: any) {
      console.error('Error testing session:', error);
      addLog(`ERROR: ${error.message}`);
      setError(error.message);
    }
  };
  
  const testSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      addLog(`Testing sign-in with email: ${email}`);
      
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password
      });
      
      if (result?.error) {
        addLog(`Sign-in failed: ${result.error}`);
        setError(result.error);
      } else {
        addLog(`Sign-in successful!`);
      }
      
      setDebugResult(result);
    } catch (error: any) {
      console.error('Sign-in error:', error);
      addLog(`ERROR: ${error.message}`);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testSignOut = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      addLog(`Testing sign-out...`);
      
      await signOut({ redirect: false });
      
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
      
      const response = await fetch('/api/auth/session');
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
  
  // Log initial session information on component mount
  useEffect(() => {
    addLog(`Initial session status: ${status}`);
    if (status === 'authenticated' && session) {
      addLog(`Logged in as: ${session.user?.email}`);
    }
  }, [session, status]);
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        NextAuth.js Debugging Page
      </Typography>
      
      <Typography variant="body1" paragraph>
        This page helps diagnose issues with NextAuth.js authentication and session management.
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
              Current Session Status: <strong>{status}</strong>
            </Typography>
            {session && (
              <Box>
                <Typography variant="body1">
                  User: {session.user?.name} ({session.user?.email})
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
        
        <Paper sx={{ p: 3, width: '100%', mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            1. Test Credentials
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
            <TextField 
              label="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField 
              label="Password" 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              onClick={testSignIn}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Test Sign In'}
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
              onClick={testSession}
              disabled={isLoading}
            >
              Check Session
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