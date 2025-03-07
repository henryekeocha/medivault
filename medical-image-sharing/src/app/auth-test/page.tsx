'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Divider, 
  TextField,
  Alert,
  Grid,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { toggleAuthDebug, verifyAuthState, clearAuthStorage } from '@/lib/utils/auth-debug';
import Link from 'next/link';

/**
 * Authentication Test Page
 * 
 * This page provides tools to test and verify the authentication flow,
 * including login, registration, logout, and token management.
 */
export default function AuthTestPage() {
  const { user, isAuthenticated, login, logout, register } = useAuth();
  const [debugMode, setDebugMode] = useState(false);
  const [authState, setAuthState] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('PATIENT');
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [testResults, setTestResults] = useState<{name: string, result: 'pass' | 'fail', message: string}[]>([]);

  // Toggle debug mode
  const handleToggleDebug = () => {
    const newMode = toggleAuthDebug();
    setDebugMode(newMode);
    setMessage({
      text: `Debug mode ${newMode ? 'enabled' : 'disabled'}`,
      type: 'info'
    });
  };

  // Check auth state
  const handleCheckAuth = () => {
    const state = verifyAuthState();
    setAuthState(state);
  };

  // Clear all auth data
  const handleClearAuth = () => {
    clearAuthStorage();
    setMessage({
      text: 'Auth storage cleared',
      type: 'info'
    });
    handleCheckAuth();
  };

  // Handle login test
  const handleLoginTest = async () => {
    try {
      setMessage(null);
      const success = await login(loginEmail, loginPassword);
      
      if (success) {
        setTestResults([
          ...testResults,
          {
            name: 'Login Test',
            result: 'pass',
            message: `Successfully logged in as ${loginEmail}`
          }
        ]);
        setMessage({
          text: 'Login successful!',
          type: 'success'
        });
      } else {
        setTestResults([
          ...testResults,
          {
            name: 'Login Test',
            result: 'fail',
            message: 'Login returned false'
          }
        ]);
        setMessage({
          text: 'Login failed',
          type: 'error'
        });
      }
    } catch (error: any) {
      setTestResults([
        ...testResults,
        {
          name: 'Login Test',
          result: 'fail',
          message: error.message || 'Unknown error'
        }
      ]);
      setMessage({
        text: `Login error: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  // Handle register test
  const handleRegisterTest = async () => {
    try {
      setMessage(null);
      const success = await register({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        role: registerRole as any
      });
      
      if (success) {
        setTestResults([
          ...testResults,
          {
            name: 'Registration Test',
            result: 'pass',
            message: `Successfully registered ${registerEmail}`
          }
        ]);
        setMessage({
          text: 'Registration successful!',
          type: 'success'
        });
      } else {
        setTestResults([
          ...testResults,
          {
            name: 'Registration Test',
            result: 'fail',
            message: 'Registration returned false'
          }
        ]);
        setMessage({
          text: 'Registration failed',
          type: 'error'
        });
      }
    } catch (error: any) {
      setTestResults([
        ...testResults,
        {
          name: 'Registration Test',
          result: 'fail',
          message: error.message || 'Unknown error'
        }
      ]);
      setMessage({
        text: `Registration error: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  // Handle logout test
  const handleLogoutTest = () => {
    try {
      logout();
      setTestResults([
        ...testResults,
        {
          name: 'Logout Test',
          result: 'pass',
          message: 'Logout function called'
        }
      ]);
      setMessage({
        text: 'Logout initiated',
        type: 'info'
      });
    } catch (error: any) {
      setTestResults([
        ...testResults,
        {
          name: 'Logout Test',
          result: 'fail',
          message: error.message || 'Unknown error'
        }
      ]);
      setMessage({
        text: `Logout error: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  // Update auth state when authentication changes
  useEffect(() => {
    handleCheckAuth();
  }, [isAuthenticated, user]);

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Authentication Test Page
      </Typography>
      
      <Typography color="text.secondary" paragraph>
        Use this page to test authentication flows and verify functionality.
      </Typography>
      
      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Auth Status
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 2 }}>
                Current Status: <strong>{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</strong>
              </Typography>
              
              {user && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">User Info:</Typography>
                  <Typography>Name: {user.name}</Typography>
                  <Typography>Email: {user.email}</Typography>
                  <Typography>Role: {user.role}</Typography>
                </Box>
              )}
              
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={<Switch checked={debugMode} onChange={handleToggleDebug} />}
                  label="Debug Mode"
                />
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button variant="outlined" onClick={handleCheckAuth}>
                    Check Auth State
                  </Button>
                  <Button variant="outlined" color="error" onClick={handleClearAuth}>
                    Clear Auth Storage
                  </Button>
                </Box>
                
                {authState && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="subtitle2">Auth State:</Typography>
                    <Box component="pre" sx={{ fontSize: '0.875rem', overflowX: 'auto' }}>
                      {JSON.stringify(authState, null, 2)}
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Results
              </Typography>
              
              {testResults.length === 0 ? (
                <Typography color="text.secondary">No tests run yet</Typography>
              ) : (
                <List>
                  {testResults.map((test, index) => (
                    <ListItem key={index} sx={{ bgcolor: test.result === 'pass' ? 'success.50' : 'error.50', mb: 1, borderRadius: 1 }}>
                      <ListItemText
                        primary={`${test.name}: ${test.result.toUpperCase()}`}
                        secondary={test.message}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Button 
                variant="outlined" 
                color="warning" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={() => setTestResults([])}
              >
                Clear Results
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Login Test
              </Typography>
              
              <TextField
                label="Email"
                fullWidth
                margin="normal"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              
              <TextField
                label="Password"
                type="password"
                fullWidth
                margin="normal"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              
              <Button 
                variant="contained" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={handleLoginTest}
              >
                Test Login
              </Button>
            </CardContent>
          </Card>
          
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Register Test
              </Typography>
              
              <TextField
                label="Name"
                fullWidth
                margin="normal"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
              />
              
              <TextField
                label="Email"
                fullWidth
                margin="normal"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
              />
              
              <TextField
                label="Password"
                type="password"
                fullWidth
                margin="normal"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
              />
              
              <TextField
                label="Role"
                select
                fullWidth
                margin="normal"
                value={registerRole}
                onChange={(e) => setRegisterRole(e.target.value)}
                SelectProps={{
                  native: true
                }}
              >
                <option value="PATIENT">Patient</option>
                <option value="PROVIDER">Provider</option>
                <option value="ADMIN">Admin</option>
              </TextField>
              
              <Button 
                variant="contained" 
                fullWidth 
                sx={{ mt: 2 }}
                onClick={handleRegisterTest}
              >
                Test Registration
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Logout Test
              </Typography>
              
              <Button 
                variant="contained" 
                color="error" 
                fullWidth
                onClick={handleLogoutTest}
                disabled={!isAuthenticated}
              >
                Test Logout
              </Button>
              
              {!isAuthenticated && (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  You need to be logged in to test logout
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Quick Links
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button component={Link} href="/auth/login" variant="outlined">
            Login
          </Button>
          <Button component={Link} href="/auth/register" variant="outlined">
            Register
          </Button>
          <Button component={Link} href="/dashboard" variant="outlined">
            Dashboard
          </Button>
          <Button component={Link} href="/manual-tests" variant="outlined">
            Manual Tests
          </Button>
        </Box>
      </Box>
    </Box>
  );
} 