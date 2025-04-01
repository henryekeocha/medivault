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
import { useUser } from '@clerk/nextjs';
import { withProtectedRoute } from '@/components/ProtectedRoute';
import { patientClient } from '@/lib/api/patientClient';
import { sharedClient } from '@/lib/api/sharedClient';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState';
import { User } from '@/lib/api/types';

interface Provider extends User {
  specialty?: string;
  hospital?: string;
}

function PatientMessagesPage() {
  const { user, isLoaded } = useUser();
  const { showSuccess } = useToast();
  const { 
    error,
    handleError: handleErrorFn, 
    withErrorHandling, 
    clearError 
  } = useErrorHandler({
    context: 'Patient Messages',
    showToastByDefault: true
  });

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
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
      const response = await patientClient.getProviders();
      if (response.status !== 'success' || !response.data) {
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
      await withErrorHandling(
        fetchProvidersAndOpenDialog, 
        { showToast: true }
      );
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

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
      const response = await sharedClient.sendMessage(selectedProvider.id, newMessageText);
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
      await withErrorHandling(
        sendNewMessage, 
        { showToast: true }
      );
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendNewMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    sendMessageWithErrorHandling();
  };

  if (!isLoaded) {
    return null;
  }

  if (!user) {
    return null;
  }

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
      {error && error !== 'Failed to load providers' && error !== 'Failed to send message' && (
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
          {error}
        </Alert>
      )}

      {/* Mobile view with conditional rendering */}
      {isMobile ? (
        showChatList ? (
          <Paper sx={{ height: 'calc(100% - 48px)' }}>
            <ChatList
              onSelectChat={handleChatSelect}
              selectedChatId={selectedUserId}
              type="patient"
            />
          </Paper>
        ) : (
          <Box sx={{ height: '100%' }}>
            <Button
              startIcon={<BackIcon />}
              onClick={handleBackToList}
              sx={{ mb: 2 }}
            >
              Back to Messages
            </Button>
            <Paper sx={{ height: 'calc(100% - 48px)' }}>
              <ChatWindow
                recipientId={selectedUserId || ''}
                recipientName={selectedUserName}
              />
            </Paper>
          </Box>
        )
      ) : (
        // Desktop view with grid layout
        <Grid container spacing={2} sx={{ height: 'calc(100% - 48px)' }}>
          <Grid item xs={4}>
            <Paper sx={{ height: '100%' }}>
              <ChatList
                onSelectChat={handleChatSelect}
                selectedChatId={selectedUserId}
                type="patient"
              />
            </Paper>
          </Grid>
          <Grid item xs={8}>
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
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography color="text.secondary">
                    Select a conversation to start messaging
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Compose Dialog */}
      <Dialog
        open={showComposeDialog}
        onClose={handleCloseComposeDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>New Message</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Autocomplete
              options={providers}
              getOptionLabel={(option) => option.name}
              value={selectedProvider}
              onChange={(_, newValue) => setSelectedProvider(newValue)}
              loading={loadingProviders}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Provider"
                  error={!!error && error === 'Failed to load providers'}
                  helperText={error === 'Failed to load providers' ? error : ''}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingProviders ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Message"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseComposeDialog}>Cancel</Button>
          <Button
            onClick={handleSendNewMessage}
            variant="contained"
            disabled={!selectedProvider || !newMessageText.trim() || sendingMessage}
          >
            {sendingMessage ? <CircularProgress size={24} /> : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default withProtectedRoute(PatientMessagesPage); 