'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
  AlertTitle,
} from '@mui/material';
import { adminClient } from '@/lib/api';
import { ErrorLogRequest } from '@/lib/api/types';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log the error to our API
    const errorLog: ErrorLogRequest = {
      type: 'ERROR',
      source: 'error-boundary',
      message: error.message,
      stack: error.stack,
      metadata: {
        componentStack: errorInfo.componentStack
      }
    };

    adminClient.createAuditLog({
      action: 'ERROR',
      resourceType: 'SYSTEM',
      resourceId: 'error-boundary',
      details: JSON.stringify(errorLog)
    }).catch(console.error);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <Box my={4}>
            <Paper elevation={3} sx={{ p: 4 }}>
              <Alert severity="error" sx={{ mb: 3 }}>
                <AlertTitle>Something went wrong</AlertTitle>
                {this.state.error && this.state.error.message}
              </Alert>
              
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <Box mt={2} mb={3}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Component Stack:
                  </Typography>
                  <pre style={{ 
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </Box>
              )}

              <Button
                variant="contained"
                color="primary"
                onClick={this.handleRetry}
                sx={{ mt: 2 }}
              >
                Try Again
              </Button>
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 