'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Divider,
  CircularProgress,
  Avatar,
  Collapse,
  Button,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  ChatBubbleOutline as ChatIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { sharedClient } from '@/lib/api/sharedClient';
import { Message, ChatMessage as ApiChatMessage, ChatSession } from '@/lib/api/types';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { LoadingState } from '@/components/LoadingState'; 

interface ChatbotProps {
  floatingButton?: boolean;
  title?: string;
  greeting?: string;
}

// Extended ChatMessage with additional properties needed for UI
interface ExtendedChatMessage extends Partial<Message> {
  id: string;
  content: string;
  createdAt: Date;
  sessionId: string;
  type: 'USER' | 'BOT' | 'SYSTEM';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
}

export function Chatbot({
  floatingButton = true,
  title = 'Medical Assistant',
  greeting = 'Hello! I\'m your medical assistant. How can I help you today?',
}: ChatbotProps) {
  const { showError } = useToast();
  const [isOpen, setIsOpen] = useState(!floatingButton);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Add error handling with useErrorHandler hook
  const { 
    error, 
    loading, 
    setLoading, 
    handleError, 
    clearError,
    clearErrors, 
    withErrorHandling,
    retry 
  } = useErrorHandler();
  
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && !sessionId) {
      startChatSession();
    }
  }, [isOpen]);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const startChatSession = async () => {
    await withErrorHandling(async () => {
      setLoading(true);
      try {
        const response = await sharedClient.getChats();
        
        // Create a new session ID
        const newSessionId = `session-${Date.now()}`;
        setSessionId(newSessionId);
        
        // Add the greeting message
        setMessages([
          {
            id: 'greeting',
            type: 'BOT',
            content: greeting,
            status: 'DELIVERED',
            createdAt: new Date(),
            sessionId: newSessionId,
          },
        ]);
      } finally {
        setLoading(false);
      }
    });
  };
  
  const endChatSession = async () => {
    await withErrorHandling(async () => {
      if (!sessionId) return;
      
      try {
        // Just clear the session state since there's no direct end session method
        setSessionId(null);
        setMessages([]);
      } catch (err) {
        throw new Error('Failed to end chat session');
      }
    });
  };
  
  const handleSendMessage = async () => {
    await withErrorHandling(async () => {
      if (!message.trim() || !sessionId) return;
      
      const userMessage: ExtendedChatMessage = {
        id: `temp-${Date.now()}`,
        type: 'USER',
        content: message,
        status: 'SENT',
        createdAt: new Date(),
        sessionId,
      };
      
      // Add user message to the chat
      setMessages((prev) => [...prev, userMessage]);
      setMessage('');
      
      // Send to the server
      setSending(true);
      try {
        // Send the user message to the bot
        const botId = 'medical-assistant'; // ID for the medical assistant bot
        await sharedClient.sendMessage(botId, message);
        
        // Simulate the bot thinking
        const thinkingMessage: ExtendedChatMessage = {
          id: `thinking-${Date.now()}`,
          type: 'SYSTEM',
          content: 'Thinking...',
          status: 'SENT',
          createdAt: new Date(),
          sessionId,
        };
        
        setMessages((prev) => [...prev, thinkingMessage]);
        
        // Wait for the bot response
        const response = await sharedClient.getMessages(sessionId);
        
        // Convert API Messages to ExtendedChatMessage
        const botMessages: ExtendedChatMessage[] = response.data.map((msg: Message) => ({
          ...msg,
          type: 'BOT' as const,
          status: 'DELIVERED' as const,
          sessionId: sessionId,
        }));
        
        // Remove the thinking message and add the real bot response
        setMessages((prev) =>
          prev
            .filter((msg) => msg.id !== thinkingMessage.id)
            .concat(botMessages)
        );
      } finally {
        setSending(false);
      }
    });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };
  
  const renderMessage = (message: ExtendedChatMessage) => {
    const isBot = message.type === 'BOT';
    const isSystem = message.type === 'SYSTEM';
    const isThinking = isSystem && message.content === 'Thinking...';
    
    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          flexDirection: isBot ? 'row' : 'row-reverse',
          mb: 2,
        }}
      >
        <Avatar
          sx={{
            bgcolor: isBot ? 'primary.main' : isSystem ? 'grey.500' : 'secondary.main',
            mr: isBot ? 1 : 0,
            ml: isBot ? 0 : 1,
          }}
        >
          {isBot ? <BotIcon /> : isSystem ? <InfoIcon /> : <PersonIcon />}
        </Avatar>
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: '80%',
            borderRadius: 2,
            backgroundColor: isBot
              ? 'primary.light'
              : isSystem
              ? 'grey.100'
              : 'secondary.light',
          }}
        >
          {isThinking ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1">Thinking</Typography>
              <CircularProgress size={16} sx={{ ml: 1 }} />
            </Box>
          ) : (
            <Typography variant="body1" component="div">
              {message.content}
            </Typography>
          )}
        </Paper>
      </Box>
    );
  };
  
  return (
    <>
      {floatingButton && (
        <Tooltip title={isOpen ? 'Close chat' : 'Chat with medical assistant'}>
          <IconButton
            color="primary"
            size="large"
            onClick={toggleChat}
            sx={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              zIndex: 1000,
              boxShadow: 3,
              width: 56,
              height: 56,
            }}
          >
            {isOpen ? <CloseIcon /> : <ChatIcon />}
          </IconButton>
        </Tooltip>
      )}
      
      <Collapse
        in={isOpen}
        sx={{
          position: floatingButton ? 'fixed' : 'static',
          bottom: floatingButton ? 90 : 'auto',
          right: floatingButton ? 20 : 'auto',
          width: floatingButton ? 350 : '100%',
          height: floatingButton ? 450 : '100%',
          zIndex: 1000,
          borderRadius: floatingButton ? 2 : 0,
          overflow: 'hidden',
          boxShadow: floatingButton ? 3 : 0,
        }}
      >
        <Paper
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              p: 2,
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BotIcon sx={{ mr: 1 }} />
              <Typography variant="h6">{title}</Typography>
            </Box>
            {!floatingButton && (
              <IconButton size="small" onClick={toggleChat} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
          
          {error && (
            <Alert 
              severity="error" 
              sx={{ m: 2, mb: 0 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    clearError();
                    startChatSession();
                  }}
                >
                  Retry
                </Button>
              }
            >
              {error || 'An error occurred with the chat. Please try again.'}
            </Alert>
          )}
          
          <Box
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              p: 2,
              backgroundColor: 'background.default',
            }}
          >
            {loading ? (
              <LoadingState />
            ) : (
              <>
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </>
            )}
          </Box>
          
          <Divider />
          
          <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
            <TextField
              fullWidth
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading || sending || !sessionId || !!error}
              InputProps={{
                endAdornment: (
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!message.trim() || loading || sending || !sessionId || !!error}
                  >
                    {sending ? <CircularProgress size={24} /> : <SendIcon />}
                  </IconButton>
                ),
              }}
            />
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mt: 1,
              }}
            >
              <Button
                size="small"
                onClick={endChatSession}
                disabled={loading || !sessionId || !!error}
              >
                End Chat
              </Button>
            </Box>
          </Box>
        </Paper>
      </Collapse>
    </>
  );
} 