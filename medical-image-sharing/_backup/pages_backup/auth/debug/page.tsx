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
import { getSecretHashParam, generateSecretHash } from '@/lib/amplify/cognito-helper';
import { getCognitoClientSecret } from '@/lib/amplify/config';
import * as CustomAuth from '@/lib/amplify/auth';
import { useAmplify } from '@/components/AmplifyProvider';

export default function DebugPage() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('Password123!');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Access Amplify initialization status at the top level
  const { isInitialized, hasConfig, initializationError } = useAmplify();
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };
  
  const testSecretHash = () => {
    try {
      // First check if Amplify is initialized
      if (!isInitialized || !hasConfig) {
        addLog(`ERROR: Amplify is not properly initialized`);
        setError('AWS Cognito is not properly configured. Check the console for more details.');
        return;
      }
      
      addLog(`Testing SECRET_HASH generation for email: ${email}`);
      
      // Check if client secret is available
      const clientSecret = getCognitoClientSecret();
      addLog(`Client secret available: ${!!clientSecret}, length: ${clientSecret?.length || 0}`);
      
      // Generate SECRET_HASH
      const secretHashParam = getSecretHashParam(email);
      addLog(`SECRET_HASH generated: ${!!secretHashParam.SECRET_HASH}`);
      
      if (secretHashParam.SECRET_HASH) {
        addLog(`SECRET_HASH length: ${secretHashParam.SECRET_HASH.length}`);
      } else {
        addLog(`WARNING: SECRET_HASH was not generated!`);
      }
      
      setDebugResult(secretHashParam);
    } catch (error: any) {
      console.error('Error testing SECRET_HASH:', error);
      addLog(`ERROR: ${error.message}`);
      setError(error.message);
    }
  };
  
  const testSignUp = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if Amplify is initialized
      if (!isInitialized || !hasConfig) {
        addLog(`ERROR: Amplify is not properly initialized`);
        setError('AWS Cognito is not properly configured. Check the console for more details.');
        setIsLoading(false);
        return;
      }
      
      addLog(`Testing sign-up with email: ${email}`);
      
      // IMPORTANT: Skip SECRET_HASH generation to avoid 400 Bad Request error
      addLog('Skipping SECRET_HASH generation to avoid 400 Bad Request');
      
      const result = await CustomAuth.signUp(
        email,
        password,
        {
          name: 'Debug User',
          email
        },
        undefined, // No provided SECRET_HASH
        true       // Skip SECRET_HASH generation
      );
      
      addLog(`Sign-up successful!`);
      setDebugResult(result);
    } catch (error: any) {
      console.error('Sign-up error:', error);
      addLog(`ERROR: ${error.message}`);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testDirectApi = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if Amplify is initialized
      if (!isInitialized || !hasConfig) {
        addLog(`ERROR: Amplify is not properly initialized`);
        setError('AWS Cognito is not properly configured. Check the console for more details.');
        setIsLoading(false);
        return;
      }
      
      addLog(`Testing API route with email: ${email}`);
      
      // Skip SECRET_HASH generation to avoid 400 Bad Request
      addLog('Skipping SECRET_HASH generation to avoid 400 Bad Request');
      
      // Call the API route
      const response = await fetch('/api/auth/cognito/sign-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          attributes: {
            name: 'Debug User',
            email
          }
          // SECRET_HASH intentionally omitted
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        addLog(`API call successful!`);
      } else {
        addLog(`API call failed: ${data.error || 'Unknown error'}`);
      }
      
      setDebugResult(data);
    } catch (error: any) {
      console.error('API call error:', error);
      addLog(`ERROR: ${error.message}`);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testDirectSignup = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if Amplify is initialized
      if (!isInitialized || !hasConfig) {
        addLog(`ERROR: Amplify is not properly initialized`);
        setError('AWS Cognito is not properly configured. Check the console for more details.');
        setIsLoading(false);
        return;
      }
      
      addLog(`Testing direct signup with email: ${email}`);
      
      // Call AWS Cognito directly
      const { signUp } = await import('@aws-amplify/auth');
      
      // First try without SECRET_HASH
      addLog('Trying direct signup WITHOUT SECRET_HASH...');
      
      try {
        // Create options without SECRET_HASH
        const options = {
          userAttributes: {
            name: 'Debug User',
            email,
          }
        };
        
        const result = await signUp({
          username: email,
          password,
          options
        });
        
        addLog(`Direct signup WITHOUT SECRET_HASH successful!`);
        setDebugResult(result);
        return;
      } catch (error1: any) {
        addLog(`Direct signup WITHOUT SECRET_HASH failed: ${error1.message}`);
        
        // If first attempt fails, try with SECRET_HASH
        addLog('Trying direct signup WITH SECRET_HASH...');
        
        // Get the client secret and client ID
        const clientSecret = getCognitoClientSecret();
        const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
        
        addLog(`Client secret available: ${!!clientSecret}, length: ${clientSecret?.length || 0}`);
        addLog(`Client ID available: ${!!clientId}, value: ${clientId}`);
        
        if (!clientSecret || !clientId) {
          addLog(`ERROR: Missing client secret or client ID`);
          setError('Cannot proceed without client secret and client ID');
          return;
        }
        
        // Generate SECRET_HASH
        const secretHash = generateSecretHash(email, clientId, clientSecret);
        addLog(`Generated SECRET_HASH directly (length: ${secretHash.length})`);
        
        // Create options object with SECRET_HASH
        const optionsWithHash = {
          userAttributes: {
            name: 'Debug User',
            email,
          },
          SECRET_HASH: secretHash
        } as any;
        
        try {
          const result = await signUp({
            username: email,
            password,
            options: optionsWithHash
          });
          
          addLog(`Direct signup WITH SECRET_HASH successful!`);
          setDebugResult(result);
        } catch (error2: any) {
          addLog(`Direct signup WITH SECRET_HASH also failed: ${error2.message}`);
          throw new Error(`Both signup approaches failed. Latest error: ${error2.message}`);
        }
      }
    } catch (error: any) {
      console.error('Direct signup error:', error);
      addLog(`ERROR: ${error.message}`);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Log window.COGNITO_CLIENT_SECRET status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore - Access the global variable
      const hasSecret = !!window.COGNITO_CLIENT_SECRET;
      // @ts-ignore - Access the global variable
      const secretLength = window.COGNITO_CLIENT_SECRET?.length || 0;
      
      addLog(`Initial check: COGNITO_CLIENT_SECRET in window: ${hasSecret}`);
      addLog(`Initial check: COGNITO_CLIENT_SECRET length: ${secretLength}`);
      
      // Log Amplify initialization status from the hook
      addLog(`Amplify initialized: ${isInitialized ? 'Yes' : 'No'}`);
      addLog(`Amplify has valid config: ${hasConfig ? 'Yes' : 'No'}`);
      if (initializationError) {
        addLog(`Initialization error: ${initializationError}`);
      }
      
      // Check if Amplify has been initialized by examining the window object
      // @ts-ignore - Access the global Amplify config
      const hasAmplifyConfig = !!(window.aws_amplify_config);
      addLog(`Amplify configuration in window: ${hasAmplifyConfig ? 'Yes' : 'No'}`);
      
      // @ts-ignore - Check the AWS_AMPLIFY_AUTH_CONFIGURED flag
      const isAuthConfigured = window.AWS_AMPLIFY_AUTH_CONFIGURED === true;
      addLog(`Auth configured flag in window: ${isAuthConfigured ? 'Yes' : 'No'}`);
      
      // Log Cognito configuration details
      const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '';
      const userPoolName = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_NAME || 'medivault';
      const identityPoolId = process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID || '';
      const identityPoolName = process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_NAME || 'medical-imaging-identity-pool';
      
      addLog(`Cognito User Pool: ${userPoolName} (${userPoolId || 'not set'})`);
      addLog(`Cognito Identity Pool: ${identityPoolName} (${identityPoolId || 'not set'})`);
      
      // Try to get Amplify config programmatically
      try {
        import('@/lib/amplify/config').then(({ getAmplifyConfig, isAmplifyConfigured }) => {
          const config = getAmplifyConfig();
          const cognitoConfig = config.Auth?.Cognito;
          const configCheck = isAmplifyConfigured();
          
          addLog(`Retrieved Amplify config programmatically: ${!!config}`);
          addLog(`Auth config exists: ${!!config.Auth}`);
          addLog(`Cognito config exists: ${!!cognitoConfig}`);
          addLog(`isAmplifyConfigured() returns: ${configCheck}`);
          
          if (cognitoConfig) {
            addLog(`User Pool ID in config: ${cognitoConfig.userPoolId || 'not set'}`);
            addLog(`User Pool Client ID in config: ${cognitoConfig.userPoolClientId || 'not set'}`);
          }
        });
      } catch (error) {
        addLog(`Error retrieving Amplify config: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom align="center">
          Cognito Auth Debugger
        </Typography>
        
        <Typography variant="body1" paragraph>
          This page helps diagnose issues with AWS Cognito authentication, particularly with SECRET_HASH generation.
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Alert severity={isInitialized && hasConfig ? "success" : "warning"} sx={{ my: 2 }}>
            Amplify Status: {isInitialized ? "Initialized" : "Not Initialized"} | 
            Auth Config: {hasConfig ? "Valid" : "Invalid"}
            {initializationError && (
              <>
                <br />
                <strong>Error:</strong> {initializationError}
              </>
            )}
          </Alert>
          
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Parameters
              </Typography>
              
              <TextField
                fullWidth
                label="Test Email"
                variant="outlined"
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              
              <TextField
                fullWidth
                label="Test Password"
                variant="outlined"
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
              />
            </CardContent>
          </Card>
          
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Debug Tools
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Use these tools to test different aspects of the AWS Cognito authentication process.
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>1. Test SECRET_HASH Generation</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Tests if the SECRET_HASH can be generated properly using the client secret.
              </Typography>
              <Button 
                variant="outlined" 
                onClick={testSecretHash}
                disabled={isLoading}
                sx={{ mb: 2 }}
                fullWidth
              >
                Test SECRET_HASH Generation
              </Button>
              
              <Typography variant="subtitle1" gutterBottom>2. Test Sign-Up via Custom Auth Module</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Tests user registration using our custom authentication module.
              </Typography>
              <Button 
                variant="outlined" 
                onClick={testSignUp}
                disabled={isLoading}
                sx={{ mb: 2 }}
                fullWidth
              >
                Test Custom Auth Sign-Up
              </Button>
              
              <Typography variant="subtitle1" gutterBottom>3. Test API Route</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Tests the API route that handles user registration.
              </Typography>
              <Button 
                variant="outlined" 
                onClick={testDirectApi}
                disabled={isLoading}
                sx={{ mb: 2 }}
                fullWidth
              >
                Test API Route
              </Button>
              
              <Typography variant="subtitle1" gutterBottom>4. Test AWS Cognito Directly</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Bypasses our custom code and calls AWS Cognito directly with SECRET_HASH.
              </Typography>
              <Button 
                variant="contained" 
                onClick={testDirectSignup} 
                disabled={isLoading}
                color="secondary"
                sx={{ mb: 2 }}
                fullWidth
              >
                Test Direct AWS Cognito Sign-Up
              </Button>
            </CardContent>
          </Card>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Debug Result:
        </Typography>
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : debugResult ? (
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2, maxHeight: 200, overflow: 'auto' }}>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {JSON.stringify(debugResult, null, 2)}
            </pre>
          </Paper>
        ) : null}
        
        <Typography variant="h6" gutterBottom>
          Logs:
        </Typography>
        
        <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, maxHeight: 300, overflow: 'auto' }}>
          <List dense>
            {logs.map((log, index) => (
              <ListItem key={index} divider={index < logs.length - 1}>
                <ListItemText primary={log} />
              </ListItem>
            ))}
            {logs.length === 0 && (
              <ListItem>
                <ListItemText primary="No logs yet. Run a test to see logs." />
              </ListItem>
            )}
          </List>
        </Paper>
      </Paper>
    </Container>
  );
} 