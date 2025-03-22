'use client';

import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh'; 
import { Chatbot } from '@/components/chatbot/Chatbot';
import { withProtectedRoute } from '@/components/ProtectedRoute';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState'; 

function PatientChatbotPage() {
  const { error, loading, setLoading, handleError, clearError, retry } = useErrorHandler({
    context: 'Chatbot',
    initialLoading: true
  });
  
  const [isReady, setIsReady] = useState(false);

  // Simulate loading the chatbot
  useEffect(() => {
    const loadChatbot = async () => {
      try {
        setLoading(true);
        // Simulate API call to check if chatbot is available
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsReady(true);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadChatbot();
  }, [setLoading, handleError]);
  
  const handleRetry = () => {
    clearError();
    setIsReady(false);
    
    // Simulate reloading
    const loadChatbot = async () => {
      try {
        setLoading(true);
        // Simulate API call to check if chatbot is available
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsReady(true);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadChatbot();
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Medical Assistant
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Chat with our AI assistant for quick answers to your medical questions
        </Typography>
      </Box>

      {/* Error handling */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 4 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Paper elevation={3} sx={{ p: 4, height: '400px', borderRadius: 2 }}>
          <LoadingState message="Loading chat assistant..." />
        </Paper>
      ) : (
        <Paper elevation={3} sx={{ p: 0, height: 'calc(100vh - 250px)', overflow: 'hidden', borderRadius: 2 }}>
          {isReady ? (
            <Chatbot
              floatingButton={false}
              title="Medical Assistant"
              greeting="Hello! I'm your AI medical assistant. I can help answer general medical questions, explain medical terms, or provide guidance on using our platform. How can I help you today?"
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
              <Typography variant="body1" color="text.secondary">
                Unable to load the chatbot. Please try again.
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Note: This AI assistant provides general information only and is not a substitute for professional medical advice.
          Always consult with a healthcare provider for medical concerns.
        </Typography>
      </Box>
    </Container>
  );
}

export default withProtectedRoute(PatientChatbotPage); 