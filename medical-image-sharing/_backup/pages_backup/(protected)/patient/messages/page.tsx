'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  useMediaQuery,
  Theme,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  CircularProgress,
  Alert, 
} from '@mui/material';
import {
  Add as AddIcon,
  NavigateBefore as BackIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { ChatList } from '@/components/messages/ChatList';
import { ChatWindow } from '@/components/messages/ChatWindow';
import { useAuth } from '@/contexts/AuthContext';
import { withProtectedRoute } from '@/components/ProtectedRoute';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/Toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState'; 

// Define the Provider interface
interface Provider {
  id: string;
  name: string;
}

// Define our own ErrorState interface to match what useErrorHandler returns
interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorContext: string;
}

// Extend ApiClient with new methods
declare module '@/lib/api/client' {
  interface ApiClient {
    get<T>(url: string, config?: any): Promise<T>;
    sendMessage(recipientId: string, content: string): Promise<{ status: string }>;
  }
}

function PatientMessagesPage() {
  const { user } = useAuth();
  const { showSuccess } = useToast();
  // Create a wrapper around useErrorHandler to handle the error state properly
  const { 
    error,
    handleError: handleErrorFn, 
    withErrorHandling, 
    clearError 
  } = useErrorHandler({
    context: 'Patient Messages',
    showToastByDefault: true // Use the correct property name
  });

  // Create a proper error state object to use in the UI
  const errorState: ErrorState = {
    hasError: !!error,
    errorMessage: error || '',
    errorContext: error ? 'Patient Messages' : ''
  };

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [showChatList, setShowChatList] = useState(true);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleChatSelect = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    if (isMobile) {
      setShowChatList(false);
    }
  };

  const handleBackToList = () => {
    setShowChatList(true);
  };

  // Function to fetch providers and open compose dialog
  const fetchProvidersAndOpenDialog = async () => {
    setLoadingProviders(true);
    try {
      // Fetch providers (in a real app, this would be an API call)
      const response = await apiClient.get<{ data: Provider[] }>('/users?role=PROVIDER');
      if (!response || !response.data) {
        throw new Error('Failed to load providers');
      }
      setProviders(response.data);
      setShowComposeDialog(true);
    } finally {
      setLoadingProviders(false);
    }
  };

  // Create a wrapped function that handles errors
  const fetchProvidersWithErrorHandling = async () => {
    try {
      // Use withErrorHandling and await the Promise it returns
      await withErrorHandling(
        fetchProvidersAndOpenDialog, 
        { showToast: true } // Use the correct option format
      );
    } catch (error) {
      console.error('Error fetching providers:', error);
      // Error is already handled by withErrorHandling, we just need to catch it here
    }
  };

  // Create a proper event handler that calls the async function
  const handleOpenComposeDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    fetchProvidersWithErrorHandling();
  };

  const handleCloseComposeDialog = () => {
    setShowComposeDialog(false);
    setNewMessageText('');
    setSelectedProvider(null);
    clearError();
  };

  // Function to send a new message
  const sendNewMessage = async () => {
    if (!selectedProvider || !newMessageText.trim()) return;

    setSendingMessage(true);
    try {
      const response = await apiClient.sendMessage(selectedProvider.id, newMessageText);
      if (response.status === 'success') {
        showSuccess('Message sent successfully');
        handleCloseComposeDialog();
        // Select the chat with the provider we just messaged
        handleChatSelect(selectedProvider.id, selectedProvider.name);
      } else {
        throw new Error('Failed to send message');
      }
    } finally {
      setSendingMessage(false);
    }
  };

  // Create a wrapped function that handles errors
  const sendMessageWithErrorHandling = async () => {
    try {
      // Use withErrorHandling and await the Promise it returns
      await withErrorHandling(
        sendNewMessage, 
        { showToast: true } // Use the correct option format
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Error is already handled by withErrorHandling, we just need to catch it here
    }
  };

  // Create a proper event handler that calls the async function
  const handleSendNewMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    sendMessageWithErrorHandling();
  };

  return (
    <Container maxWidth="xl" sx={{ height: 'calc(100vh - 80px)', py: 2 }}>
      {/* Title and add button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Messages</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenComposeDialog}
        >
          New Message
        </Button>
      </Box>

      {/* Error display at page level if needed */}
      {errorState.hasError && errorState.errorContext !== 'Failed to load providers' && errorState.errorContext !== 'Failed to send message' && (
        <Alert 
          severity="error" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => clearError()}
            >
              Dismiss
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {errorState.errorMessage}
        </Alert>
      )}

      {/* Mobile view with conditional rendering */}
      {isMobile ? (
        showChatList ? (
          <Paper sx={{ height: 'calc(100% - 48px)' }}>
            <ChatList
              onChatSelect={handleChatSelect}
              selectedUserId={selectedUserId || undefined}
            />
          </Paper>
        ) : (
          <Box sx={{ height: 'calc(100% - 48px)', display: 'flex', flexDirection: 'column' }}>
            <Button
              startIcon={<BackIcon />}
              onClick={handleBackToList}
              sx={{ alignSelf: 'flex-start', mb: 1 }}
            >
              Back to conversations
            </Button>
            <Paper sx={{ flex: 1 }}>
              {selectedUserId && (
                <ChatWindow
                  recipientId={selectedUserId}
                  recipientName={selectedUserName}
                />
              )}
            </Paper>
          </Box>
        )
      ) : (
        // Desktop view with grid layout
        <Grid container spacing={2} sx={{ height: 'calc(100% - 48px)' }}>
          <Grid item xs={12} md={4} lg={3} sx={{ height: '100%' }}>
            <Paper sx={{ height: '100%' }}>
              <ChatList
                onChatSelect={handleChatSelect}
                selectedUserId={selectedUserId || undefined}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={8} lg={9} sx={{ height: '100%' }}>
            <Paper sx={{ height: '100%' }}>
              {selectedUserId ? (
                <ChatWindow
                  recipientId={selectedUserId}
                  recipientName={selectedUserName}
                />
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    p: 3,
                  }}
                >
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select a conversation or start a new one
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenComposeDialog}
                    sx={{ mt: 2 }}
                  >
                    New Message
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Mobile floating action button for new message */}
      {isMobile && showChatList && (
        <Fab
          color="primary"
          aria-label="new message"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleOpenComposeDialog}
        >
          <AddIcon />
        </Fab>
      )}

      {/* New message dialog */}
      <Dialog open={showComposeDialog} onClose={handleCloseComposeDialog} fullWidth maxWidth="sm">
        <DialogTitle>New Message</DialogTitle>
        <DialogContent>
          {errorState.hasError && errorState.errorContext === 'Failed to load providers' && (
            <Alert 
              severity="error" 
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  startIcon={<RefreshIcon />}
                  onClick={handleOpenComposeDialog}
                >
                  Retry
                </Button>
              }
              sx={{ mb: 2, mt: 1 }}
            >
              {errorState.errorMessage}
            </Alert>
          )}
          <Autocomplete
            options={providers}
            loading={loadingProviders}
            getOptionLabel={(option) => option.name}
            value={selectedProvider}
            onChange={(_, newValue) => setSelectedProvider(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Provider"
                fullWidth
                margin="normal"
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingProviders ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                error={errorState.hasError && errorState.errorContext === 'Failed to send message' && !selectedProvider}
                helperText={errorState.hasError && errorState.errorContext === 'Failed to send message' && !selectedProvider ? 'Please select a provider' : ''}
              />
            )}
          />
          <TextField
            label="Message"
            multiline
            rows={4}
            fullWidth
            margin="normal"
            variant="outlined"
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            error={errorState.hasError && errorState.errorContext === 'Failed to send message' && !newMessageText.trim()}
            helperText={errorState.hasError && errorState.errorContext === 'Failed to send message' && !newMessageText.trim() ? 'Please enter a message' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseComposeDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSendNewMessage}
            disabled={!selectedProvider || !newMessageText.trim() || sendingMessage || loadingProviders}
          >
            {sendingMessage ? <CircularProgress size={24} /> : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default withProtectedRoute(PatientMessagesPage); 