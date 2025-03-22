'use client';

import React, { useState } from 'react';
import { Box, Container, Paper, Typography, CircularProgress } from '@mui/material';
import { ChatList } from '@/components/messages/ChatList';
import { ChatWindow } from '@/components/messages/ChatWindow';
import { withProtectedRoute } from '@/components/ProtectedRoute';
import { api } from '@/lib/api/api';
import { useToast } from '@/contexts/ToastContext';

// Define interface for chat session response
interface ChatSessionResponse {
  id: string;
  recipientId: string;
  senderId: string;
  createdAt: string;
  updatedAt: string;
}

function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState<{
    id: string;
    recipientId: string;
    recipientName: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleSelectChat = async (userId: string, userName: string) => {
    try {
      setIsLoading(true);
      
      // Get chat session with the user, or create one if it doesn't exist
      const response = await api.get<ChatSessionResponse>(`/api/chats/sessions/${userId}`);
      
      if (response && response.id) {
        setSelectedChat({
          id: response.id, // Use the actual chat session ID
          recipientId: userId,
          recipientName: userName,
        });
      } else {
        // If no chat session exists, create one
        const newSession = await api.post<ChatSessionResponse>('/api/chats/sessions', {
          recipientId: userId
        });
        
        setSelectedChat({
          id: newSession.id,
          recipientId: userId,
          recipientName: userName,
        });
      }
    } catch (error) {
      console.error('Error fetching chat details:', error);
      toast.showError('Failed to load chat session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, height: 'calc(100vh - 64px)' }}>
      <Paper
        sx={{
          height: '100%',
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          overflow: 'hidden',
        }}
      >
        <ChatList
          selectedChatId={selectedChat?.id || undefined}
          onSelectChat={handleSelectChat}
        />
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              backgroundColor: 'background.default',
            }}
          >
            <CircularProgress size={40} />
          </Box>
        ) : selectedChat ? (
          <ChatWindow
            recipientId={selectedChat.recipientId}
            recipientName={selectedChat.recipientName}
            onMessageRead={() => {
              // Optionally refresh the chat list to update unread counts
              // You could implement this if needed
            }}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              backgroundColor: 'background.default',
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Select a conversation to start messaging
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default withProtectedRoute(MessagesPage, {
  allowedRoles: ['PATIENT', 'PROVIDER', 'ADMIN'],
  requireAuth: true,
}); 