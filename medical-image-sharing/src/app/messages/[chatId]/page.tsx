'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  IconButton,
  Avatar,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import Link from 'next/link';
import { getChatMessagesApi, getRecipientInfoApi, sendMessageApi } from '@/lib/api';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  sentAt: string;
  sender: {
    username: string;
    role: string;
  };
}

export default function ChatPage() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState<{ username: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatId) {
      loadChatMessages();
      loadRecipientInfo();
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getChatMessagesApi(chatId as string);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadRecipientInfo = async () => {
    try {
      setError(null);
      const response = await getRecipientInfoApi(chatId as string);
      setRecipient(response.data.recipient);
    } catch (error) {
      console.error('Error loading recipient info:', error);
      setError('Failed to load recipient information.');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !recipient) return;

    const tempMessage: Message = {
      id: Date.now().toString(),
      senderId: user?.id || '',
      receiverId: recipient.username,
      content: newMessage,
      sentAt: new Date().toISOString(),
      sender: {
        username: user?.name || '',
        role: user?.role || '',
      },
    };

    try {
      setSending(true);
      setError(null);
      // Optimistically add message to UI
      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage('');
      
      // Send message to server
      const response = await sendMessageApi(recipient.username, newMessage);
      
      // Update the temporary message with the real one
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === tempMessage.id ? response : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary message if sending failed
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
      setError('Failed to send message. Please try again.');
      setNewMessage(tempMessage.content); // Restore the message text
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4, height: 'calc(100vh - 100px)' }}>
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Chat Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
            <Link href="/messages" passHref>
              <IconButton edge="start" sx={{ mr: 2 }}>
                <ArrowBackIcon />
              </IconButton>
            </Link>
            {recipient && (
              <>
                <Avatar sx={{ mr: 2 }}>{recipient.username[0]}</Avatar>
                <Box>
                  <Typography variant="h6">{recipient.username}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {recipient.role}
                  </Typography>
                </Box>
              </>
            )}
          </Box>

          {/* Messages Area */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'grey.50' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : messages.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="body1" color="text.secondary">
                  No messages yet. Start the conversation!
                </Typography>
              </Box>
            ) : (
              messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.senderId === user?.id ? 'flex-end' : 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '70%',
                      bgcolor: message.senderId === user?.id ? 'primary.main' : 'white',
                      color: message.senderId === user?.id ? 'white' : 'text.primary',
                      borderRadius: 2,
                      p: 2,
                      boxShadow: 1,
                    }}
                  >
                    <Typography variant="body1">{message.content}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        color: message.senderId === user?.id ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                      }}
                    >
                      {format(new Date(message.sentAt), 'HH:mm')}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Message Input */}
          <Box
            component="form"
            onSubmit={handleSendMessage}
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              gap: 1,
            }}
          >
            <TextField
              fullWidth
              size="medium"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              variant="outlined"
              disabled={sending}
            />
            <IconButton
              type="submit"
              color="primary"
              disabled={!newMessage.trim() || sending}
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white', 
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': { bgcolor: 'grey.300' }
              }}
            >
              {sending ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
            </IconButton>
          </Box>
        </Paper>
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
} 