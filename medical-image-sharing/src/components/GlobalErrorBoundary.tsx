'use client';

import React, { Component, ErrorInfo } from 'react';
import { Box, Button, Container, Typography, Paper, Alert } from '@mui/material';
import { adminClient } from '@/lib/api';
import { ErrorLogRequest } from '@/lib/api/types';
import { useToast, ToastContext } from '@/contexts/ToastContext';

interface Props {
  children: React.ReactNode;
  toast?: ReturnType<typeof useToast>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
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
      source: 'global-error-boundary',
      message: error.message,
      stack: error.stack,
      metadata: {
        componentStack: errorInfo.componentStack,
        isGlobal: true
      }
    };

    adminClient.createAuditLog({
      action: 'ERROR',
      resourceType: 'SYSTEM',
      resourceId: 'global-error-boundary',
      details: JSON.stringify(errorLog)
    }).catch(console.error);

    // Show error toast if available
    if (this.props.toast) {
      this.props.toast.showError('An unexpected error occurred. Please try again later.');
    }
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
                <Typography variant="h6" gutterBottom>
                  Oops! Something went wrong
                </Typography>
                <Typography>
                  We apologize for the inconvenience. The error has been logged and our team will look into it.
                </Typography>
              </Alert>

              {process.env.NODE_ENV === 'development' && (
                <>
                  <Box mt={3}>
                    <Typography variant="subtitle2" color="error">
                      Error: {this.state.error?.message}
                    </Typography>
                    {this.state.errorInfo && (
                      <Box mt={2}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Component Stack:
                        </Typography>
                        <pre style={{ 
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word',
                          backgroundColor: '#f5f5f5',
                          padding: '1rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}>
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </Box>
                    )}
                  </Box>
                </>
              )}

              <Box mt={3} display="flex" gap={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={this.handleRetry}
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </Box>
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;

// HOC to wrap components with error boundary and toast
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithErrorBoundaryWrapper(props: P) {
    const toast = useToast();
    return (
      <GlobalErrorBoundary toast={toast}>
        <WrappedComponent {...props} />
      </GlobalErrorBoundary>
    );
  };
} 